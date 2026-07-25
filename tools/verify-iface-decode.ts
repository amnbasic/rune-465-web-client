// Headless verification of the 465 interface (if3) decode fix.
//   bun run tools/verify-iface-decode.ts
//
// Pulls real interface groups (137 chatbox, 548 game frame) straight from the running
// server's JS5 cache and decodes each component header two ways:
//   OLD = rev-500 layout (4 phantom widthAlignment/heightAlignment/xAlignment/yAlignment bytes)
//   NEW = 465 layout (no alignment bytes)  <-- the fix
// and reports the resulting parentId/layerId. The rev-500 layout desyncs the stream so
// layerId reads garbage (a component can become its own parent -> computeLayerLayout recurses
// forever -> the 98% browser freeze). The 465 layout should give -1 or a small in-group index.
// Also confirms window 548 carries a clientCode-1337 component (the 3D viewport).
import net from 'node:net';
import zlib from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const VERSION = 464;

let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
const killer = setTimeout(() => {
    console.log('[verify] TIMEOUT — no/incomplete server response');
    process.exit(2);
}, 15000);
sock.on('error', e => {
    console.log('[verify] socket error:', (e as Error).message);
    process.exit(3);
});
sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        const r = resolveIdle;
        resolveIdle = null;
        if (r) r();
    }, 250);
});
function waitIdle(): Promise<void> {
    return new Promise(res => {
        resolveIdle = res;
    });
}
// Strip the 0xFF block separator inserted at every 512th wire byte.
function deblock(wire: Buffer): Buffer {
    const out: number[] = [];
    for (let i = 0; i < wire.length; i++) {
        if (i > 0 && i % 512 === 0) continue;
        out.push(wire[i]);
    }
    return Buffer.from(out);
}
async function fetchContainer(cacheId: number, fileId: number): Promise<Buffer> {
    buf = Buffer.alloc(0);
    sock.write(Buffer.from([1, cacheId & 0xff, (fileId >> 8) & 0xff, fileId & 0xff]));
    await waitIdle();
    return deblock(buf).subarray(3); // strip [cacheId][u16 fileId]
}
function decompress(container: Buffer): Buffer {
    const compType = container[0];
    const compLen = container.readUInt32BE(1);
    if (compType === 0) return container.subarray(5, 5 + compLen);
    const uncompLen = container.readUInt32BE(5);
    const payload = container.subarray(9, 9 + compLen);
    if (compType === 2) return zlib.gunzipSync(payload);
    throw new Error(`compType ${compType} (bzip2?) not supported headlessly; uncompLen=${uncompLen}`);
}
// Standard JS5 multi-file group split (delta-encoded chunk sizes, chunk-major storage).
function splitGroup(data: Buffer, numFiles: number): Buffer[] {
    if (numFiles === 1) return [data];
    const numChunks = data[data.length - 1] & 0xff;
    const chunkSizes: number[][] = Array.from({ length: numChunks }, () => new Array(numFiles).fill(0));
    let p = data.length - 1 - numChunks * numFiles * 4;
    for (let c = 0; c < numChunks; c++) {
        let size = 0;
        for (let f = 0; f < numFiles; f++) {
            size += data.readInt32BE(p);
            p += 4;
            chunkSizes[c][f] = size;
        }
    }
    const files: Buffer[] = new Array(numFiles).fill(null).map(() => Buffer.alloc(0));
    let off = 0;
    for (let c = 0; c < numChunks; c++) {
        for (let f = 0; f < numFiles; f++) {
            files[f] = Buffer.concat([files[f], data.subarray(off, off + chunkSizes[c][f])]);
            off += chunkSizes[c][f];
        }
    }
    return files;
}
// Minimal decodeIndex: returns fileIdLimit per group (all we need to split groups).
function decodeIndex(container: Buffer): number[] {
    const d = decompress(container);
    let pos = 0;
    const g1 = () => d[pos++] & 0xff;
    const g2 = () => ((d[pos++] & 0xff) << 8) | (d[pos++] & 0xff);
    const g4 = () => {
        const v = d.readInt32BE(pos);
        pos += 4;
        return v;
    };
    const proto = g1();
    if (proto >= 6) g4(); // version
    const flags = g1();
    const size = g2();
    const groupIds: number[] = [];
    let acc = 0;
    let maxGroup = -1;
    for (let i = 0; i < size; i++) {
        acc += g2();
        groupIds.push(acc);
        if (acc > maxGroup) maxGroup = acc;
    }
    if (flags & 1) for (let i = 0; i < size; i++) g4(); // name hashes
    for (let i = 0; i < size; i++) g4(); // checksums
    for (let i = 0; i < size; i++) g4(); // versions
    const groupSizes: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) groupSizes[groupIds[i]] = g2();
    const fileIdLimit: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) {
        const gid = groupIds[i];
        const nFiles = groupSizes[gid];
        let facc = 0;
        let fmax = -1;
        for (let f = 0; f < nFiles; f++) {
            facc += g2();
            if (facc > fmax) fmax = facc;
        }
        fileIdLimit[gid] = fmax + 1;
    }
    return fileIdLimit;
}
// Decode a component header. mode 'old' includes the 4 rev-500 alignment bytes; 'new' omits them.
function decodeHeader(comp: Buffer, mode: 'old' | 'new'): { if3: boolean; type: number; clientCode: number; layerId: number } {
    let pos = 0;
    const g1 = () => comp[pos++] & 0xff;
    const g1s = () => {
        const v = comp[pos++] & 0xff;
        return v > 127 ? v - 256 : v;
    };
    const g2 = () => ((comp[pos++] & 0xff) << 8) | (comp[pos++] & 0xff);
    const g2s = () => {
        const v = g2();
        return v > 32767 ? v - 65536 : v;
    };
    const first = (comp[0] << 24) >> 24;
    if (first !== -1) return { if3: false, type: -1, clientCode: -1, layerId: -1 }; // if1
    pos = 1; // skip 0xFF sentinel
    const type = g1();
    const clientCode = g2();
    g2s(); // x
    g2s(); // y
    g2(); // width
    g2(); // height
    if (mode === 'old') {
        g1s();
        g1s();
        g1s();
        g1s(); // 4 phantom alignment bytes
    }
    const layerId = g2();
    return { if3: true, type, clientCode, layerId };
}

async function analyzeGroup(fileIdLimit: number[], group: number, label: string): Promise<void> {
    const nFiles = fileIdLimit[group] ?? 0;
    if (nFiles === 0) {
        console.log(`\n[${label}] group ${group}: NOT in ref table (fileIdLimit=0)`);
        return;
    }
    const comps = splitGroup(decompress(await fetchContainer(3, group)), nFiles);
    let if3Count = 0;
    let sane = 0;
    let garbage = 0;
    let has1337 = false;
    const bad: string[] = [];
    for (let f = 0; f < comps.length; f++) {
        if (comps[f].length === 0) continue;
        const nw = decodeHeader(comps[f], 'new');
        if (!nw.if3) continue;
        if3Count++;
        if (nw.clientCode === 1337) has1337 = true;
        // sane layerId = 65535 (top-level) or a small in-group index (< nFiles + slack)
        const saneLayer = nw.layerId === 65535 || nw.layerId < nFiles + 8;
        if (saneLayer) sane++;
        else {
            garbage++;
            if (bad.length < 4) {
                const old = decodeHeader(comps[f], 'old');
                bad.push(`  comp ${f}: NEW layerId=${nw.layerId} (type ${nw.type})  vs OLD layerId=${old.layerId}`);
            }
        }
    }
    console.log(`\n[${label}] group ${group}: ${comps.length} files, ${if3Count} if3 components`);
    console.log(`   NEW (465 fix): ${sane} sane layerId, ${garbage} garbage`);
    if (bad.length) console.log(bad.join('\n'));
    // Contrast: how many are garbage under the OLD rev-500 layout?
    let oldGarbage = 0;
    for (let f = 0; f < comps.length; f++) {
        if (comps[f].length === 0) continue;
        const o = decodeHeader(comps[f], 'old');
        if (!o.if3) continue;
        const saneLayer = o.layerId === 65535 || o.layerId < nFiles + 8;
        if (!saneLayer) oldGarbage++;
    }
    console.log(`   OLD (rev-500):  ${oldGarbage} garbage layerId (these would corrupt the layer tree)`);
    if (group === 548) console.log(`   window 548 has clientCode-1337 (3D viewport) component: ${has1337 ? 'YES ✓' : 'no'}`);
}

sock.on('connect', async () => {
    const hs = Buffer.alloc(5);
    hs[0] = 15;
    hs.writeInt32BE(VERSION, 1);
    sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) {
        console.log(`[verify] handshake rejected (byte ${buf[0]})`);
        process.exit(1);
    }
    buf = buf.subarray(1);
    console.log('[verify] JS5 handshake OK; fetching interface ref-table (255:3)...');
    const fileIdLimit = decodeIndex(await fetchContainer(255, 3));
    console.log(`[verify] ref-table decoded: ${fileIdLimit.length} groups; 137 has ${fileIdLimit[137]} files, 548 has ${fileIdLimit[548]} files`);
    await analyzeGroup(fileIdLimit, 137, 'chatbox');
    await analyzeGroup(fileIdLimit, 548, 'game frame');
    clearTimeout(killer);
    sock.end();
    process.exit(0);
});
