/**
 * Bake the hand-authored HUD art into a TypeScript module the client can use with no asset fetch.
 *
 *   bun tools/import-art.ts [--icons design/icons] [--glyphs design/glyphs] [--out src/client/HudArtData.ts]
 *
 * WHY BAKE RATHER THAN SERVE. The client has no asset-loading path and adding one is a bigger
 * decision than this art needs: `public/` holds the page and the bundle, sprites come from the
 * cache, and the one piece of custom art already in the tree (`WasdToggleData.ts`) is baked for
 * exactly this reason — its own comment says so. This follows that precedent, including the
 * palette-indexed encoding with index 0 as the transparent hole.
 *
 * TWO FORMS, BECAUSE THERE ARE TWO CONSUMERS:
 *
 * - **Icons** are drawn on the canvas by `HudSkin.icon`, so they are decoded here into a palette
 *   plus one byte per pixel, cropped to their artwork. The client rebuilds an ARGB buffer from
 *   that at first draw. Decoding at build time rather than runtime is what lets the client stay
 *   free of a PNG decoder.
 * - **Glyphs** go on DOM buttons, where the browser is the decoder, so they are embedded as the
 *   original PNG bytes in base64 and used as a `data:` URI. Decoding them here would mean
 *   re-encoding them there for no gain.
 *
 * EVERYTHING IS VERIFIED, NOT TRUSTED. The art arrives with a claim attached — 32x32, binary
 * alpha, artwork inside 24px — and each of those is a thing the drawing code depends on: binary
 * alpha is why the palette encoding is lossless, and the 24px box is why nothing is resampled. So
 * this re-checks them from the pixels and refuses to write a file that would quietly ship a
 * softened or oversized icon.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// ---------------------------------------------------------------------------------------------
// A minimal PNG reader: 8-bit, non-interlaced, colour types 0/2/3/6
// ---------------------------------------------------------------------------------------------

type Image = { width: number; height: number; argb: Int32Array };

function inflateIdat(buf: Buffer): { width: number; height: number; bitDepth: number; colour: number; idat: Buffer; palette: Buffer | null; trns: Buffer | null } {
    if (buf.readUInt32BE(0) !== 0x89504e47) {
        throw new Error('not a PNG');
    }
    let off = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colour = 0;
    let palette: Buffer | null = null;
    let trns: Buffer | null = null;
    const idats: Buffer[] = [];
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const data = buf.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colour = data[9];
            if (data[12] !== 0) {
                throw new Error('interlaced PNGs are not supported');
            }
        } else if (type === 'PLTE') {
            palette = Buffer.from(data);
        } else if (type === 'tRNS') {
            trns = Buffer.from(data);
        } else if (type === 'IDAT') {
            idats.push(Buffer.from(data));
        } else if (type === 'IEND') {
            break;
        }
        off += 12 + len;
    }
    return { width, height, bitDepth, colour, idat: zlib.inflateSync(Buffer.concat(idats)), palette, trns };
}

/** Paeth, and the other four PNG row filters. */
function unfilter(raw: Buffer, width: number, height: number, bpp: number): Buffer {
    const stride = width * bpp;
    const out = Buffer.alloc(stride * height);
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos++];
        const row = y * stride;
        const prev = row - stride;
        for (let i = 0; i < stride; i++) {
            const x = raw[pos + i];
            const a = i >= bpp ? out[row + i - bpp] : 0;
            const b = y > 0 ? out[prev + i] : 0;
            const c = i >= bpp && y > 0 ? out[prev + i - bpp] : 0;
            let value: number;
            if (filter === 0) value = x;
            else if (filter === 1) value = x + a;
            else if (filter === 2) value = x + b;
            else if (filter === 3) value = x + ((a + b) >> 1);
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
            } else throw new Error(`unknown PNG filter ${filter}`);
            out[row + i] = value & 0xff;
        }
        pos += stride;
    }
    return out;
}

export function readPng(file: string): Image {
    const meta = inflateIdat(fs.readFileSync(file));
    if (meta.bitDepth !== 8) {
        throw new Error(`${path.basename(file)}: only 8-bit PNGs are supported (got ${meta.bitDepth})`);
    }
    const channels = meta.colour === 6 ? 4 : meta.colour === 2 ? 3 : meta.colour === 4 ? 2 : 1;
    const rows = unfilter(meta.idat, meta.width, meta.height, channels);
    const argb = new Int32Array(meta.width * meta.height);
    for (let i = 0; i < argb.length; i++) {
        const p = i * channels;
        let r: number;
        let g: number;
        let b: number;
        let a = 255;
        if (meta.colour === 6) {
            r = rows[p];
            g = rows[p + 1];
            b = rows[p + 2];
            a = rows[p + 3];
        } else if (meta.colour === 2) {
            r = rows[p];
            g = rows[p + 1];
            b = rows[p + 2];
        } else if (meta.colour === 3) {
            const idx = rows[p];
            const pal = meta.palette;
            if (pal === null) throw new Error('indexed PNG with no PLTE');
            r = pal[idx * 3];
            g = pal[idx * 3 + 1];
            b = pal[idx * 3 + 2];
            a = meta.trns !== null && idx < meta.trns.length ? meta.trns[idx] : 255;
        } else {
            r = g = b = rows[p];
            if (channels === 2) a = rows[p + 1];
        }
        argb[i] = (a << 24) | (r << 16) | (g << 8) | b;
    }
    return { width: meta.width, height: meta.height, argb };
}

// ---------------------------------------------------------------------------------------------
// Verify, crop, encode
// ---------------------------------------------------------------------------------------------

/** The contract the drawing code relies on. Anything failing here would ship as a visible defect. */
const CANVAS = 32;
const MAX_ART = 24;

type Baked = { w: number; h: number; palette: number[]; pixels: string };

function bakeIcon(name: string, image: Image, problems: string[]): Baked | null {
    if (image.width !== CANVAS || image.height !== CANVAS) {
        problems.push(`${name}: canvas is ${image.width}x${image.height}, expected ${CANVAS}x${CANVAS}`);
        return null;
    }
    let x0 = CANVAS;
    let y0 = CANVAS;
    let x1 = -1;
    let y1 = -1;
    let partial = 0;
    for (let y = 0; y < CANVAS; y++) {
        for (let x = 0; x < CANVAS; x++) {
            const a = image.argb[y * CANVAS + x] >>> 24;
            if (a !== 0 && a !== 255) {
                partial++;
            }
            if (a === 0) {
                continue;
            }
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    if (x1 < 0) {
        problems.push(`${name}: no opaque pixels at all`);
        return null;
    }
    // Binary alpha is what makes the palette encoding lossless — a soft edge would be quantised
    // to fully on or fully off here, and the icon would ship with a hard jagged fringe.
    if (partial > 0) {
        problems.push(`${name}: ${partial} semi-transparent pixel(s); alpha must be 0 or 255`);
        return null;
    }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    if (Math.max(w, h) > MAX_ART) {
        problems.push(`${name}: artwork is ${w}x${h}, longer than the ${MAX_ART}px box`);
        return null;
    }
    const colours: number[] = [];
    const index = new Map<number, number>();
    const bytes = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const argb = image.argb[(y + y0) * CANVAS + x + x0];
            if (argb >>> 24 === 0) {
                continue; // 0 stays the transparent hole
            }
            const rgb = argb & 0xffffff;
            let slot = index.get(rgb);
            if (slot === undefined) {
                colours.push(rgb);
                slot = colours.length; // 1-based; 0 is transparent
                index.set(rgb, slot);
            }
            bytes[y * w + x] = slot;
        }
    }
    if (colours.length > 255) {
        problems.push(`${name}: ${colours.length} colours, more than a byte-indexed palette holds`);
        return null;
    }
    console.log(`  ${name.padEnd(12)} art ${String(w).padStart(2)}x${String(h).padStart(2)}  ${String(colours.length).padStart(3)} colours`);
    return { w, h, palette: colours, pixels: bytes.toString('base64') };
}

// ---------------------------------------------------------------------------------------------
// Surfaces: baked as a nine-slice atlas rather than whole
// ---------------------------------------------------------------------------------------------

/**
 * The corner block a surface is sliced at. Big enough to contain the authored rounded corner
 * (radius 12) plus the lit lip and shadowed foot; small enough that two of them fit inside the
 * smallest surface in the set, a 30x37 tab plate.
 */
const SLICE = 14;

type Surface = { slice: number; palette: number[]; pixels: string };

/**
 * Reduce a panel to the 29x29 that a nine-slice actually draws from.
 *
 * A 496x50 panel is 24,800 pixels and would bake to ~33KB of base64 — for art whose middle is one
 * flat colour repeated 468 times across. Nine-slice only ever reads four corners, four one-pixel
 * edge strips and one centre pixel, so that is all that is stored: `(2 * slice + 1)` square,
 * about 1KB, and the stretch is reconstructed at draw time. It is also what makes the art usable
 * at all — the HUD's containers resize with the frame, and a fixed bitmap cannot.
 *
 * This is only sound because the middles ARE flat. The lit lip and shadowed foot live within the
 * first and last `slice` rows, so they are captured whole in the edge strips; a surface with a
 * gradient down its full height would band, which is the failure the artist's own notes describe
 * hitting and abandoning.
 */
function bakeSurface(name: string, image: Image, problems: string[]): Surface | null {
    const slice = Math.min(SLICE, (Math.min(image.width, image.height) - 1) >> 1);
    if (slice < 2) {
        problems.push(`${name}: ${image.width}x${image.height} is too small to nine-slice`);
        return null;
    }
    const size = slice * 2 + 1;
    // Source coordinate for atlas column/row i: the two corner bands verbatim, and the exact
    // middle pixel for the stretchable band.
    const map = (i: number, extent: number): number => (i < slice ? i : i > slice ? extent - (size - i) : extent >> 1);
    const colours: number[] = [];
    const index = new Map<number, number>();
    const bytes = Buffer.alloc(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const argb = image.argb[map(y, image.height) * image.width + map(x, image.width)];
            if (argb >>> 24 === 0) {
                continue;
            }
            let slot = index.get(argb);
            if (slot === undefined) {
                colours.push(argb);
                slot = colours.length;
                index.set(argb, slot);
            }
            bytes[y * size + x] = slot;
        }
    }
    if (colours.length > 255) {
        problems.push(`${name}: ${colours.length} distinct ARGB values in the slice atlas`);
        return null;
    }
    console.log(`  ${name.padEnd(24)} ${String(image.width).padStart(3)}x${String(image.height).padStart(3)} -> ${size}x${size} atlas, ${String(colours.length).padStart(3)} colours`);
    return { slice, palette: colours, pixels: bytes.toString('base64') };
}

// ---------------------------------------------------------------------------------------------

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
}
const iconDir = path.resolve(arg('--icons', 'design/icons'));
const glyphDir = path.resolve(arg('--glyphs', 'design/glyphs'));
const skinDir = path.resolve(arg('--skin', 'design/skin'));
const outPath = path.resolve(arg('--out', 'src/client/HudArtData.ts'));

const problems: string[] = [];
const icons: Record<string, Baked> = {};
console.log(`icons from ${iconDir}`);
for (const file of fs
    .readdirSync(iconDir)
    .filter(f => f.endsWith('.png'))
    .sort()) {
    const name = path.basename(file, '.png');
    const baked = bakeIcon(name, readPng(path.join(iconDir, file)), problems);
    if (baked) {
        icons[name] = baked;
    }
}

const glyphs: Record<string, string> = {};
console.log(`glyphs from ${glyphDir}`);
for (const file of fs
    .readdirSync(glyphDir)
    .filter(f => f.endsWith('.png'))
    .sort()) {
    const name = path.basename(file, '.png');
    // Still decoded, purely to hold it to the same contract — the bytes shipped are the original.
    bakeIcon(name, readPng(path.join(glyphDir, file)), problems);
    glyphs[name] = fs.readFileSync(path.join(glyphDir, file)).toString('base64');
}

const surfaces: Record<string, Surface> = {};
if (fs.existsSync(skinDir)) {
    console.log(`surfaces from ${skinDir}`);
    for (const file of fs
        .readdirSync(skinDir)
        .filter(f => f.endsWith('.png'))
        .sort()) {
        const name = path.basename(file, '.png');
        const baked = bakeSurface(name, readPng(path.join(skinDir, file)), problems);
        if (baked) {
            surfaces[name] = baked;
        }
    }
}

if (problems.length) {
    console.error('\nREFUSING TO WRITE — the art does not meet the contract the client draws it under:');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
}

const lines: string[] = [
    '// GENERATED by tools/import-art.ts — do not hand-edit.',
    '//',
    '// The hand-authored HUD art, baked in so the client needs no asset fetch — the same approach',
    '// (and the same palette-indexed encoding, index 0 = transparent) as WasdToggleData.',
    '//',
    '// ICONS are cropped to their artwork and stored as palette + one byte per pixel; HudSkin',
    '// rebuilds an ARGB buffer at first draw and centres it, with no scaling, because the art is',
    '// authored to the target size. GLYPHS are the original PNG bytes, for DOM `data:` URIs.',
    '//',
    '// Rebuild: bun tools/import-art.ts',
    'export default {',
    '    icons: {'
];
for (const [name, art] of Object.entries(icons)) {
    lines.push(`        ${name}: { w: ${art.w}, h: ${art.h}, palette: [${art.palette.map(c => '0x' + c.toString(16).padStart(6, '0')).join(', ')}], pixels: '${art.pixels}' },`);
}
lines.push('    },', '    glyphs: {');
for (const [name, data] of Object.entries(glyphs)) {
    lines.push(`        ${name}: '${data}',`);
}
lines.push('    },', '    surfaces: {');
for (const [name, art] of Object.entries(surfaces)) {
    lines.push(`        ${name}: { slice: ${art.slice}, palette: [${art.palette.map(c => '0x' + (c >>> 0).toString(16).padStart(8, '0')).join(', ')}], pixels: '${art.pixels}' },`);
}
lines.push('    }', '};', '');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`\nWrote ${Object.keys(icons).length} icon(s) and ${Object.keys(glyphs).length} glyph(s) to ${outPath}`);
