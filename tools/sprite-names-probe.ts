// Enumerate the name-hash table of a JS5 archive (default 8 = sprites) and test
// which candidate sprite names exist in the 465 cache. Browser-independent.
//   bun run tools/sprite-names-probe.ts [archive]   (default 8)
import net from 'node:net';
import { gunzipSync } from 'node:zlib';

const HOST = '127.0.0.1';
const PORT = 43594;
const ARCHIVE = Number(process.argv[2] ?? 8);

// RS/Java string hash used by JS5 name tables: h = h*31 + ch
function nameHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
}

function deblock(wire: Buffer): Buffer {
    const out: number[] = [];
    for (let i = 0; i < wire.length; i++) {
        if (i > 0 && i % 512 === 0) continue;
        out.push(wire[i]);
    }
    return Buffer.from(out);
}

// LC500 step-80 names + likely 465 variants to test.
const CANDIDATES = [
    'compass', 'mapscene', 'mapfunction', 'mapfunctions', 'hitmarks', 'hitmark',
    'headicons_pk', 'headicons_prayer', 'headicons_hint', 'hint_headicons',
    'hint_mapmarkers', 'mapmarker', 'mapmarkers', 'hint_mapedge', 'mapedge',
    'mapflag', 'mapdots', 'mapdot', 'cross', 'scrollbar', 'mod_icons',
    'm39_60','l39_60','m40_60','l40_60','m39_59','m39_61','m40_59','m40_61','m39_60',
    // mapflag hunt:
    'flag', 'mapflag', 'mm_flag', 'hint_mapflag', 'waypoint', 'flags',
    'mapwaypoint', 'destination', 'mapmarker0', 'mapmarkers', 'flag_marker',
    // archive 10 (binary) probe:
    'huffman', 'huffman_wordenc', 'wordenc', 'p11_full', 'p12_full', 'b12_full', 'q8_full',
];

let buf = Buffer.alloc(0);
let resolveIdle: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
setTimeout(() => { console.log('[probe] TIMEOUT'); process.exit(2); }, 8000);
sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { const r = resolveIdle; resolveIdle = null; if (r) r(); }, 350);
});
function waitIdle(): Promise<void> { return new Promise(res => { resolveIdle = res; }); }

sock.on('connect', async () => {
    const hs = Buffer.alloc(5); hs[0] = 15; hs.writeInt32BE(464, 1); sock.write(hs);
    await waitIdle();
    if (buf[0] !== 0) { console.log('[probe] handshake failed', buf[0]); process.exit(1); }
    buf = buf.subarray(1);

    // request ref-table 255:ARCHIVE
    sock.write(Buffer.from([1, 255, (ARCHIVE >> 8) & 0xff, ARCHIVE & 0xff]));
    await waitIdle();

    const db = deblock(buf);
    const container = db.subarray(3); // strip [cacheId][u16 fileId]
    const compType = container[0];
    const compLen = container.readUInt32BE(1);
    let ref: Buffer;
    if (compType === 0) ref = container.subarray(5, 5 + compLen);
    else if (compType === 2) ref = Buffer.from(gunzipSync(container.subarray(9, 9 + compLen)));
    else { console.log('[probe] bzip2 not handled here; compType', compType); process.exit(1); }

    // parse ref-table header
    let o = 0;
    const protocol = ref[o++];
    if (protocol >= 6) o += 4; // revision
    const flags = ref[o++];
    const groupCount = ref.readUInt16BE(o); o += 2;
    const groupIds: number[] = []; let last = 0;
    for (let i = 0; i < groupCount; i++) { last += ref.readUInt16BE(o); o += 2; groupIds.push(last); }
    const names: number[] = [];
    if (flags & 1) { for (let i = 0; i < groupCount; i++) { names.push(ref.readInt32BE(o)); o += 4; } }

    console.log(`[probe] archive ${ARCHIVE}: protocol=${protocol} flags=${flags} groups=${groupCount} hasNameHashes=${(flags & 1) === 1}`);
    const nameSet = new Set(names);
    console.log(`\n[probe] candidate name -> present? (hash)`);
    for (const c of CANDIDATES) {
        const h = nameHash(c);
        console.log(`  ${(nameSet.has(h) ? 'YES' : 'no ')}  ${c.padEnd(18)} ${h}`);
    }
    sock.end();
    process.exit(0);
});
