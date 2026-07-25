// Headless verification of the 465 texture-def decode (idx 9, group 0, file N = texture id).
//   bun run tools/verify-texture-decode.ts
// Format: u16 avgHSL, u8 opaque, u8 count(1-4), count*u16 spriteIds, [count-1 combine + count-1
// unused], count*s32 colourOps, u8 animType(0-4), u8 animSpeed — must consume the file EXACTLY.
import net from 'node:net';
import zlib from 'node:zlib';
import BZip2 from '../src/io/BZip2.js';

const HOST = '127.0.0.1';
const PORT = 43594;
let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
const killer = setTimeout(() => { console.log('[verify] TIMEOUT'); process.exit(2); }, 15000);
sock.on('error', e => { console.log('[verify] err', (e as Error).message); process.exit(3); });
sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { const r = resolveIdle; resolveIdle = null; if (r) r(); }, 250);
});
function waitIdle(): Promise<void> { return new Promise(res => { resolveIdle = res; }); }
function deblock(w: Buffer): Buffer {
    const o: number[] = [];
    for (let i = 0; i < w.length; i++) { if (i > 0 && i % 512 === 0) continue; o.push(w[i]); }
    return Buffer.from(o);
}
async function fetchContainer(c: number, f: number): Promise<Buffer> {
    buf = Buffer.alloc(0);
    sock.write(Buffer.from([1, c & 0xff, (f >> 8) & 0xff, f & 0xff]));
    await waitIdle();
    return deblock(buf).subarray(3);
}
function decompress(c: Buffer): Buffer {
    const t = c[0];
    const len = c.readUInt32BE(1);
    if (t === 0) return c.subarray(5, 5 + len);
    const uncompLen = c.readUInt32BE(5);
    if (t === 1) {
        // headerless RS bzip2 — mirror Js5.getUncompressedPacket: decompress(dst, dstLen, container, compLen)
        const dst = new Uint8Array(uncompLen);
        BZip2.decompress(dst, uncompLen, new Uint8Array(c), len);
        return Buffer.from(dst);
    }
    const p = c.subarray(9, 9 + len);
    if (t === 2) return zlib.gunzipSync(p);
    throw new Error('comp ' + t);
}
function splitGroup(d: Buffer, n: number): Buffer[] {
    if (n === 1) return [d];
    const chunks = d[d.length - 1] & 0xff;
    const sizes: number[][] = Array.from({ length: chunks }, () => new Array(n).fill(0));
    let p = d.length - 1 - chunks * n * 4;
    for (let c = 0; c < chunks; c++) { let s = 0; for (let f = 0; f < n; f++) { s += d.readInt32BE(p); p += 4; sizes[c][f] = s; } }
    const files: Buffer[] = new Array(n).fill(null).map(() => Buffer.alloc(0));
    let off = 0;
    for (let c = 0; c < chunks; c++) for (let f = 0; f < n; f++) { files[f] = Buffer.concat([files[f], d.subarray(off, off + sizes[c][f])]); off += sizes[c][f]; }
    return files;
}
function limitFor(c: Buffer, want: number): number {
    const d = decompress(c);
    let pos = 0;
    const g1 = () => d[pos++] & 0xff;
    const g2 = () => ((d[pos++] & 0xff) << 8) | (d[pos++] & 0xff);
    const g4 = () => { const v = d.readInt32BE(pos); pos += 4; return v; };
    const proto = g1(); if (proto >= 6) g4();
    const flags = g1(); const size = g2();
    const ids: number[] = []; let a = 0; let mx = -1;
    for (let i = 0; i < size; i++) { a += g2(); ids.push(a); if (a > mx) mx = a; }
    if (flags & 1) for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    for (let i = 0; i < size; i++) g4();
    const gs: number[] = new Array(mx + 1).fill(0);
    for (let i = 0; i < size; i++) gs[ids[i]] = g2();
    const fl: number[] = new Array(mx + 1).fill(0);
    for (let i = 0; i < size; i++) { const g = ids[i]; let fa = 0; let fm = -1; for (let f = 0; f < gs[g]; f++) { fa += g2(); if (fa > fm) fm = fa; } fl[g] = fm + 1; }
    return fl[want] ?? 0;
}
function decodeDef(d: Buffer): { avg: number; opq: number; n: number; sprites: number[]; anim: number; speed: number; consumed: number } | null {
    let p = 0;
    const g1 = () => d[p++] & 0xff;
    const g2 = () => ((d[p++] & 0xff) << 8) | (d[p++] & 0xff);
    try {
        const avg = g2();
        const opq = g1();
        const n = g1();
        if (n < 1 || n > 4) return null;
        const sprites: number[] = [];
        for (let i = 0; i < n; i++) sprites.push(g2());
        if (n > 1) p += (n - 1) * 2;
        p += n * 4;
        const anim = g1();
        const speed = g1();
        return { avg, opq, n, sprites, anim, speed, consumed: p };
    } catch { return null; }
}

sock.on('connect', async () => {
    const hs = Buffer.alloc(5); hs[0] = 15; hs.writeInt32BE(464, 1); sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) { console.log('handshake rejected'); process.exit(1); }
    buf = buf.subarray(1);
    const n = limitFor(await fetchContainer(255, 9), 0);
    console.log(`[verify] textures group 0 has ${n} defs`);
    const files = splitGroup(decompress(await fetchContainer(9, 0)), n);
    let ok = 0; let animated = 0;
    for (let f = 0; f < files.length; f++) {
        if (files[f].length === 0) continue;
        const d = decodeDef(files[f]);
        const exact = d !== null && d.consumed === files[f].length && d.anim <= 4 && d.opq <= 1;
        if (exact) ok++;
        if (d && d.anim > 0) animated++;
        if (f < 8 || (d && d.anim > 0)) {
            console.log(`  tex ${String(f).padStart(2)}: len=${files[f].length} ${d ? `avgHSL=${d.avg} opaque=${d.opq} sprites=[${d.sprites}] anim=${d.anim} speed=${d.speed} consumed=${d.consumed}` : 'FAIL'} ${exact ? '✓' : '✗'}`);
        }
    }
    console.log(`\n[verify] ${ok}/${files.filter(f => f.length > 0).length} defs decode EXACTLY (full file consumed); ${animated} animated textures`);
    clearTimeout(killer); sock.end(); process.exit(0);
});
