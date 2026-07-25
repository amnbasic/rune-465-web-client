// Headless WebSocket JS5 probe — verifies the FULL browser transport chain
// (WebSocket -> proxy.ts -> TCP gateway :43594 -> JS5 handler) without a browser.
// Same handshake/framing as js5-probe.ts, but over ws:// exactly like the client.
//   bun run tools/js5-ws-probe.ts [url] [version]
//   default url=ws://127.0.0.1:8899  version=464
const url = process.argv[2] ?? 'ws://127.0.0.1:8899';
const version = Number(process.argv[3] ?? 464);

let buf = new Uint8Array(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function append(chunk: Uint8Array): void {
    const next = new Uint8Array(buf.length + chunk.length);
    next.set(buf, 0);
    next.set(chunk, buf.length);
    buf = next;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        const r = resolveIdle;
        resolveIdle = null;
        if (r) r();
    }, 300);
}

function waitIdle(): Promise<void> {
    return new Promise(res => {
        resolveIdle = res;
    });
}

function deblock(wire: Uint8Array): Uint8Array {
    const out: number[] = [];
    for (let i = 0; i < wire.length; i++) {
        if (i > 0 && i % 512 === 0) continue;
        out.push(wire[i]);
    }
    return new Uint8Array(out);
}

const ws = new WebSocket(url, 'binary');
ws.binaryType = 'arraybuffer';

setTimeout(() => {
    console.log('[ws-probe] TIMEOUT');
    process.exit(2);
}, 8000);

ws.addEventListener('error', (e: any) => {
    console.log('[ws-probe] ws error:', e?.message ?? e);
    process.exit(3);
});

ws.addEventListener('message', (ev: MessageEvent) => {
    append(new Uint8Array(ev.data as ArrayBuffer));
});

async function fetchGroup(cacheId: number, fileId: number, label: string): Promise<void> {
    buf = new Uint8Array(0);
    ws.send(new Uint8Array([1, cacheId & 0xff, (fileId >> 8) & 0xff, fileId & 0xff]));
    await waitIdle();
    if (buf.length < 8) {
        console.log(`[ws-probe] ${label} (${cacheId}:${fileId}): SHORT wire=${buf.length}B`);
        return;
    }
    const db = deblock(buf);
    const view = new DataView(db.buffer, db.byteOffset, db.byteLength);
    const hdrCache = db[0];
    const hdrFile = (db[1] << 8) | db[2];
    const compType = db[3];
    const compLen = view.getUint32(4, false);
    const comp = compType === 0 ? 'none' : compType === 1 ? 'bzip2' : compType === 2 ? 'gzip' : `?${compType}`;
    const hex = Array.from(db.subarray(3, 19)).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`[ws-probe] ${label} (${cacheId}:${fileId}): wire=${buf.length}B deblocked=${db.length}B hdr=[${hdrCache}:${hdrFile}] compType=${compType}(${comp}) compLen=${compLen} first16=${hex}`);
}

ws.addEventListener('open', async () => {
    console.log(`[ws-probe] connected ${url} (proto='${ws.protocol}') — JS5 handshake version=${version}`);
    const hs = new Uint8Array(5);
    hs[0] = 15;
    new DataView(hs.buffer).setUint32(1, version, false);
    ws.send(hs);
    await waitIdle();

    const code = buf[0];
    const verdict = code === 0 ? 'OK — accepted through the WS bridge' : code === 6 ? 'REJECTED (version)' : `unexpected (${code})`;
    console.log(`[ws-probe] handshake reply byte = ${code}  => ${verdict}`);
    if (code !== 0) {
        ws.close();
        process.exit(code === 6 ? 0 : 1);
    }
    buf = buf.subarray(1);

    await fetchGroup(255, 255, 'master CRC table');
    await fetchGroup(255, 2, 'ref-table config idx2');

    ws.close();
    process.exit(0);
});
