// Headless verification of native 465 NpcType (idx2 group 9).
//   bun run tools/verify-npc-decode.ts
//
// Stock npc=9 NpcType: op1=models, op12=size, op13=idle, op14=walk u16, op17=4-dir,
// op2=name, op30-34=ops. Handshake stays 464.
import net from 'node:net';
import zlib from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const VERSION = 464;
const CONFIG_ARCHIVE = 2;
const NPC_GROUP = 9;

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
// Native 465 NpcType. Unexpected opcode → fail (costume leftover).
function decodeNpc(d: Buffer): { name: string; models: number[]; size: number; idle: number; ops: (string | null)[] } | null {
    let pos = 0;
    let name = '';
    let models: number[] = [];
    let size = 1;
    let idle = -1;
    const ops: (string | null)[] = [null, null, null, null, null];
    const g1 = () => d[pos++] & 0xff;
    const g2 = () => ((d[pos++] & 0xff) << 8) | (d[pos++] & 0xff);
    const str = () => {
        let s = '';
        while (d[pos] !== 0) s += String.fromCharCode(d[pos++]);
        pos++;
        return s;
    };
    try {
        while (pos < d.length) {
            const code = g1();
            if (code === 0) break;
            if (code === 1) {
                const n = g1();
                for (let i = 0; i < n; i++) models.push(g2());
            } else if (code === 2) name = str();
            else if (code === 12) size = g1();
            else if (code === 13) {
                idle = g2();
                if (idle === 65535) idle = -1;
            } else if (code === 14 || code === 15 || code === 16) pos += 2;
            else if (code === 17) pos += 8;
            else if (code >= 30 && code < 35) ops[code - 30] = str();
            else if (code === 40 || code === 41) {
                const n = g1();
                pos += n * 4;
            } else if (code === 42) {
                const n = g1();
                pos += n;
            } else if (code === 60) {
                const n = g1();
                pos += n * 2;
            } else if (code === 93 || code === 99 || code === 107 || code === 109 || code === 111) {
                /* flags */
            } else if (code === 95 || code === 97 || code === 98 || code === 102 || code === 103) pos += 2;
            else if (code === 100 || code === 101 || code === 119) pos += 1;
            else if (code === 106 || code === 118) {
                pos += 4;
                if (code === 118) pos += 2;
                const n = g1();
                pos += (n + 1) * 2;
            } else if (code === 113) pos += 4;
            else if (code === 114 || code === 115) pos += 2;
            else if (code === 249) {
                const n = g1();
                for (let i = 0; i < n; i++) {
                    const isStr = g1();
                    pos += 3;
                    if (isStr) str();
                    else pos += 4;
                }
            } else return null;
        }
    } catch {
        return null;
    }
    return { name, models, size, idle, ops };
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
    const nFiles = fileIdLimitFor(await fetchContainer(255, CONFIG_ARCHIVE), NPC_GROUP);
    console.log(`[verify] config group 9 (NpcType) has ${nFiles} entries.`);
    if (nFiles !== 6201) {
        console.log(`[verify] FAIL: group 9 fileIdLimit=${nFiles}, want 6201 (still remapped?)`);
        process.exit(1);
    }
    const files = splitGroup(decompress(await fetchContainer(CONFIG_ARCHIVE, NPC_GROUP)), nFiles);
    let failed = 0;
    for (let f = 0; f < files.length; f++) {
        if (files[f].length === 0) continue;
        const dec = decodeNpc(files[f]);
        if (dec === null) {
            console.log(`  npc ${f}: DECODE FAILED (unexpected opcode / overrun)`);
            failed++;
        }
    }
    const hans = decodeNpc(files[0]);
    const kq = decodeNpc(files[1158]);
    const connad = decodeNpc(files[5029]);
    const cain = decodeNpc(files[5030]);
    const checks: string[] = [];
    if (!hans || hans.name !== 'Hans' || hans.size !== 1) checks.push(`Hans: ${hans?.name} size=${hans?.size}`);
    if (!kq || kq.name !== 'Kalphite Queen' || kq.size !== 5) checks.push(`KQ: ${kq?.name} size=${kq?.size}`);
    if (!connad || connad.name !== 'Commander Connad' || connad.ops[2] !== 'Get-rewards') {
        checks.push(`Connad op3=${connad?.ops[2]}`);
    }
    if (!cain || cain.name !== 'Captain Cain' || cain.ops[2] !== 'Tutorial') {
        checks.push(`Cain op3=${cain?.ops[2]}`);
    }
    for (const c of checks) console.log(`[verify] FAIL sample: ${c}`);
    if (failed || checks.length) {
        console.log(`[verify] FAIL native walk (failed=${failed} samples=${checks.length})`);
        process.exit(1);
    }
    console.log(`[verify] OK: 6201 NpcType @ group 9; Connad Get-rewards; Cain Tutorial; KQ size 5`);
    clearTimeout(killer);
    sock.end();
    process.exit(0);
});
