// Headless walk-test bot — logs into the game exactly like the web client (plaintext 464
// handshake) and sends the SAME MOVE packet bytes the web client's moveClick writes, so the
// server-side [walk-dbg] instrumentation shows precisely what it decodes.
//   bun run tools/walk-bot.ts [user] [pass]
// Reads server packets with the 464 size table (Statics.field224) to stay in sync; parses
// RebuildNormal(221) to learn its own world position; then walks +10 east and reports what
// player-sync movement bits come back.
import net from 'node:net';
import Statics from '../src/deob/Statics.js';

const HOST = '127.0.0.1';
const PORT = 43594;
const USER = process.argv[2] ?? 'wcbot';
const PASS = process.argv[3] ?? 'test';

const SIZES = Statics.field224;

function stringToLong(s: string): bigint {
    let l = 0n;
    for (let i = 0; i < s.length && i < 12; i++) {
        const c = s.charCodeAt(i);
        l *= 37n;
        if (c >= 65 && c <= 90) l += BigInt(c - 64);
        else if (c >= 97 && c <= 122) l += BigInt(c - 96);
        else if (c >= 48 && c <= 57) l += BigInt(c - 21);
    }
    while (l % 37n === 0n && l !== 0n) l /= 37n;
    return l;
}

const sock = net.connect(PORT, HOST);
sock.setNoDelay(true);
let buf = Buffer.alloc(0);
let step = 0; // 0=sent hs, 1=await resp0, 2=await seed, 3=await login resp, 4=await 5b header, 5=game
let serverKey = 0n;
let baseX = -1;
let baseY = -1;
let myX = -1;
let myY = -1;
let moveSent = 0;
let walkBitsSeen = 0;
const t0 = Date.now();

setTimeout(() => {
    console.log(`[bot] DONE (timeout). moveSent=${moveSent} walkBitsSeen=${walkBitsSeen} pos=(${myX},${myY})`);
    process.exit(0);
}, 25000);

sock.on('error', e => {
    console.log('[bot] socket error:', (e as Error).message);
    process.exit(3);
});

function send(bytes: number[]): void {
    sock.write(Buffer.from(bytes));
}

sock.on('connect', () => {
    const hash = Number(stringToLong(USER) >> 16n) & 0x1f;
    send([14, hash]);
    step = 1;
    console.log(`[bot] connected, sent handshake (user=${USER})`);
});

function buildLogin(): Buffer {
    const inner: number[] = [];
    const p4 = (v: number) => inner.push((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
    inner.push(10);
    p4(12345678); // clientKey1
    p4(87654321); // clientKey2
    p4(Number((serverKey >> 32n) & 0xffffffffn) | 0); // serverKey hi
    p4(Number(serverKey & 0xffffffffn) | 0); // serverKey lo
    p4(0); // gameClientId
    const u = stringToLong(USER);
    for (let i = 56; i >= 0; i -= 8) inner.push(Number((u >> BigInt(i)) & 0xffn));
    for (let i = 0; i < PASS.length; i++) inner.push(PASS.charCodeAt(i));
    inner.push(0);

    const outer: number[] = [];
    const o4 = (v: number) => outer.push((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
    outer.push(16); // fresh login
    outer.push(inner.length + 70); // size
    o4(464);
    outer.push(0); // lowDetail
    for (let i = 0; i < 16; i++) o4(0); // CRCs — read but not verified by the login server
    outer.push(inner.length); // rsaLen
    return Buffer.from([...outer, ...inner]);
}

// 464 MOVE_GAMECLICK (143) — identical bytes to the web client's moveClick(0, ...) with routeLen=1:
// [143][size=5+14][ctrl byteS=128][destY u16LE][destX shortA][14 zero mouse bytes]
function sendWalk(destX: number, destY: number): void {
    const b: number[] = [143, 5 + 14, 128, destY & 0xff, (destY >> 8) & 0xff, (destX >> 8) & 0xff, (destX + 128) & 0xff];
    for (let i = 0; i < 14; i++) b.push(0);
    send(b);
    moveSent++;
    console.log(`[bot] sent MOVE 143 -> dest=(${destX},${destY}) (I'm at ${myX},${myY})`);
}

function parseRebuild(body: Buffer): void {
    // 464 RebuildNormal: [regionY ShortA][XTEA keys][regionX LEShort][localX Short][level u8][localY Short]
    let p = 0;
    const regionY = (body[p] << 8) | ((body[p + 1] - 128) & 0xff);
    p += 2;
    const nkeys = Math.floor((body.length - 2 - 7) / 16);
    p += nkeys * 16;
    const regionX = body[p] | (body[p + 1] << 8);
    p += 2;
    const localX = (body[p] << 8) | body[p + 1];
    p += 2;
    p += 1; // level
    const localY = (body[p] << 8) | body[p + 1];
    baseX = (regionX - 6) * 8;
    baseY = (regionY - 6) * 8;
    myX = baseX + localX;
    myY = baseY + localY;
    console.log(`[bot] rebuild: region=(${regionX},${regionY}) local=(${localX},${localY}) => world pos=(${myX},${myY})`);
    if (moveSent === 0) {
        // Fresh accounts sit in the character-design modal (269) — canMove() drops walks while a
        // modal is open, so close it first (464 close-modal opcode 71, size 0).
        setTimeout(() => {
            send([71]);
            console.log('[bot] sent close-modal (71)');
        }, 1500);
        setTimeout(() => sendWalk(myX + 10, myY), 3000);
        setTimeout(() => sendWalk(myX + 10, myY + 8), 6500);
        setTimeout(() => {
            console.log(`[bot] final: moveSent=${moveSent} walkBitsSeen=${walkBitsSeen}`);
            process.exit(0);
        }, 12000);
    }
}

// count local-player walk/run bits in player-sync (90) — first 3 bits: update(1) + moveType(2)
function peekSyncMove(body: Buffer): void {
    if (body.length === 0) return;
    const b0 = body[0];
    const update = (b0 >> 7) & 1;
    const moveType = (b0 >> 5) & 3;
    if (update === 1 && (moveType === 1 || moveType === 2)) {
        walkBitsSeen++;
        console.log(`[bot] player-sync LOCAL WALK bits (type=${moveType}) — server is walking me ✓`);
    }
}

let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
        if (step === 1) {
            if (buf.length < 1) return;
            const r = buf[0];
            buf = buf.subarray(1);
            if (r !== 0) {
                console.log(`[bot] handshake response ${r} (expected 0)`);
                process.exit(1);
            }
            step = 2;
        } else if (step === 2) {
            if (buf.length < 8) return;
            serverKey = buf.readBigInt64BE(0);
            buf = buf.subarray(8);
            sock.write(buildLogin());
            step = 3;
            console.log('[bot] sent login block');
        } else if (step === 3) {
            if (buf.length < 1) return;
            const r = buf[0];
            buf = buf.subarray(1);
            if (r !== 2) {
                console.log(`[bot] login response ${r} (expected 2=SUCCESS)`);
                process.exit(1);
            }
            step = 4;
        } else if (step === 4) {
            if (buf.length < 5) return;
            const rights = buf[0];
            const world = (buf[2] << 8) | buf[3];
            buf = buf.subarray(5);
            console.log(`[bot] IN GAME (rights=${rights} worldIndex=${world}) after ${Date.now() - t0}ms`);
            step = 5;
            keepaliveTimer = setInterval(() => send([7, 0]), 1500);
        } else if (step === 5) {
            if (buf.length < 1) return;
            const op = buf[0];
            let size = SIZES[op];
            let hdr = 1;
            if (size === -1) {
                if (buf.length < 2) return;
                size = buf[1];
                hdr = 2;
            } else if (size === -2) {
                if (buf.length < 3) return;
                size = (buf[1] << 8) | buf[2];
                hdr = 3;
            } else if (size === undefined || size === -3) {
                console.log(`[bot] unknown opcode ${op} — aborting cleanly`);
                process.exit(2);
            }
            if (buf.length < hdr + size) return;
            const body = buf.subarray(hdr, hdr + size);
            if (op === 221) parseRebuild(Buffer.from(body));
            else if (op === 90) peekSyncMove(Buffer.from(body));
            buf = buf.subarray(hdr + size);
        } else {
            return;
        }
    }
});
