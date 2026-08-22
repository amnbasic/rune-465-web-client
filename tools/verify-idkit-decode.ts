// Headless verification of native 465 IdkType (idx2 group 3).
//   bun run tools/verify-idkit-decode.ts
//
// op1=type u8, op2=models count+u16, op40=count+pairs, op60-69=per-index head.
import net from 'node:net';
import zlib from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const VERSION = 464;
const CONFIG_ARCHIVE = 2;
const IDK_GROUP = 3;

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
    for (let c = 0; c < numChunks; c++)
        for (let f = 0; f < numFiles; f++) {
            files[f] = Buffer.concat([files[f], data.subarray(off, off + chunkSizes[c][f])]);
            off += chunkSizes[c][f];
        }
    return files;
}
function fileIdLimitFor(container: Buffer, wantGroup: number): number {
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
    return fileIdLimit[wantGroup] ?? 0;
}
function decodeIdkNative(idk: Buffer): { type: number; models: number[] } | null {
    let pos = 0;
    let type = -1;
    let models: number[] = [];
    try {
        while (pos < idk.length) {
            const code = idk[pos++];
            if (code === 0) break;
            if (code === 1) {
                type = idk[pos++];
            } else if (code === 2) {
                const n = idk[pos++];
                for (let i = 0; i < n; i++) {
                    models.push(idk.readUInt16BE(pos));
                    pos += 2;
                }
            } else if (code === 3) {
                /* disable */
            } else if (code === 40) {
                const n = idk[pos++];
                pos += n * 4;
            } else if (code >= 60 && code < 70) {
                pos += 2;
            } else return null;
        }
    } catch {
        return null;
    }
    return { type, models };
}

sock.on('connect', async () => {
    const hs = Buffer.alloc(5);
    hs[0] = 15;
    hs.writeInt32BE(VERSION, 1);
    sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) {
        console.log(`[verify] handshake rejected (${buf[0]})`);
        process.exit(1);
    }
    buf = buf.subarray(1);
    console.log('[verify] JS5 OK; fetching config ref-table (255:2)...');
    const nFiles = fileIdLimitFor(await fetchContainer(255, CONFIG_ARCHIVE), IDK_GROUP);
    console.log(`[verify] config group 3 (idkit) has ${nFiles} body parts.`);
    if (nFiles !== 84) {
        console.log(`[verify] FAIL: group 3 fileIdLimit=${nFiles}, want 84`);
        process.exit(1);
    }
    const files = splitGroup(decompress(await fetchContainer(CONFIG_ARCHIVE, IDK_GROUP)), nFiles);
    let ok = 0;
    let failed = 0;
    for (let f = 0; f < files.length; f++) {
        if (files[f].length === 0) continue;
        const dec = decodeIdkNative(files[f]);
        if (dec === null) {
            console.log(`  idk ${f}: DECODE FAILED (unknown opcode / overrun)`);
            failed++;
            continue;
        }
        const saneModels = dec.models.length > 0 && dec.models.every(m => m >= 0 && m < 100000);
        const saneType = dec.type >= 0 && dec.type <= 13;
        if (saneModels && saneType) ok++;
        else {
            console.log(`  idk ${String(f).padStart(3)}: type=${dec.type} models=[${dec.models.join(',')}] ✗`);
            failed++;
        }
    }
    const kit0 = decodeIdkNative(files[0]);
    if (!kit0 || kit0.type !== 0 || kit0.models[0] !== 230) {
        console.log(`[verify] FAIL kit 0 type=${kit0?.type} model=${kit0?.models[0]}`);
        failed++;
    }
    if (failed || ok !== 84) {
        console.log(`[verify] FAIL native idk (ok=${ok} failed=${failed})`);
        process.exit(1);
    }
    console.log(`[verify] OK: 84 IdkType @ group 3; kit 0 type=0 model=230`);
    clearTimeout(killer);
    sock.end();
    process.exit(0);
});
