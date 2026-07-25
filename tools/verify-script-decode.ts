// Headless verification of the 465 CS2 clientscript decode fix.
//   bun run tools/verify-script-decode.ts
//
// Pulls real scripts (archive 12) from the running server and decodes the tail header
// two ways: OLD = rev-500 (read a trailer size from the last 2 bytes, then offset), NEW =
// 465 (header is the fixed last 12 bytes). Reports intLocalCount — OLD gives garbage-huge
// (the new Int32Array(that) crash), NEW should be small & sane (0..~50).
import net from 'node:net';
import zlib from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const VERSION = 464;
const SCRIPTS_ARCHIVE = 12;

let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
const killer = setTimeout(() => {
    console.log('[verify] TIMEOUT');
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
    return deblock(buf).subarray(3);
}
function decompress(container: Buffer): Buffer {
    const compType = container[0];
    const compLen = container.readUInt32BE(1);
    if (compType === 0) return container.subarray(5, 5 + compLen);
    const payload = container.subarray(9, 9 + compLen);
    if (compType === 2) return zlib.gunzipSync(payload);
    throw new Error(`compType ${compType} unsupported`);
}
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
    if (proto >= 6) g4();
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
    if (flags & 1) for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    const groupSizes: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) groupSizes[groupIds[i]] = g2();
    const fileIdLimit: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) {
        const gid = groupIds[i];
        let facc = 0;
        let fmax = -1;
        for (let f = 0; f < groupSizes[gid]; f++) {
            facc += g2();
            if (facc > fmax) fmax = facc;
        }
        fileIdLimit[gid] = fmax + 1;
    }
    return groupIds.map(g => g); // return present group ids
}

function headerLocalCounts(script: Buffer, mode: 'old' | 'new'): { instr: number; intLocal: number; strLocal: number } {
    let pos: number;
    const g2 = (p: number) => ((script[p] & 0xff) << 8) | (script[p + 1] & 0xff);
    const g4 = (p: number) => script.readInt32BE(p);
    if (mode === 'new') {
        pos = script.length - 12;
    } else {
        const trailerSize = g2(script.length - 2);
        pos = script.length - trailerSize - 2 - 12;
    }
    if (pos < 0 || pos + 12 > script.length) return { instr: -1, intLocal: -1, strLocal: -1 };
    return { instr: g4(pos), intLocal: g2(pos + 4), strLocal: g2(pos + 6) };
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
    console.log('[verify] JS5 handshake OK; fetching scripts ref-table (255:12)...');
    const groupIds = decodeIndex(await fetchContainer(255, SCRIPTS_ARCHIVE));
    console.log(`[verify] ${groupIds.length} scripts in archive 12. Sampling 12 (incl. the ones that crashed: 21, 31):`);
    const sample = Array.from(new Set([21, 31, ...groupIds.slice(0, 10)])).filter(g => groupIds.includes(g));
    let newSane = 0;
    let oldBad = 0;
    for (const g of sample) {
        const script = decompress(await fetchContainer(SCRIPTS_ARCHIVE, g));
        const nw = headerLocalCounts(script, 'new');
        const old = headerLocalCounts(script, 'old');
        const sane = nw.intLocal >= 0 && nw.intLocal < 200 && nw.strLocal >= 0 && nw.strLocal < 200 && nw.instr > 0 && nw.instr < 100000;
        const oldSane = old.intLocal >= 0 && old.intLocal < 200 && old.strLocal >= 0 && old.strLocal < 200;
        if (sane) newSane++;
        if (!oldSane) oldBad++;
        console.log(
            `  script ${String(g).padStart(4)}: NEW intLocal=${nw.intLocal} strLocal=${nw.strLocal} instr=${nw.instr} ${sane ? '✓' : '✗'}` +
                `   |  OLD intLocal=${old.intLocal} strLocal=${old.strLocal} ${oldSane ? '' : '(GARBAGE -> crash)'}`
        );
    }
    console.log(`\n[verify] NEW decode: ${newSane}/${sample.length} sane   |   OLD decode: ${oldBad}/${sample.length} garbage`);
    clearTimeout(killer);
    sock.end();
    process.exit(0);
});
