// Headless verification of the NPC (served-as-LocType) decode fix.
//   bun run tools/verify-npc-decode.ts
//
// The 464 server serves NPC entities as LocType binary at config group 7 (op5=models, op2=name,
// op14=size, op24=idle, op28=turnspeed, op40=recol, op65/66=scale, op68=combat, op79=head,
// op80=walkanims). Decodes real NPCs the NEW (LocType) way and checks model ids + size are sane.
import net from 'node:net';
import zlib from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const VERSION = 464;
const CONFIG_ARCHIVE = 2;
const NPC_GROUP = 7;

let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
const killer = setTimeout(() => { console.log('[verify] TIMEOUT'); process.exit(2); }, 15000);
sock.on('error', e => { console.log('[verify] socket error:', (e as Error).message); process.exit(3); });
sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { const r = resolveIdle; resolveIdle = null; if (r) r(); }, 250);
});
function waitIdle(): Promise<void> { return new Promise(res => { resolveIdle = res; }); }
function deblock(wire: Buffer): Buffer {
    const out: number[] = [];
    for (let i = 0; i < wire.length; i++) { if (i > 0 && i % 512 === 0) continue; out.push(wire[i]); }
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
function splitGroup(data: Buffer, numFiles: number): Buffer[] {
    if (numFiles === 1) return [data];
    const numChunks = data[data.length - 1] & 0xff;
    const chunkSizes: number[][] = Array.from({ length: numChunks }, () => new Array(numFiles).fill(0));
    let p = data.length - 1 - numChunks * numFiles * 4;
    for (let c = 0; c < numChunks; c++) {
        let size = 0;
        for (let f = 0; f < numFiles; f++) { size += data.readInt32BE(p); p += 4; chunkSizes[c][f] = size; }
    }
    const files: Buffer[] = new Array(numFiles).fill(null).map(() => Buffer.alloc(0));
    let off = 0;
    for (let c = 0; c < numChunks; c++) for (let f = 0; f < numFiles; f++) { files[f] = Buffer.concat([files[f], data.subarray(off, off + chunkSizes[c][f])]); off += chunkSizes[c][f]; }
    return files;
}
function fileIdLimitFor(container: Buffer, wantGroup: number): number {
    const d = decompress(container);
    let pos = 0;
    const g1 = () => d[pos++] & 0xff;
    const g2 = () => ((d[pos++] & 0xff) << 8) | (d[pos++] & 0xff);
    const g4 = () => { const v = d.readInt32BE(pos); pos += 4; return v; };
    const proto = g1(); if (proto >= 6) g4();
    const flags = g1(); const size = g2();
    const groupIds: number[] = []; let acc = 0; let maxGroup = -1;
    for (let i = 0; i < size; i++) { acc += g2(); groupIds.push(acc); if (acc > maxGroup) maxGroup = acc; }
    if (flags & 1) for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    const groupSizes: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) groupSizes[groupIds[i]] = g2();
    const fileIdLimit: number[] = new Array(maxGroup + 1).fill(0);
    for (let i = 0; i < size; i++) {
        const gid = groupIds[i]; let facc = 0; let fmax = -1;
        for (let f = 0; f < groupSizes[gid]; f++) { facc += g2(); if (facc > fmax) fmax = facc; }
        fileIdLimit[gid] = fmax + 1;
    }
    return fileIdLimit[wantGroup] ?? 0;
}
// Decode an NPC-as-LocType. Handles exactly the opcodes the server writes (mirrors the client fix).
function decodeNpc(d: Buffer): { name: string; models: number[]; size: number; idle: number } | null {
    let pos = 0; let name = ''; let models: number[] = []; let size = 1; let idle = -1;
    const g1 = () => d[pos++] & 0xff;
    const g2 = () => ((d[pos++] & 0xff) << 8) | (d[pos++] & 0xff);
    const str = () => { let s = ''; while (d[pos] !== 0) s += String.fromCharCode(d[pos++]); pos++; return s; };
    try {
        while (pos < d.length) {
            const code = g1(); if (code === 0) break;
            if (code === 5) { const n = g1(); for (let i = 0; i < n; i++) models.push(g2()); }
            else if (code === 2) name = str();
            else if (code === 14) size = g1();
            else if (code === 24) { idle = g2(); if (idle === 65535) idle = -1; }
            else if (code === 28) pos += 1;
            else if (code === 29) pos += 1;
            else if (code >= 30 && code < 35) str();
            else if (code === 40) { const n = g1(); pos += n * 4; }
            else if (code === 64 || code === 73) { /* no data */ }
            else if (code === 65 || code === 66 || code === 68) pos += 2;
            else if (code === 79) { pos += 2 + 2 + 1; const n = g1(); pos += n * 2; }
            else if (code === 80) pos += 12;
            else return null; // unexpected opcode -> mis-decode
        }
    } catch { return null; }
    return { name, models, size, idle };
}

sock.on('connect', async () => {
    const hs = Buffer.alloc(5); hs[0] = 15; hs.writeInt32BE(VERSION, 1); sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) { console.log(`[verify] handshake rejected (${buf[0]})`); process.exit(1); }
    buf = buf.subarray(1);
    console.log('[verify] JS5 OK; fetching config ref-table (255:2)...');
    const nFiles = fileIdLimitFor(await fetchContainer(255, CONFIG_ARCHIVE), NPC_GROUP);
    console.log(`[verify] config group 7 (NPCs-as-LocType) has ${nFiles} entries. Decoding a sample:`);
    const files = splitGroup(decompress(await fetchContainer(CONFIG_ARCHIVE, NPC_GROUP)), nFiles);
    let ok = 0; let shown = 0;
    for (let f = 0; f < files.length && shown < 14; f++) {
        if (files[f].length === 0) continue;
        const dec = decodeNpc(files[f]);
        if (dec === null) { console.log(`  npc ${f}: DECODE FAILED (unexpected opcode / overrun)`); shown++; continue; }
        if (dec.models.length === 0) continue; // skip empty defs
        shown++;
        const sane = dec.models.every(m => m >= 0 && m < 100000) && dec.size >= 1 && dec.size < 16;
        if (sane) ok++;
        console.log(`  npc ${String(f).padStart(4)}: "${dec.name}" models=[${dec.models.join(',')}] size=${dec.size} idle=${dec.idle} ${sane ? '✓' : '✗'}`);
    }
    console.log(`\n[verify] ${ok}/${shown} sampled NPCs decode sane (valid model ids + size + name) with the NEW (LocType) format.`);
    clearTimeout(killer); sock.end(); process.exit(0);
});
