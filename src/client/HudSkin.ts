import HudArtData from '#/client/HudArtData.js';
import Pix2D from '#/graphics/Pix2D.js';
import Pix32 from '#/graphics/Pix32.js';
import PixMap from '#/graphics/PixMap.js';

/**
 * The mobile HUD's visual language — one palette, one set of radii, one set of alphas, and the
 * five primitives every drawn surface is made of.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS: EVERY DRIFT THIS HUD HAS SUFFERED WAS A CONSTANT LIVING NEXT TO ITS DRAW
 * SITE.
 * ---------------------------------------------------------------------------------------------
 *
 * The DOM buttons carried an rgba() copy of a fill the canvas had already moved off. A duplicate
 * CSS rule further down index.html kept the settings gear on a 2px rim the drawn containers had
 * dropped. "Selected" was three different colours in three places. None of those was a hard bug;
 * all of them were the same easy one, which is that there were four owners of the palette and no
 * way for any of them to know the others had changed.
 *
 * So: no colour, radius, alpha or cell metric may live anywhere else. The canvas asks this module
 * and so does the stylesheet — `publishCss` writes these very tokens onto `<body>` as custom
 * properties, which is what makes the DOM chrome and the drawn HUD the same design by construction
 * rather than by comment.
 *
 * The look is Jagex's Mobile UI Rework 2.0: warm dark stone, a hairline edge a shade LIGHTER than
 * the fill, uniform cells, and one red for "this is the thing that is open".
 *
 * DEPENDENCIES ARE DELIBERATELY TWO. This imports `Pix2D` and `PixMap` and nothing else — no
 * `Client`, no `MobileLayout`, no `ControlBar` — the same module-cycle discipline
 * `docs/display-and-settings.md` describes for `ControlBar`/`ScreenMode`. That is what lets both
 * the draw path and the layout code depend on it.
 */
export default class HudSkin {
    // -----------------------------------------------------------------------------------------
    // Tokens
    // -----------------------------------------------------------------------------------------

    /** Cluster panels: the slab behind the chat cluster and behind the right-hand column. */
    static readonly SURFACE: number = 0x3b342c;
    static readonly SURFACE_LOW: number = 0x2a251f;

    /**
     * The hairline that defines an edge — and it is LIGHTER than the fill it surrounds.
     *
     * The previous two revisions of this HUD got the sign of that wrong in both directions. First
     * `0x6b5f4a` at two pixels and more opaque than the fill, which drew a bright box round every
     * cluster; then, over-correcting, a near-black hairline, which is not what the reference looks
     * like at all. A single pixel, one step up from the surface, is the whole difference: it reads
     * as a lit edge on a stone panel instead of either a border or a shadow.
     */
    static readonly EDGE: number = 0x564c3c;

    /**
     * A cell ON a panel: chat chips, and the button faces in the left-edge stack.
     *
     * Two shades up from the surface, not one. The first pass sat at `0x4a4136` against a
     * `0x3b342c` panel — eleven levels apart, which is a difference you can measure and not one
     * you can see, so the chips read as faint rectangles ON the chat rather than as buttons over
     * it. A cell has to look like a raised thing or it is just a slightly different dark.
     */
    static readonly CELL: number = 0x5c5142;
    static readonly CELL_LOW: number = 0x483d31;

    /** The open tab, the selected chip. Red, because that is what OSRS uses for a pressed stone. */
    static readonly ACTIVE: number = 0x8c3a33;
    static readonly ACTIVE_LOW: number = 0x6b2a24;

    /** Text, and the colours a chat-mode state is reported in. */
    static readonly TEXT: number = 0xe6dcc6;
    static readonly TEXT_LIT: number = 0xfff0d2;
    static readonly TEXT_ON: number = 0x4fdc4f;
    static readonly TEXT_PART: number = 0xffc247;
    static readonly TEXT_OFF: number = 0xff6b5e;

    /**
     * Corner radii. `fillRoundedBlend` clamps each to half the shorter side, so these are maxima.
     *
     * The panel is 3, down from 12. At 12 the corner is not read as "rounded" at this size — it is
     * read as a **bite taken out of the panel**, because the two edges meeting it are long and
     * straight and the arc is short. A rectangle with the corner just knocked off looks deliberate;
     * a rectangle with a 12px quarter-circle looks damaged. Cells keep more of a curve because they
     * are small enough for the arc to be most of the corner.
     */
    static readonly R_PANEL: number = 3;
    static readonly R_CELL: number = 6;
    static readonly R_CHIP: number = 5;
    static readonly R_BAR: number = 3;

    /** The scrollbar's drawn width inside the 16px column the cache lays out for it. */
    static readonly BAR_W: number = 6;
    static readonly BAR_TRACK: number = 0x241f19;
    static readonly BAR_GRIP: number = 0x6a5f4c;

    /** Minimap ring: thickness, and a colour dark enough to read over grass. */
    static readonly RING_W: number = 2;
    static readonly RING_RGB: number = 0x1b1813;

    /** One tab stone, and the box its icon is normalised into. See `icon` and the tab strip. */
    static readonly STONE_INSET: number = 2;
    static readonly ICON_TARGET: number = 24;

    /** How much of a chat chip's height the mode control parked under it claims. */
    static readonly CHIP_STATE_H: number = 12;

    /**
     * One chip's box within a bar of `count` of them — even cells, with a hair of gutter.
     *
     * Geometry rather than layout, so it lives here with the rest of the metrics and the offline
     * preview can lay the row out exactly as the client does. What it replaces is the cache's own
     * spacing for the four labels that were here: 2 / 127 / 269 / 411 across 496, ragged, with a
     * gap on the left and none on the right — invisible while a stone strip framed them, and the
     * most obvious thing on the bar once it did not.
     */
    static chipRect(index: number, count: number, barW: number, barH: number): { x: number; y: number; w: number; h: number } {
        const cell: number = barW / count;
        return { x: Math.round(index * cell), y: 3, w: Math.round(cell) - 2, h: barH - 6 };
    }

    // -----------------------------------------------------------------------------------------
    // Alpha
    // -----------------------------------------------------------------------------------------

    /**
     * How see-through the HUD is: 0 for solid cache-style panels, higher for more world behind
     * them. Owned here rather than by `MobileLayout` because it is a property of the SKIN, and
     * because two modules holding the same number is how the palette drifted in the first place.
     * `ControlBar` writes it; `MobileLayout` reads it for the panel sprites it fades.
     */
    static trans: number = 0;

    /**
     * Is the GPU scene renderer live this frame? Published by `Client.gameDrawMain` from the same
     * expression that decides whether to punch the transparent hole, so the two can never
     * disagree.
     *
     * It decides BLEND versus TAG, and getting it wrong does not look like a subtle bug: under the
     * GPU renderer the scene is on a canvas underneath the 2D frame and the frame keeps a hole
     * where it shows through, so a blended panel composites against the hole's black and comes out
     * dark and opaque. Tagging hands the compositing to the browser, which has both layers.
     */
    static glScene: boolean = false;

    /** How much more opaque an edge is than the surface it outlines. */
    private static readonly A_EDGE: number = 20;
    /** ...a cell than the panel it sits on, and an active cell than an idle one. */
    private static readonly A_LAYER: number = 26;
    private static readonly A_LIT: number = 64;

    /**
     * The alpha a surface is drawn at: the panel setting, plus a lift for anything drawn ON one.
     *
     * THE LIFT IS NOT COSMETIC. Under the GPU renderer a translucent pixel is tagged rather than
     * blended, so a cell drawn at the panel's own alpha does not composite over the panel — it
     * REPLACES it, and comes out at exactly the weight of the surface it is supposed to be sitting
     * on. A step of alpha is what puts it back on top, and it is what the software renderer wants
     * to look like anyway.
     */
    /**
     * Lift a colour until it is legible on the HUD's surfaces, preserving its hue.
     *
     * The chatbox is authored for PARCHMENT. Its default text is black — which an earlier pass
     * remapped to white and called done — but cs2 also colours lines deliberately, and public chat
     * is a dark blue. On a dark panel that is exactly as unreadable as the black was, with the
     * added problem that it is not black, so a black-only test never sees it.
     *
     * The rule is therefore a property of the colour rather than a list of colours: anything too
     * dark is lifted toward white by however far it falls short. Blue stays blue and red stays red,
     * and anything already bright enough is returned untouched.
     */
    static readonly TEXT_MIN_LUM: number = 110;

    /**
     * The same lift, applied to the `<col=rrggbb>` tags INSIDE a string.
     *
     * A chat line is one TEXT component but not one colour: cs2 writes the sender in one and the
     * message in another, which it can only do with inline markup — so the component's own
     * `colour` field is the sender's, and the dark blue the message is drawn in never passes
     * through `readable` at all. Lifting the component colour alone fixed the half of the line
     * nobody was complaining about.
     *
     * Guarded on `indexOf` because most strings have no markup and the walk visits every one of
     * widget 137's hundred line components every frame.
     */
    static readableMarkup(text: string): string {
        if (text.indexOf('<col=') === -1) {
            return text;
        }
        return text.replace(/<col=([0-9a-fA-F]{1,6})>/g, (_match: string, hex: string): string => `<col=${HudSkin.readable(parseInt(hex, 16)).toString(16).padStart(6, '0')}>`);
    }

    static readable(rgb: number): number {
        const r: number = (rgb >> 16) & 0xff;
        const g: number = (rgb >> 8) & 0xff;
        const b: number = rgb & 0xff;
        // Rec.601 luma, integer. The eye weighs green most and blue least, which is why a "bright"
        // pure blue is in fact the darkest thing the chatbox draws.
        const lum: number = (r * 77 + g * 150 + b * 29) >> 8;
        if (lum >= HudSkin.TEXT_MIN_LUM) {
            return rgb;
        }
        const lift: number = 1 - lum / HudSkin.TEXT_MIN_LUM;
        return (((r + (255 - r) * lift) | 0) << 16) | (((g + (255 - g) * lift) | 0) << 8) | ((b + (255 - b) * lift) | 0);
    }

    static alpha(boost: number = 0): number {
        return Math.max(1, Math.min(255, 256 - HudSkin.trans + boost));
    }

    /** Blend into the frame, or tag the alpha for the browser to composite? See `glScene`. */
    static tag(alpha: number): number {
        return HudSkin.glScene ? PixMap.alphaTag(alpha) << 24 : 0;
    }

    // -----------------------------------------------------------------------------------------
    // Primitives
    // -----------------------------------------------------------------------------------------

    /**
     * Every surface in the HUD, drawn the same way: a 1px rounded outline in the edge colour, and
     * a rounded gradient fill inset by one inside it.
     *
     * Two rects rather than a stroke because `fillRoundedBlend` gives true quarter-circle corners,
     * and walking a rounded outline by hand would have to reproduce that arithmetic to stay
     * flush with it.
     */
    private static surface(x: number, y: number, w: number, h: number, radius: number, top: number, bottom: number, boost: number): void {
        if (w <= 2 || h <= 2) {
            return;
        }
        const fill: number = HudSkin.alpha(boost);
        const edge: number = Math.min(255, fill + HudSkin.A_EDGE);
        Pix2D.fillRoundedBlend(x, y, w, h, radius, HudSkin.EDGE, edge, HudSkin.tag(edge));
        Pix2D.fillRoundedBlend(x + 1, y + 1, w - 2, h - 2, radius - 1, top, fill, HudSkin.tag(fill), bottom);
    }

    /**
     * The slab behind a whole HUD cluster. DRAWN, not blitted, and that is a measured decision.
     *
     * `chatbar_backdrop.png` was wired here first and it is a faithful, well-made panel — same
     * tokens, plus a lit 2px lip and a shadowed 2px foot the procedural version does not have. It
     * came back out because of what it costs: **the authored panel is FLAT and this one ramps**
     * `SURFACE` to `SURFACE_LOW` down its height, and that ramp is most of the separation between
     * a panel and the cells sitting on it. Blitted flat, the chips came within a few levels of
     * their own background — the exact complaint that set `CELL` two shades lighter in the first
     * place.
     *
     * The artist's notes say a full-height ramp was tried and abandoned because it banded, which
     * is true of an indexed PNG with four colours in it and not true here: `fillRoundedBlend`
     * lerps per scanline, so 146 rows get 146 shades. The bitmap cannot carry the gradient and
     * the gradient is worth more than the lip.
     *
     * Cells are the other way round — see `cell`, which does use the art.
     */
    static panel(x: number, y: number, w: number, h: number): void {
        HudSkin.surface(x, y, w, h, HudSkin.R_PANEL, HudSkin.SURFACE, HudSkin.SURFACE_LOW, 0);
    }

    /**
     * One side-tab stone — the same cell the hotkey column and the chips are made of.
     *
     * This has been all three ways round, and the rule underneath is not "cells or no cells", it
     * is **cells need air**. Fourteen of them butted together on a 37px pitch tiled into a lattice:
     * the eye read the seams before the icons and the strip looked like a spreadsheet laid over
     * the game, so they were dropped and only the open tab kept a cell. Now the strip is laid out
     * like the hotkey column — 40px cells on a 44px pitch, inset from the glass — the gaps do the
     * separating and every cell can be visible again, which is what makes an idle tab read as a
     * button rather than as a sticker floating on the world.
     *
     * No inset here any more: the pitch supplies it. `STONE_INSET` was compensating for a layout
     * that had none.
     */
    static stone(x: number, y: number, w: number, h: number, active: boolean): void {
        HudSkin.cell(x, y, w, h, HudSkin.R_CELL, active);
    }

    /** A chat-mode chip, or any other cell-shaped control. */
    static chip(x: number, y: number, w: number, h: number, active: boolean): void {
        HudSkin.cell(x, y, w, h, HudSkin.R_CHIP, active);
    }

    /** A square icon button — the left-edge stack, and the hotkey slots. */
    static iconButton(x: number, y: number, w: number, h: number, active: boolean): void {
        HudSkin.cell(x, y, w, h, HudSkin.R_CELL, active);
    }

    /**
     * Every cell-shaped control: a chip, a stack button, the open tab's stone.
     *
     * The authored tab plates serve all of them, because they ARE this shape — a rounded cell in
     * the active red or the idle cell colour, which is what the palettes bake out to. Note that
     * an idle STONE never reaches here: `stone` returns early, so the idle plate is used for chips
     * and buttons, where a visible cell is wanted, and not for the tab strip, where fourteen of
     * them were the lattice.
     */
    private static cell(x: number, y: number, w: number, h: number, radius: number, active: boolean): void {
        if (HudSkin.surface9(active ? 'tabplate_wide' : 'tabplate_wide_idle', x, y, w, h, HudSkin.alpha(active ? HudSkin.A_LIT : HudSkin.A_LAYER))) {
            return;
        }
        if (active) {
            HudSkin.surface(x, y, w, h, radius, HudSkin.ACTIVE, HudSkin.ACTIVE_LOW, HudSkin.A_LIT);
        } else {
            HudSkin.surface(x, y, w, h, radius, HudSkin.CELL, HudSkin.CELL_LOW, HudSkin.A_LAYER);
        }
    }

    /**
     * A scrollbar arrow: a small solid triangle, centred in the 16px column.
     *
     * The cache's arrows are stone buttons the width of a finger. This keeps the affordance —
     * something is clickable here, and it points the way it scrolls — at the weight of a caret.
     */
    static chevron(x: number, y: number, w: number, h: number, up: boolean): void {
        const alpha: number = HudSkin.alpha(HudSkin.A_LIT);
        const tag: number = HudSkin.tag(alpha);
        const rows: number = 4;
        const cx: number = x + (w >> 1);
        const top: number = y + ((h - rows) >> 1);
        for (let i = 0; i < rows; i++) {
            // Widest at the base, one pixel at the point, so it reads as an arrowhead at 4px tall.
            const span: number = up ? i + 1 : rows - i;
            const row: number = top + i;
            Pix2D.fillRoundedBlend(cx - span, row, span * 2, 1, 0, HudSkin.BAR_GRIP, alpha, tag);
        }
    }

    // -----------------------------------------------------------------------------------------
    // Authored surfaces, stretched
    // -----------------------------------------------------------------------------------------

    private static readonly surfaceCache: Map<string, { size: number; slice: number; argb: Int32Array } | null> = new Map();
    /** Reused across calls so a per-frame panel blit allocates nothing. */
    private static colMap: Int32Array = new Int32Array(0);
    private static rowMap: Int32Array = new Int32Array(0);

    /**
     * Blit a baked surface at any size, nine-slice: corners verbatim, edges and middle stretched.
     *
     * THIS IS WHAT MAKES AUTHORED ART USABLE HERE AT ALL. The HUD's containers are sized by the
     * layout — the chat cluster is 496 wide, the right column 258, and both change with the frame
     * — so a fixed bitmap of a 496x50 bar can back exactly one of them. Slicing it means the
     * corner radius, the lit lip and the shadowed foot are drawn from the art at their authored
     * scale, and only the flat parts stretch, which is invisible because they are flat.
     *
     * The atlas holds just the 29x29 the slice reads from (see tools/import-art.ts), so the
     * "stretch" is a lookup table per axis rather than any sampling: `colMap[dx]` is which atlas
     * column that destination column takes. Returns false when the art was never baked, which is
     * how every caller keeps its procedural fallback.
     */
    static surface9(name: string, x: number, y: number, w: number, h: number, alpha: number): boolean {
        const art = HudSkin.bakedSurface(name);
        if (art === null || w <= 0 || h <= 0) {
            return false;
        }
        // Corners must fit twice over, or opposite corners would overlap and mirror each other.
        const slice: number = Math.min(art.slice, (w - 1) >> 1, (h - 1) >> 1);
        if (slice < 1) {
            return false;
        }
        const cols: Int32Array = HudSkin.sliceMap(true, w, slice, art.size);
        const rows: Int32Array = HudSkin.sliceMap(false, h, slice, art.size);
        const scale: number = Math.max(0, Math.min(256, alpha)) / 256;
        for (let dy = 0; dy < h; dy++) {
            const py: number = y + dy;
            if (py < Pix2D.clipMinY || py >= Pix2D.clipMaxY) {
                continue;
            }
            const row: number = rows[dy] * art.size;
            const dest: number = py * Pix2D.width;
            for (let dx = 0; dx < w; dx++) {
                const px: number = x + dx;
                if (px < Pix2D.clipMinX || px >= Pix2D.clipMaxX) {
                    continue;
                }
                const src: number = art.argb[row + cols[dx]];
                const a: number = Math.round((src >>> 24) * scale);
                if (a > 0) {
                    HudSkin.composite(dest + px, src, a);
                }
            }
        }
        return true;
    }

    /** Which atlas row/column each destination row/column reads from. */
    private static sliceMap(horizontal: boolean, extent: number, slice: number, size: number): Int32Array {
        let map: Int32Array = horizontal ? HudSkin.colMap : HudSkin.rowMap;
        if (map.length < extent) {
            map = new Int32Array(extent);
            if (horizontal) {
                HudSkin.colMap = map;
            } else {
                HudSkin.rowMap = map;
            }
        }
        for (let i = 0; i < extent; i++) {
            map[i] = i < slice ? i : i >= extent - slice ? size - (extent - i) : slice;
        }
        return map;
    }

    /** The baked atlas for a surface, decoded once. */
    private static bakedSurface(name: string): { size: number; slice: number; argb: Int32Array } | null {
        const cached = HudSkin.surfaceCache.get(name);
        if (cached !== undefined) {
            return cached;
        }
        const art = (HudArtData.surfaces as Record<string, { slice: number; palette: number[]; pixels: string } | undefined>)[name];
        if (art === undefined) {
            HudSkin.surfaceCache.set(name, null);
            return null;
        }
        const packed: string = atob(art.pixels);
        const size: number = art.slice * 2 + 1;
        const argb = new Int32Array(size * size);
        for (let i = 0; i < argb.length; i++) {
            const slot: number = packed.charCodeAt(i);
            argb[i] = slot === 0 ? 0 : art.palette[slot - 1];
        }
        const built = { size, slice: art.slice, argb };
        HudSkin.surfaceCache.set(name, built);
        return built;
    }

    /**
     * A scrollbar track or grip: a slim rounded bar down the middle of the 16px column the cache
     * reserves, in place of two arrow sprites, a filled track and four bevel lines per grip.
     */
    static bar(x: number, y: number, w: number, h: number, grip: boolean): void {
        if (h <= 0) {
            return;
        }
        const boost: number = grip ? HudSkin.A_LIT : HudSkin.A_LAYER;
        const alpha: number = HudSkin.alpha(boost);
        const width: number = Math.min(w, HudSkin.BAR_W);
        Pix2D.fillRoundedBlend(x + ((w - width) >> 1), y, width, h, HudSkin.R_BAR, grip ? HudSkin.BAR_GRIP : HudSkin.BAR_TRACK, alpha, HudSkin.tag(alpha));
    }

    /** One normalised icon: premultiplied-by-nothing ARGB, alpha in the top byte. */
    private static readonly iconCache: WeakMap<Pix32, { w: number; h: number; argb: Int32Array }> = new WeakMap();

    /**
     * One tab icon, centred on a point and capped to the family's size.
     *
     * WHAT IS ACTUALLY WRONG WITH THE CACHE'S ICONS, measured rather than assumed
     * (`bun tools/dump-sprites.ts --bbox 168 898-910` in the server repo): all fourteen share a
     * 32x36 canvas, but their opaque content ranges from **19x28 to 31x30** — a 2.3x spread in
     * area — and each sits at its own offset inside that canvas, so their centres disagree too.
     * Combat is a 20x20 mark next to a 31x30 rucksack. That is the whole of "the icons don't match
     * each other"; the stones around them were only ever half of it.
     *
     * The cache format helps: each frame is stored **tightly cropped** plus an (xof, yof) into the
     * canvas — verified, opaque extent equals frame extent for all fourteen — so the content box
     * needs no scanning. It is `wi x hi`.
     *
     * ---------------------------------------------------------------------------------------
     * WHY THIS DOES ITS OWN RESAMPLING AND ITS OWN BLIT
     * ---------------------------------------------------------------------------------------
     *
     * The first attempt handed the work to `transScalePlotSprite`, which is **nearest-neighbour**:
     * downscaling 31 pixels into 24 does not average anything, it DELETES seven rows and seven
     * columns. On a detailed 20-year-old icon that reads as damage — chewed edges, dropped
     * highlights — and it was visible on exactly the icons that got scaled and no others.
     *
     * So each icon is resampled ONCE, with a proper area filter, into a small ARGB buffer that is
     * then blitted 1:1 forever after. Cost is a few thousand multiply-adds per icon on first
     * draw, against fourteen icons for the life of the process; per frame it is cheaper than what
     * it replaced, because there is no scaling in the blit at all.
     *
     * With a real filter in place, everything is fitted to the target — up as well as down — and
     * the family becomes one size instead of a 19-to-32 spread. The single exception is the
     * **one-pixel rule**: a 23px icon "corrected" to 24 would pay a little sharpness across every
     * pixel to gain nothing anyone can see, so anything already within a pixel of the target keeps
     * its own art exactly. Downscale-only was tried first and left the smallest icons visibly
     * short of the rest, which was the complaint that started this.
     */
    static icon(image: Pix32, cx: number, cy: number, alpha: number = 256, name: string | null = null): boolean {
        const fitted = (name !== null ? HudSkin.bakedIcon(name) : null) ?? HudSkin.fitIcon(image);
        if (fitted === null) {
            return false;
        }
        HudSkin.blitIcon(fitted.argb, fitted.w, fitted.h, cx - (fitted.w >> 1), cy - (fitted.h >> 1), alpha);
        return true;
    }

    /**
     * A hand-authored replacement icon, if one was baked for this tab.
     *
     * NOT RESAMPLED, EVER — unlike the cache art, which has to be measured and fitted because its
     * fourteen icons disagree about size by a factor of 2.3. These are authored to the target box
     * with binary alpha and verified against it at build time (`tools/import-art.ts` refuses to
     * write art that misses the contract), so the only thing left to do is centre them. Running
     * them through the fitter would resample art that is already the right size, which can only
     * lose sharpness.
     *
     * Decoded once per icon, on first draw, from the palette-indexed form — the same trick
     * `WasdToggle` uses, and the reason the client needs no PNG decoder.
     */
    private static bakedIcon(name: string): { w: number; h: number; argb: Int32Array } | null {
        const cached = HudSkin.bakedCache.get(name);
        if (cached !== undefined) {
            return cached;
        }
        const art = (HudArtData.icons as Record<string, { w: number; h: number; palette: number[]; pixels: string } | undefined>)[name];
        if (art === undefined) {
            HudSkin.bakedCache.set(name, null);
            return null;
        }
        const packed: string = atob(art.pixels);
        const argb = new Int32Array(art.w * art.h);
        for (let i = 0; i < argb.length; i++) {
            const slot: number = packed.charCodeAt(i);
            // Index 0 is the transparent hole; palette entry n is index n + 1.
            argb[i] = slot === 0 ? 0 : 0xff000000 | art.palette[slot - 1];
        }
        const built = { w: art.w, h: art.h, argb };
        HudSkin.bakedCache.set(name, built);
        return built;
    }

    private static readonly bakedCache: Map<string, { w: number; h: number; argb: Int32Array } | null> = new Map();

    /** A baked control glyph as a `data:` URI, for the DOM buttons. Empty if it was not baked. */
    static glyphUri(name: string): string {
        const data = (HudArtData.glyphs as Record<string, string | undefined>)[name];
        return data === undefined ? '' : `data:image/png;base64,${data}`;
    }

    /** The normalised form of this sprite, built on first sight and kept for the process. */
    private static fitIcon(image: Pix32): { w: number; h: number; argb: Int32Array } | null {
        const cached = HudSkin.iconCache.get(image);
        if (cached !== undefined) {
            return cached;
        }
        const sw: number = image.wi;
        const sh: number = image.hi;
        // The frame's pixels are `data`, `wi * hi` of them, declared on the concrete
        // SoftwarePix32 rather than on Pix32 (`SoftwarePix32.ts:186`). Reading it structurally
        // keeps this module off the renderer classes — importing SoftwarePix32 for a field would
        // drag Pix3D and the whole software rasteriser in behind it. Anything that does not
        // present a usable buffer simply falls back to the engine's own blit.
        const src: Int32Array | null = (image as unknown as { data?: Int32Array }).data ?? null;
        if (sw <= 0 || sh <= 0 || src === null || src.length < sw * sh) {
            return null;
        }
        const longest: number = Math.max(sw, sh);
        const scale: number = HudSkin.ICON_TARGET / longest;
        let dw: number = Math.max(1, Math.round(sw * scale));
        let dh: number = Math.max(1, Math.round(sh * scale));
        // NEVER RESAMPLE FOR A ONE-PIXEL CHANGE. Every filtered pixel costs a little sharpness,
        // and a 23px icon "corrected" to 24 pays that across the whole image to gain nothing the
        // eye can see. Anything already within a pixel of the target keeps its own art exactly.
        if (Math.abs(dw - sw) <= 1 && Math.abs(dh - sh) <= 1) {
            dw = sw;
            dh = sh;
        }
        const fitted = { w: dw, h: dh, argb: dw === sw && dh === sh ? HudSkin.opaqueCopy(src, sw, sh) : HudSkin.resample(src, sw, sh, dw, dh) };
        HudSkin.iconCache.set(image, fitted);
        return fitted;
    }

    /** Cache pixels are `0` for transparent and `0xrrggbb` otherwise; tag the rest fully opaque. */
    private static opaqueCopy(src: Int32Array, w: number, h: number): Int32Array {
        const out = new Int32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            out[i] = src[i] === 0 ? 0 : (src[i] & 0xffffff) | 0xff000000;
        }
        return out;
    }

    /**
     * Box-filter downscale with coverage as alpha.
     *
     * Each destination pixel integrates the source rectangle it covers, weighting every source
     * pixel by how much of it falls inside. Two details matter:
     *
     * - **Colour is averaged over the OPAQUE samples only** (`cov`), not over the whole box.
     *   Averaging in the transparent ones would drag every edge toward black, which is the classic
     *   dark fringe around a naively resized sprite.
     * - **Alpha is the coverage ratio** — opaque weight over total weight — so a destination pixel
     *   half-covered by the icon comes out half-transparent. That is what gives a smooth edge, and
     *   it is why this cannot be stored back into a cache sprite: the engine's sprite format has
     *   one transparent colour and no alpha channel at all.
     */
    private static resample(src: Int32Array, sw: number, sh: number, dw: number, dh: number): Int32Array {
        const out = new Int32Array(dw * dh);
        const xRatio: number = sw / dw;
        const yRatio: number = sh / dh;
        for (let dy = 0; dy < dh; dy++) {
            const sy0: number = dy * yRatio;
            const sy1: number = sy0 + yRatio;
            const yStart: number = Math.floor(sy0);
            const yEnd: number = Math.min(sh - 1, Math.ceil(sy1) - 1);
            for (let dx = 0; dx < dw; dx++) {
                const sx0: number = dx * xRatio;
                const sx1: number = sx0 + xRatio;
                const xStart: number = Math.floor(sx0);
                const xEnd: number = Math.min(sw - 1, Math.ceil(sx1) - 1);
                let r = 0;
                let g = 0;
                let b = 0;
                let cov = 0;
                let total = 0;
                for (let y = yStart; y <= yEnd; y++) {
                    const wy: number = Math.min(y + 1, sy1) - Math.max(y, sy0);
                    if (wy <= 0) {
                        continue;
                    }
                    for (let x = xStart; x <= xEnd; x++) {
                        const wx: number = Math.min(x + 1, sx1) - Math.max(x, sx0);
                        if (wx <= 0) {
                            continue;
                        }
                        const weight: number = wx * wy;
                        total += weight;
                        const p: number = src[y * sw + x];
                        if (p === 0) {
                            continue;
                        }
                        cov += weight;
                        r += ((p >> 16) & 0xff) * weight;
                        g += ((p >> 8) & 0xff) * weight;
                        b += (p & 0xff) * weight;
                    }
                }
                if (cov <= 0 || total <= 0) {
                    continue;
                }
                const a: number = Math.min(255, Math.round((cov / total) * 255));
                out[dy * dw + dx] = (a << 24) | (Math.round(r / cov) << 16) | (Math.round(g / cov) << 8) | Math.round(b / cov);
            }
        }
        return out;
    }

    /**
     * Blit a normalised icon with per-pixel alpha.
     *
     * The engine's own sprite blits cannot do this — a cache sprite is opaque or absent — so the
     * antialiased edge the resampler produces needs its own loop. It is a handful of pixels per
     * icon and it runs inside the interface draw, which is already walking every component.
     *
     * THE DESTINATION'S ALPHA TAG IS COMPOSITED, NOT OVERWRITTEN. Under the GPU renderer the top
     * byte of a frame pixel is the alpha the browser will composite with (see PixMap), and an icon
     * lands on a translucent HUD panel. Writing an opaque icon pixel must clear that tag, or the
     * icon inherits the panel's translucency; writing a half-covered EDGE pixel must combine the
     * two, or the edge either punches an opaque hole in the panel or vanishes into it. So the two
     * alphas are composited the same way their colours are.
     */
    private static blitIcon(argb: Int32Array, w: number, h: number, x: number, y: number, alpha: number): void {
        const scale: number = Math.max(0, Math.min(256, alpha)) / 256;
        for (let row = 0; row < h; row++) {
            const py: number = y + row;
            if (py < Pix2D.clipMinY || py >= Pix2D.clipMaxY) {
                continue;
            }
            for (let col = 0; col < w; col++) {
                const px: number = x + col;
                if (px < Pix2D.clipMinX || px >= Pix2D.clipMaxX) {
                    continue;
                }
                const p: number = argb[row * w + col];
                const a: number = Math.round((p >>> 24) * scale);
                if (a > 0) {
                    HudSkin.composite(py * Pix2D.width + px, p, a);
                }
            }
        }
    }

    /**
     * One source pixel over one frame pixel — colour and alpha tag both.
     *
     * THE DESTINATION'S ALPHA TAG IS COMPOSITED, NOT OVERWRITTEN. Under the GPU renderer the top
     * byte of a frame pixel is the alpha the browser will composite with (see PixMap), and this
     * art lands on a translucent HUD panel. Writing an opaque pixel must clear that tag, or the
     * icon inherits the panel's translucency; writing a half-covered EDGE pixel must combine the
     * two, or the edge either punches an opaque hole in the panel or dissolves into it. So the two
     * alphas composite the same way the colours do.
     */
    private static composite(index: number, src: number, a: number): void {
        const dst: number = Pix2D.pixels[index];
        // Tag 0 means opaque, so the destination's effective alpha is 255 unless it is tagged.
        const dstTag: number = (dst >>> 24) & 0xff;
        const dstAlpha: number = dstTag === 0 ? 255 : dstTag;
        let rgb: number;
        if (a >= 255) {
            rgb = src & 0xffffff;
        } else {
            const inv: number = 255 - a;
            const r: number = (((src >> 16) & 0xff) * a + ((dst >> 16) & 0xff) * inv) / 255;
            const g: number = (((src >> 8) & 0xff) * a + ((dst >> 8) & 0xff) * inv) / 255;
            const b: number = ((src & 0xff) * a + (dst & 0xff) * inv) / 255;
            rgb = ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
        }
        const outAlpha: number = a + (((dstAlpha * (255 - a)) / 255) | 0);
        Pix2D.pixels[index] = rgb | (outAlpha >= 255 ? 0 : outAlpha << 24);
    }

    // -----------------------------------------------------------------------------------------
    // The minimap's shape
    // -----------------------------------------------------------------------------------------

    /**
     * Per-row runs describing the widest circle that fits a `w` x `h` box.
     *
     * The engine's mask format: `offsets[row]` is where the run starts, `lengths[row]` how long it
     * is, and `scanlinePlotSprite` / `fillScanLine` / `scanlineRotatePlotSprite` all blit through
     * it. Which is the useful part — hand this to the minimap and the map image, every dot, every
     * hint arrow and the destination flag are all clipped to the circle by the same runs, with no
     * per-consumer culling to get wrong.
     */
    static circleMask(w: number, h: number): { offsets: Int32Array; lengths: Int32Array } {
        const r: number = w >> 1;
        const cx: number = r;
        const cy: number = h >> 1;
        const offsets = new Int32Array(h);
        const lengths = new Int32Array(h);
        for (let y = 0; y < h; y++) {
            const dy: number = y - cy;
            const span: number = r * r - dy * dy;
            if (span < 0) {
                continue;
            }
            const half: number = Math.sqrt(span) | 0;
            offsets[y] = cx - half;
            lengths[y] = half * 2;
        }
        return { offsets, lengths };
    }

    /**
     * Outline a mask — the minimap's ring, for the mode that draws no stone surround.
     *
     * Traced from the mask's OWN per-row runs, the very runs the map is filled through, so the
     * ring cannot drift off the map's edge at any row whatever the mask turns out to be. Deriving
     * a circle from a radius here instead would be a second, independently-wrong idea of where the
     * map ends — and the two masks in play (the cache's irregular cut-out and the true circle) do
     * not agree, so it would be wrong for at least one of them.
     *
     * Each row draws the two vertical stubs either side of its run, and where consecutive rows
     * differ in width the horizontal jump between them is filled too — that is what closes the
     * outline across the shallow top and bottom of a circle instead of leaving it a dotted comb.
     *
     * THE TWO CAPS ARE DRAWN EXPLICITLY, and leaving them out is what made the ring look broken at
     * the ends. The step-fill only runs BETWEEN two traced rows, so the first traced row has
     * nothing above it to join to and the last has nothing below — and on a circle those are the
     * rows whose width changes fastest, so each left a horizontal gap tens of pixels wide at the
     * very top and very bottom. Zero-length rows are skipped, so the true first and last are found
     * rather than assumed.
     *
     * THE RING IS DRAWN INSIDE THE MASK, over the map's own outermost pixels, and that is not a
     * style choice. An outward ring needs `t` pixels of room beyond the shape on every side, and
     * the minimap has none: the layout welds it to the frame's right edge, so the outward version
     * had its 3-o'clock arc sliced off by the edge of the screen. Inside, the outline is bounded
     * by the shape itself and cannot be clipped by anything the shape fits in.
     *
     * The caller owns the clip: this widens nothing and restores nothing.
     */
    static ring(x: number, y: number, offsets: Int32Array, lengths: Int32Array, height: number): void {
        const t: number = HudSkin.RING_W;
        const rgb: number = HudSkin.RING_RGB;
        let prevLeft: number = -1;
        let prevRight: number = -1;
        let lastRow: number = -1;
        for (let row: number = 0; row < height && row < lengths.length; row++) {
            const length: number = lengths[row];
            if (length <= 0) {
                continue;
            }
            const left: number = x + offsets[row];
            const right: number = left + length;
            Pix2D.fillRect(left, y + row, Math.min(t, length), 1, rgb);
            Pix2D.fillRect(right - Math.min(t, length), y + row, Math.min(t, length), 1, rgb);
            if (prevLeft === -1) {
                // First run: cap it, or the crown of the circle is an open arc.
                Pix2D.fillRect(left, y + row, length, t, rgb);
            } else {
                // Close the horizontal step to the row above, in whichever direction it moved.
                Pix2D.fillRect(Math.min(left, prevLeft), y + row, Math.abs(left - prevLeft) + t, 1, rgb);
                Pix2D.fillRect(Math.min(right, prevRight) - t, y + row, Math.abs(right - prevRight) + t, 1, rgb);
            }
            prevLeft = left;
            prevRight = right;
            lastRow = row;
        }
        if (lastRow !== -1) {
            Pix2D.fillRect(prevLeft, y + lastRow - t + 1, prevRight - prevLeft, t, rgb);
        }
    }

    // -----------------------------------------------------------------------------------------
    // The stylesheet half
    // -----------------------------------------------------------------------------------------

    /** `0xrrggbb` plus a 0-256 alpha as a CSS colour. */
    private static rgba(rgb: number, alpha: number): string {
        const a: number = Math.round((Math.min(256, alpha) / 256) * 100) / 100;
        return `rgba(${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff},${a})`;
    }

    /** `0xrrggbb` as `#rrggbb`. */
    private static hex(rgb: number): string {
        return '#' + (rgb & 0xffffff).toString(16).padStart(6, '0');
    }

    /**
     * Publish the palette to CSS, so `#mobile-bar button` and the settings gear are painted from
     * the same numbers as the canvas.
     *
     * Re-published whenever the alpha setting changes, because the DOM chrome's translucency has
     * to track the HUD's or the buttons float at a different weight to the panels beside them.
     */
    /**
     * The cell both HUD clusters are drawn at, in CSS pixels, for the DOM buttons to match.
     *
     * Pushed in by `Client` rather than computed here, because the size lives in `HudStrip` and
     * this module is the one thing in the HUD that imports nothing from the client at all. It is
     * the only non-colour token `publishCss` writes, and it is here for the same reason the
     * colours are: so there is one definition and the stylesheet reads it, instead of a number in
     * a CSS rule that has to be remembered whenever the drawn one changes.
     */
    static cellCss: number = 44;

    /**
     * The safe-area insets the HUD is actually honouring, in CSS pixels, for the DOM stack.
     *
     * The stylesheet used to read `env(safe-area-inset-left)` itself. That is the same number
     * right up until it isn't: the canvas HUD scales the side insets by `ScreenMode.edgeMargin`
     * and `env()` knows nothing about it, so the drawn column would pull out to the glass and the
     * buttons beside it would stay put. Publishing the resolved value is what keeps one number.
     */
    static safeLeftCss: number = 0;
    static safeBottomCss: number = 0;

    static publishCss(root: HTMLElement | null): void {
        if (root === null) {
            return;
        }
        const layer: number = HudSkin.alpha(HudSkin.A_LAYER);
        const lit: number = HudSkin.alpha(HudSkin.A_LIT);
        const vars: [string, string][] = [
            // The shared cell, in CSS pixels — see the note on `cellCss`.
            ['--hud-cell-size', HudSkin.cellCss + 'px'],
            ['--hud-safe-left', HudSkin.safeLeftCss + 'px'],
            ['--hud-safe-bottom', HudSkin.safeBottomCss + 'px'],
            ['--hud-surface', HudSkin.rgba(HudSkin.SURFACE, HudSkin.alpha())],
            ['--hud-cell', HudSkin.rgba(HudSkin.CELL, layer)],
            ['--hud-active', HudSkin.rgba(HudSkin.ACTIVE, lit)],
            ['--hud-edge', HudSkin.rgba(HudSkin.EDGE, Math.min(255, layer + HudSkin.A_EDGE))],
            ['--hud-text', HudSkin.hex(HudSkin.TEXT)],
            ['--hud-text-lit', HudSkin.hex(HudSkin.TEXT_LIT)],
            ['--hud-radius', `${HudSkin.R_CELL}px`]
        ];
        for (const [name, value] of vars) {
            root.style.setProperty(name, value);
        }
    }
}
