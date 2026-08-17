// Headless JS5 probe — verifies the RuneJS gateway's JS5 handshake + cache
// framing on the wire, without a browser. Mirrors what LC500's Js5Net does.
//   bun run tools/js5-probe.ts [version]   (default 464)
//
// Handshake: -> [15][i32 version BE]   <- [0] ok / [6] version mismatch
// Request:   -> [type][cacheId][u16 fileId BE]   (type 1 = urgent)
// Response:  <- [cacheId][u16 fileId] + container bytes, 0xFF separator every
//               512 wire bytes; container = [compType][i32 compLen]...
import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 43594;
const version = Number(process.argv[2] ?? 464);

let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);

setTimeout(() => {
    console.log('[probe] TIMEOUT — no/incomplete server response');
    process.exit(2);
}, 8000);

sock.on('error', e => {
    console.log('[probe] socket error:', (e as Error).message);
    process.exit(3);
});

sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        const r = resolveIdle;
        resolveIdle = null;
        if (r) r();
    }, 300);
});

function waitIdle(): Promise<void> {
    return new Promise(res => {
        resolveIdle = res;
    });
}

// Remove the 0xFF block separators the server inserts at every 512th wire byte.
function deblock(wire: Buffer): Buffer {
    const out: number[] = [];
    for (let i = 0; i < wire.length; i++) {
        if (i > 0 && i % 512 === 0) continue; // separator
        out.push(wire[i]);
    }
    return Buffer.from(out);
}

async function fetchGroup(cacheId: number, fileId: number, label: string): Promise<void> {
    buf = Buffer.alloc(0);
    sock.write(Buffer.from([1, cacheId & 0xff, (fileId >> 8) & 0xff, fileId & 0xff]));
    await waitIdle();
    const wire = buf;
    if (wire.length < 8) {
        console.log(`[probe] ${label} (${cacheId}:${fileId}): SHORT response wire=${wire.length}B (${wire.toString('hex')})`);
        return;
    }
    const db = deblock(wire);
    const hdrCache = db[0];
    const hdrFile = (db[1] << 8) | db[2];
    const container = db.subarray(3);
    const compType = container[0];
    const compLen = container.readUInt32BE(1);
    const comp = compType === 0 ? 'none' : compType === 1 ? 'bzip2' : compType === 2 ? 'gzip' : `?${compType}`;
    console.log(`[probe] ${label} (${cacheId}:${fileId}): wire=${wire.length}B deblocked=${db.length}B ` + `hdr=[${hdrCache}:${hdrFile}] compType=${compType}(${comp}) compLen=${compLen} ` + `first16=${container.subarray(0, 16).toString('hex')}`);
}

sock.on('connect', async () => {
    console.log(`[probe] connected ${HOST}:${PORT} — sending JS5 handshake version=${version}`);
    const hs = Buffer.alloc(5);
    hs[0] = 15;
    hs.writeInt32BE(version, 1);
    sock.write(hs);
    await waitIdle();

    const code = buf[0];
    const verdict = code === 0 ? 'OK — accepted' : code === 6 ? 'REJECTED — version mismatch (server wants 464)' : `unexpected (${code})`;
    console.log(`[probe] handshake reply byte = ${code}  => ${verdict}`);
    if (code !== 0) {
        sock.end();
        process.exit(code === 6 ? 0 : 1);
    }
    buf = buf.subarray(1);

    await fetchGroup(255, 255, 'master CRC table');
    await fetchGroup(255, 2, 'ref-table for config archive idx2');

    sock.end();
    process.exit(0);
});
