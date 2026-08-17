// Find 'mapback' in sprites idx 8 by name hash + dump its real sprite dims (canvas + trim).
//   bun run tools/verify-mapback.ts
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
const killer = setTimeout(() => {
    console.log('[verify] TIMEOUT');
    process.exit(2);
}, 15000);
sock.on('error', e => {
    console.log('[verify] err', (e as Error).message);
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
function deblock(w: Buffer): Buffer {
    const o: number[] = [];
    for (let i = 0; i < w.length; i++) {
        if (i > 0 && i % 512 === 0) continue;
        o.push(w[i]);
    }
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
        const dst = new Uint8Array(uncompLen);
        BZip2.decompress(dst, uncompLen, new Uint8Array(c), len);
        return Buffer.from(dst);
    }
    if (t === 2) return zlib.gunzipSync(c.subarray(9, 9 + len));
    throw new Error('comp ' + t);
}
// CP1252 name hash (JagString.computeCp1252HashFromUtf8 equivalent for ascii): h = h*31 + ch | 0
function nameHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return h;
}
sock.on('connect', async () => {
    const hs = Buffer.alloc(5);
    hs[0] = 15;
    hs.writeInt32BE(464, 1);
    sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) {
        console.log('handshake rejected');
        process.exit(1);
    }
    buf = buf.subarray(1);
    // ref table idx 8: parse groups + name hashes
    const d = decompress(await fetchContainer(255, 8));
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
    const ids: number[] = [];
    let a = 0;
    for (let i = 0; i < size; i++) {
        a += g2();
        ids.push(a);
    }
    const hashes: number[] = new Array(size).fill(0);
    if (flags & 1) for (let i = 0; i < size; i++) hashes[i] = g4();
    const want = nameHash('mapback');
    let gidx = -1;
    for (let i = 0; i < size; i++)
        if (hashes[i] === want) {
            gidx = i;
            break;
        }
    console.log(`[verify] nameHash('mapback')=${want} -> group ${gidx >= 0 ? ids[gidx] : 'NOT FOUND'} (of ${size} groups)`);
    if (gidx < 0) {
        clearTimeout(killer);
        sock.end();
        process.exit(0);
    }
    const gid = ids[gidx];
    // fetch the sprite group + decode the standard sprite header (trailer format)
    const s = decompress(await fetchContainer(8, gid));
    // sprite pack trailer: last 2 bytes = count? standard 464 sprite: read from end
    let p = s.length - 2;
    const count = ((s[p] & 0xff) << 8) | (s[p + 1] & 0xff);
    p = s.length - 7 - count * 8;
    const canvasW = ((s[p] & 0xff) << 8) | (s[p + 1] & 0xff);
    const canvasH = ((s[p + 2] & 0xff) << 8) | (s[p + 3] & 0xff);
    const palCount = (s[p + 4] & 0xff) + 1;
    console.log(`[verify] mapback: count=${count} canvas=${canvasW}x${canvasH} palette=${palCount}`);
    let q = p + 5;
    for (let i = 0; i < Math.min(count, 3); i++) {
        const xof = ((s[q] & 0xff) << 8) | (s[q + 1] & 0xff);
        const yof = ((s[q + count * 2] & 0xff) << 8) | (s[q + count * 2 + 1] & 0xff);
        const wi = ((s[q + count * 4] & 0xff) << 8) | (s[q + count * 4 + 1] & 0xff);
        const hi = ((s[q + count * 6] & 0xff) << 8) | (s[q + count * 6 + 1] & 0xff);
        console.log(`  sprite ${i}: xof=${xof} yof=${yof} trimmed=${wi}x${hi}`);
        q += 2;
    }
    clearTimeout(killer);
    sock.end();
    process.exit(0);
});
