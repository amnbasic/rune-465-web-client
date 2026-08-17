/**
 * Render the mobile HUD's drawn surfaces to a PNG, without a browser, a cache or a login.
 *
 * The look of this HUD is a palette and a handful of rounded rects, and every one of them used to
 * be checkable only by building the bundle, launching the client, logging in and looking. That is
 * a slow loop for a colour, and a slow loop for a colour is how you end up shipping a bright rim
 * around everything.
 *
 * IT CALLS THE REAL CODE. `HudSkin` imports nothing but `Pix2D` and `PixMap`, so this tool imports
 * `HudSkin` itself rather than a copy of its numbers — panels, stones, chips, bars and the minimap
 * ring here are the exact functions the client runs, over a synthetic scene. An earlier version
 * parsed the constants out of `Client.ts` with a regex, which was one refactor away from silently
 * previewing a HUD nobody ships.
 *
 * What it CANNOT show, because none of it is here: cache art (tab icons, item icons, the panel
 * contents), text, and the GPU renderer's alpha-tag path — this composites the software way, over
 * a scene that is really in the buffer. Geometry, palette and weight are what it is for.
 *
 *   bun tools/preview-hud.ts [--out preview-hud.png] [--trans N] [--crop x,y,w,h] [--zoom N]
 */

import zlib from 'zlib';

import { CHAT_CHIPS } from '#/client/ChatFilter.js';
import HotkeyBar from '#/client/HotkeyBar.js';
import HudSkin from '#/client/HudSkin.js';
import * as HudStrip from '#/client/HudStrip.js';
import Pix2D from '#/graphics/Pix2D.js';
import type Pix32 from '#/graphics/Pix32.js';

// ---------------------------------------------------------------------------------------------
// The scene to composite against
// ---------------------------------------------------------------------------------------------

/**
 * Flat colour proves nothing about a translucent panel — it is contrast that shows whether an edge
 * is doing something or just being seen — so this is grass, a bright path, water and a band of
 * sunlit ground, and every cluster crosses at least two of them.
 */
function scene(w: number, h: number): void {
    for (let y: number = 0; y < h; y++) {
        for (let x: number = 0; x < w; x++) {
            const n: number = ((x * 7 + y * 13) % 17) - 8;
            let rgb: number;
            if (x > w * 0.62 && y > h * 0.55) {
                rgb = 0x2f5f86 + n * 0x010101; // water
            } else if (y > h * 0.3 && y < h * 0.62) {
                rgb = 0x8d8163 + n * 0x020202; // a bright dirt path: the worst case for a dark panel
            } else if (x < w * 0.25 && y < h * 0.28) {
                rgb = 0xb9c9a0 + n * 0x010101; // sunlit grass, brighter still
            } else {
                rgb = 0x4a6b3a + n * 0x010202; // grass
            }
            Pix2D.pixels[y * w + x] = rgb;
        }
    }
}

/**
 * The fourteen live tab icons, as measured out of the cache with
 * `bun tools/dump-sprites.ts --bbox 168 898-910` in the server repo: content size and its offset
 * inside the shared 32x36 canvas. The art is not available here — the SIZES are the point, because
 * they are what `HudSkin.icon` has to reconcile.
 */
const ICONS: [number, number, number, number][] = [
    [20, 20, 4, 8], // 168 combat
    [25, 23, 5, 7], // 898 stats
    [22, 22, 4, 6], // 899 quests
    [31, 30, 1, 1], // 900 inventory
    [27, 32, 3, 0], // 901 equipment
    [26, 30, 4, 3], // 902 prayer
    [25, 24, 4, 6], // 903 magic
    [23, 23, 4, 6], // 904 friends
    [23, 23, 4, 6], // 905 ignores
    [21, 30, 5, 0], // 906 logout
    [24, 24, 3, 5], // 907 settings
    [19, 28, 6, 1], // 908 emotes
    [22, 26, 5, 2], // 909 music
    [24, 24, 4, 6] // 910 spare
];

/**
 * The REAL cache art, when it has been exported beside this tool.
 *
 * `bun tools/dump-sprites.ts --raw <file> 168 898-910` in the server repo writes the decoded
 * frames as data. With them present the preview runs the actual icons through the actual
 * `HudSkin.icon`, which is the only way to judge a resampling filter without launching the client
 * — a stand-in rectangle can prove the geometry but says nothing about whether the filter chews
 * the art. Without them the preview falls back to boxes of the measured sizes.
 */
type RawIcon = { label: string; wi: number; hi: number; xof: number; yof: number; owi: number; ohi: number; data: number[] };

const rawIndex: number = process.argv.indexOf('--icons');
const RAW: RawIcon[] = rawIndex >= 0 ? ((await Bun.file(process.argv[rawIndex + 1]).json()) as RawIcon[]) : [];

/**
 * The baked icon names, in the same order as the cache dump above.
 *
 * Passing a name makes `HudSkin.icon` draw the hand-authored art instead of fitting the cache
 * sprite, which is what the client does — so the strip below is a true before-and-after: the
 * cache art on top, and on the bottom whatever the client will actually paint.
 */
const NAMES: string[] = ['combat', 'skills', 'quests', 'inventory', 'equipment', 'prayer', 'magic', 'friends', 'ignore', 'logout', 'settings', 'emotes', 'music', 'clanchat'];

/**
 * Wrap a frame as something `HudSkin.icon` accepts.
 *
 * It reads `wi/hi/xof/yof` and the `data` buffer structurally, so a plain object is a faithful
 * stand-in for a `SoftwarePix32` here — and `transScalePlotSprite` is only reached on the fallback
 * path, where drawing nothing is the honest answer for a tool with no rasteriser.
 */
function asSprite(icon: RawIcon): Pix32 {
    return {
        wi: icon.wi,
        hi: icon.hi,
        xof: icon.xof,
        yof: icon.yof,
        owi: icon.owi,
        ohi: icon.ohi,
        data: Int32Array.from(icon.data),
        transScalePlotSprite(): void {}
    } as unknown as Pix32;
}

/** The frame drawn at its authored size and offset, for the before-and-after comparison. */
function rawBlit(icon: RawIcon, x: number, y: number): void {
    for (let row = 0; row < icon.hi; row++) {
        for (let col = 0; col < icon.wi; col++) {
            const p: number = icon.data[row * icon.wi + col];
            if (p !== 0) {
                Pix2D.pixels[(y + icon.yof + row) * Pix2D.width + x + icon.xof + col] = p;
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------
// One frame of HUD, at the geometry MobileLayout's anchor table produces
// ---------------------------------------------------------------------------------------------

function hud(ox: number, oy: number, fw: number, fh: number): void {
    Pix2D.setClipping(ox, oy, ox + fw, oy + fh);

    // The chat cluster: com_0 (496x50) with com_73 (479x96) under it, top-left.
    HudSkin.panel(ox, oy, 496, 146);

    // The chat tab row, using the client's own chip list and the client's own geometry — the
    // labels and the cell arithmetic are imported, not restated, so this cannot preview a row the
    // client does not draw.
    for (let i = 0; i < CHAT_CHIPS.length; i++) {
        const r = HudSkin.chipRect(i, CHAT_CHIPS.length, 496, 34);
        HudSkin.chip(ox + r.x, oy + r.y, r.w, r.h, i === 2);
        // The state strip the cache's mode cell is parked in, marked so the split is visible.
        if (i >= 2) {
            Pix2D.fillRect(ox + r.x + 4, oy + r.y + r.h - HudSkin.CHIP_STATE_H, r.w - 8, 1, 0x6a5f4c);
        }
    }

    // The chatbox's own scrollbar column, right-hand edge, 16px wide.
    HudSkin.bar(ox + 471, oy + 66, 16, 64, false);
    HudSkin.bar(ox + 471, oy + 84, 16, 30, true);

    // The right column: the tab strip beside the 190-wide panel, bottom-right.
    // The slab is behind the PANEL only now — the tab cells float over the scene like the hotkeys.
    // The strip's geometry comes from the shipped module, not a copy — this tool exists to show
    // what the client draws, and a second set of numbers here would eventually show something else.
    const strip = HudStrip.geometry(fw, fh, { top: 0, right: 0, bottom: 0, left: 0 }, 1);
    const colY: number = oy + fh - strip.edge - HudStrip.PANEL_H;
    HudSkin.panel(ox + fw - strip.footprint - HudStrip.PANEL_W, colY, HudStrip.PANEL_W, HudStrip.PANEL_H);

    // Two columns of stones against the right edge — seven on the left, six on the right (the
    // cache's dead Clan Chat slot is hidden). Inventory, index 3 of the left column, is the tab
    // the cache leaves open.
    //
    // The LEFT half of each stone shows the icon as `HudSkin.icon` places it and the RIGHT half
    // shows it as the cache authored it, so the normalisation is visible as a difference rather
    // than having to be taken on trust.
    for (let col = 0; col < 2; col++) {
        const rows: number = col === 0 ? HudStrip.ROWS_TALL : HudStrip.ROWS_SHORT;
        for (let row = 0; row < rows; row++) {
            // Column 0 is the INNER one (seven stones); they share a baseline, so the six-stone
            // column is missing its top cell rather than its bottom one.
            const cx: number = ox + fw - strip.edge - (col === 0 ? 2 * strip.col : strip.col);
            const cy: number = oy + fh - strip.edge - HudStrip.columnHeight(strip, rows) + row * (strip.cell + strip.gap);
            HudSkin.stone(cx + 2, cy, strip.cell, strip.cell, col === 0 && row === 3);
            const i: number = col * 7 + row;
            if (RAW.length > i) {
                HudSkin.icon(asSprite(RAW[i]), cx + 2 + (strip.cell >> 1), cy + (strip.cell >> 1), 256, NAMES[i]);
            } else {
                const [wi, hi] = ICONS[i];
                Pix2D.fillRect(cx + 2 + (strip.cell >> 1) - (wi >> 1), cy + (strip.cell >> 1) - (hi >> 1), wi, hi, 0xb9ae92);
            }
        }
    }

    // A before-and-after strip: authored on top, normalised directly under it. This is the whole
    // question — same optical size, same centre, and no damage from the resampling.
    for (let i = 0; i < ICONS.length; i++) {
        const x: number = ox + 40 + i * 36;
        if (RAW.length > i) {
            rawBlit(RAW[i], x, oy + fh - 224);
            HudSkin.stone(x, oy + fh - 180, 34, 37, i === 3);
            HudSkin.icon(asSprite(RAW[i]), x + 17, oy + fh - 180 + 18, 256, NAMES[i]);
        } else {
            const [wi, hi, xof, yof] = ICONS[i];
            Pix2D.fillRect(x + xof, oy + fh - 224 + yof, wi, hi, 0x8a8272);
        }
    }

    // The five action hotkeys, at the client's own geometry — HotkeyBar owns the arithmetic, so
    // this cannot preview a row in a place the client does not put it. The DOM button stack is
    // sketched beside it at the 44px cell and 52px pitch index.html specifies, because the one
    // thing this layout has to get right is that the two do not overlap.
    HotkeyBar.metrics = strip;
    for (let i = 0; i < HudStrip.HOTKEY_ROWS; i++) {
        const r = HotkeyBar.rect(i, fw, fh);
        HudSkin.iconButton(ox + r.x, oy + r.y, r.w, r.h, i === 0);
    }
    // The DOM button stack, sketched at the geometry index.html gives it — the same cell, and a
    // step of cell + 8. It is drawn here for one reason: the two columns must not overlap, and
    // must not be different sizes, and both of those are only visible side by side.
    for (let i = 0; i < 3; i++) {
        HudSkin.iconButton(ox + 8, oy + fh - 52 - i * (strip.cell + 8), strip.cell, strip.cell, i === 2);
    }

    // The minimap: the true circle, and its ring. Top-right, com_72 at 172x156 with the map
    // inset (+25,+5) — the same numbers the 1338 branch uses.
    const mapX: number = ox + fw - 172 + 25;
    const mapY: number = oy + 5;
    const mask = HudSkin.circleMask(146, 151);
    Pix2D.setClipping(mapX, mapY, mapX + 146, mapY + 151);
    for (let row = 0; row < 151; row++) {
        const len: number = mask.lengths[row];
        if (len <= 0) {
            continue;
        }
        const base: number = (mapY + row) * Pix2D.width + mapX + mask.offsets[row];
        for (let i = 0; i < len; i++) {
            Pix2D.pixels[base + i] = 0x27352a; // stand-in for the rendered map image
        }
    }
    Pix2D.setClipping(mapX - HudSkin.RING_W, mapY - HudSkin.RING_W, mapX + 146 + HudSkin.RING_W, mapY + 151 + HudSkin.RING_W);
    HudSkin.ring(mapX, mapY, mask.offsets, mask.lengths, 151);

    Pix2D.setClipping(0, 0, Pix2D.width, Pix2D.height);
}

// ---------------------------------------------------------------------------------------------
// PNG out
// ---------------------------------------------------------------------------------------------

const CRC_TABLE: Int32Array = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buf: Buffer): number {
    let c: number = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, pixels: Int32Array): Buffer {
    const raw = Buffer.alloc(height * (width * 3 + 1));
    let o = 0;
    for (let y = 0; y < height; y++) {
        raw[o++] = 0; // filter: none
        for (let x = 0; x < width; x++) {
            const p = pixels[y * width + x];
            raw[o++] = (p >>> 16) & 0xff;
            raw[o++] = (p >>> 8) & 0xff;
            raw[o++] = p & 0xff;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: RGB
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------------------------

const args: string[] = process.argv.slice(2);
const outIndex: number = args.indexOf('--out');
const out: string = outIndex >= 0 ? args[outIndex + 1] : 'preview-hud.png';

/** The See-through default. `--trans N` overrides it, for comparing levels without editing code. */
const transIndex: number = args.indexOf('--trans');
HudSkin.trans = transIndex >= 0 ? Number(args[transIndex + 1]) : Number(/HUD_TRANS_LIGHT: number = (\d+)/.exec(await Bun.file(new URL('../src/client/ControlBar.ts', import.meta.url)).text())?.[1] ?? '84');

/** `--crop x,y,w,h` with `--zoom N`: pixel-peeping, nearest-neighbour so 1px stays 1px. */
const cropIndex: number = args.indexOf('--crop');
const crop: number[] | null = cropIndex >= 0 ? args[cropIndex + 1].split(',').map(Number) : null;
const zoomIndex: number = args.indexOf('--zoom');
const zoom: number = zoomIndex >= 0 ? Number(args[zoomIndex + 1]) : 1;

// About the frame a landscape phone gets at the Fit preset, and wide enough that the chat cluster
// and the right column do not touch.
const FW: number = 850;
const FH: number = 430;

Pix2D.setPixels(new Int32Array(FW * FH), FW, FH);
scene(FW, FH);
hud(0, 0, FW, FH);

let outW: number = FW;
let outH: number = FH;
let outPixels: Int32Array = Pix2D.pixels;
if (crop !== null || zoom > 1) {
    const [cx, cy, cw, ch] = crop ?? [0, 0, FW, FH];
    outW = cw * zoom;
    outH = ch * zoom;
    outPixels = new Int32Array(outW * outH);
    for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
            outPixels[y * outW + x] = Pix2D.pixels[(cy + ((y / zoom) | 0)) * FW + cx + ((x / zoom) | 0)];
        }
    }
}

await Bun.write(out, encodePng(outW, outH, outPixels));
console.log(`wrote ${out} (${outW}x${outH})`);
console.log(`trans ${HudSkin.trans} -> panel alpha ${HudSkin.alpha()}/256, cell ${HudSkin.alpha(26)}, active ${HudSkin.alpha(64)}`);
