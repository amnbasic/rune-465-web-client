/**
 * The side tab strip's geometry — the two columns of stones on the right edge, and the side panel
 * they stand beside.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS IS ITS OWN MODULE AND NOT A BLOCK IN `MobileLayout`
 * ---------------------------------------------------------------------------------------------
 *
 * Two reasons, and the second is the one that matters.
 *
 * 1. The strip is the only part of the HUD whose SIZE depends on the frame. Everything else in
 *    `MobileLayout.ANCHORS` is a fixed inset that the engine's alignment pass resolves against
 *    whatever frame it is handed — genuinely size-independent, which is the whole point of that
 *    table. The strip cannot be: seven stones at a 44pt target plus a 156px minimap do not fit in
 *    the ~430px frame a phone gives you, so the cell has to be computed rather than authored.
 *
 * 2. `tools/verify-mobile-anchors.ts` is the tool that has caught every real overlap in this HUD,
 *    and it works by reading the shipped table out of the source and running the engine's layout
 *    arithmetic over it. A computed cell would be invisible to a source-text parser, so the tool
 *    would go on verifying numbers the client no longer uses — the worst possible failure for a
 *    verifier, because it keeps reporting OK. It therefore imports this module and asks for the
 *    same anchors the client uses.
 *
 * Which is why this file imports NOTHING. It is the bottom of the dependency chain: `HotkeyBar`
 * reads its cell from here, `MobileLayout` reads its anchors from here, and both tools can import
 * it. (`MobileLayout` cannot be imported by a tool at all — it reaches `IfType`, which touches
 * `window` at module scope — and that is the constraint that decided this file's shape.)
 *
 * ---------------------------------------------------------------------------------------------
 * ONE CELL, BOTH CLUSTERS
 * ---------------------------------------------------------------------------------------------
 *
 * The hotkey column on the left and the tab strip on the right are drawn by different code in
 * different coordinate spaces, and for a while they were also sized by different rules — 44 for
 * one, whatever fit for the other. On a desktop they agreed and on a phone they did not, which is
 * visible instantly as two grids of different-sized buttons facing each other across the screen.
 *
 * So there is one cell size and both use it. It is the largest that satisfies every constraint
 * below, which means the binding one wins for both clusters: on a phone the minimap squeezes the
 * tab column, and the hotkeys come down to match rather than staying big and breaking the
 * symmetry.
 */

/** Safe-area padding in frame pixels. Structurally `MobileLayout.SafeInsets`, redeclared to keep the dependency one-way. */
export type StripInsets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

/** One entry of `MobileLayout.ANCHORS`. Same shape, by contract — `MobileLayout` re-exports the type it actually uses. */
export type StripAnchor = {
    com: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    xa?: number;
    ya?: number;
    wa?: number;
    ha?: number;
    layer?: number;
    hide?: boolean;
    edge?: boolean;
};

// The engine's alignment codes (Client.computeComponentPosition / computeComponentSize). Defined
// here rather than in `MobileLayout` because the dependency runs this way: that file imports these.
export const X_LEFT: number = 0;
export const X_CENTRE: number = 1;
export const X_RIGHT: number = 2;
export const Y_TOP: number = 0;
export const Y_BOTTOM: number = 2;
/** widthAlignment/heightAlignment 1: render size = parent size - the authored size. Size 0 fills. */
export const FILL: number = 1;

/** The overlay host every HUD piece is re-hung on, so the frame-sized scene cannot paint over it. */
const HOST: number = 71;

/**
 * Seven stones in one column and six in the other.
 *
 * Six, not seven, because the cache's first cell of that row is the Clan Chat slot and in this
 * revision it is dead — `com_13` has sprite −1, no ops and no hooks. It is hidden, which moves the
 * six real tabs up a slot and leaves the hole at the BOTTOM, where a grid with room in it reads
 * better than an icon that failed to load.
 */
export const ROWS_TALL: number = 7;
export const ROWS_SHORT: number = 6;

/** Air between a cell and its column's edge, each side, in frame pixels at every scale. */
const PAD: number = 2;

/** The side panel, at its cache size. It keeps that size; only its inset moves with the strip. */
export const PANEL_W: number = 190;
export const PANEL_H: number = 261;

/**
 * The minimap's height, and the only reason the cell is not simply the hotkey cell.
 *
 * `com_72` is 190x156 in the top-right corner and it is drawn AFTER `com_71` (index order), so a
 * stone that reaches up into it is painted over and lost. The strip therefore may not grow past
 * the map — it must stay in the band between the map's bottom and the bottom of the frame.
 *
 * That band is generous on a desktop and tight on a phone, which is exactly why the cell is
 * computed. See `geometry` for what happens when the band cannot hold the floor size.
 */
export const MAP_H: number = 156;

/**
 * Off the right edge and the bottom, in CSS pixels — the same 8 the DOM button stack uses
 * (`--hud-stack-x` is `safe-area-inset-left + 8px`), so the two clusters sit the same distance
 * off the glass on the two sides of the screen.
 */
export const EDGE_CSS: number = 8;

/**
 * The cell both clusters aim for, and the air between cells, in CSS pixels.
 *
 * 44 is Apple's minimum touch target and the size of the DOM buttons already on screen. It is a
 * ceiling rather than a promise — see `geometry` for what takes it away.
 */
export const CELL_CSS: number = 44;
export const GAP_CSS: number = 4;

/** The hotkey column: five slots, 60 in from the left edge, 52 up from the bottom. */
export const HOTKEY_ROWS: number = 5;
export const HOTKEY_X_CSS: number = 60;
export const HOTKEY_BOTTOM_CSS: number = 52;

/**
 * The chat cluster's height — the 34-tall chip row plus the 96-tall chatbox.
 *
 * A CONSTANT RATHER THAN A LIVE READ, deliberately. `MobileLayout.chatClusterBottom()` knows the
 * real number, but it is only valid after the layout pass this feeds, and it goes to zero when the
 * chatbox is collapsed — so using it would resize every button on screen each time you hid the
 * chat. Sizing for the chat being up is the stable choice and the conservative one.
 */
export const CHAT_H: number = 130;

/**
 * The smallest cell either cluster will use, in frame pixels.
 *
 * This used to be 36, the size the strip shipped at, on the reasoning that no frame should get
 * smaller stones than it already had. That was wrong, and a phone showed why: a floor ABOVE what
 * the frame can hold does not keep the stones usable, it just pushes the top one under the
 * minimap, where it is painted over and cannot be tapped at all. A tab you can see and press at 31
 * beats a tab at 36 that is not there. The floor's only job is to stop the arithmetic collapsing
 * to nothing on an absurd frame.
 */
export const FLOOR: number = 28;

export type Strip = {
    /** The square stone. */
    cell: number;
    /** Between stones. */
    gap: number;
    /** Off the right edge and the bottom. */
    edge: number;
    /** One column: the cell plus its air. */
    col: number;
    /** How far in from the right edge the whole strip reaches — where the panel's right edge goes. */
    footprint: number;
};

/**
 * The strip's metrics for a given frame, in FRAME pixels.
 *
 * THE TARGET IS THE HOTKEY CELL, not a number of its own: the request this implements was for the
 * two clusters to be spaced alike, and they are specified in the same space — CSS pixels, divided
 * by the presentation scale here exactly as `HotkeyBar` does it. So they match physically, on
 * glass, rather than matching as numbers in a table and diverging on any device that is not 1:1.
 *
 * THREE CONSTRAINTS, and the smallest wins for BOTH clusters:
 *
 *   (a) THE MINIMAP, over the tab strip. Seven cells, six gaps and the bottom inset have to fit
 *       between the map's bottom edge and the bottom of the frame. Binding on every phone: at 44
 *       the column is 332 tall, and 332 + 156 + 8 = 496 against a landscape iPhone's ~430. This is
 *       the one that decides it in practice, and the one whose absence put the Combat tab under
 *       the map.
 *
 *   (b) THE CHAT CLUSTER, over the hotkey column. Five cells, four gaps and the 52 it stands off
 *       the bottom have to fit below the chat. Rarely binding — five is not seven — but it is what
 *       stops the top slot being drawn across the chatbox, which is a real thing that happened.
 *
 *   (c) THE CHATBOX'S WIDTH, over the side panel. The panel is right-anchored behind the strip, so
 *       a wider strip pushes it left, and on a short frame it comes down beside the chat rather
 *       than below it. NOT checked, because (a) makes it unreachable: the panel only reaches the
 *       chat's rows when the frame is under ~399 tall, and at that height (a) has already pulled
 *       the cell well below the size whose footprint clears a 496-wide chat. Narrower than ~762
 *       and no cell size helps — 496 + 190 + 76 is 762 — so the chat and the panel share ground,
 *       which they already did and which no arithmetic here can fix.
 */
export function geometry(frameW: number, frameH: number, insets: StripInsets, scale: number): Strip {
    void frameW;
    const px = (css: number): number => Math.round(css / Math.max(0.05, scale));
    const gap: number = px(GAP_CSS);
    const edge: number = px(EDGE_CSS);

    // (a) the tab strip, between the minimap and the bottom of the frame
    const tabs: number = frameH - insets.top - insets.bottom - edge - MAP_H - (ROWS_TALL - 1) * gap;
    // (b) the hotkey column, between the chat cluster and the bottom of the frame
    const keys: number = frameH - insets.top - insets.bottom - px(HOTKEY_BOTTOM_CSS) - CHAT_H - (HOTKEY_ROWS - 1) * gap;

    const fits: number = Math.min(Math.floor(tabs / ROWS_TALL), Math.floor(keys / HOTKEY_ROWS));
    const cell: number = Math.max(FLOOR, Math.min(px(CELL_CSS), fits));
    const col: number = cell + 2 * PAD;
    return { cell, gap, edge, col, footprint: edge + 2 * col };
}

/** The hotkey column's box, in absolute frame coordinates. Shared by the draw, the hit test and the verifier. */
export function hotkeyColumn(g: Strip, frameH: number, insets: StripInsets, scale: number): { x: number; y: number; w: number; h: number } {
    const px = (css: number): number => Math.round(css / Math.max(0.05, scale));
    const h: number = columnHeight(g, HOTKEY_ROWS);
    return {
        x: px(HOTKEY_X_CSS) + insets.left,
        y: frameH - px(HOTKEY_BOTTOM_CSS) - insets.bottom - h,
        w: g.cell,
        h
    };
}

/** A column's height: n stones and the gaps between them. */
export function columnHeight(g: Strip, rows: number): number {
    return rows * g.cell + (rows - 1) * g.gap;
}

/**
 * The strip's slice of the anchor table, built for one set of metrics.
 *
 * The two columns share a BOTTOM edge rather than a top one — bottom-anchored, so they line up
 * along the edge the thumb works from and the six-cell column is missing its TOP stone. The panel
 * sits at the strip's full footprint, so its right edge meets the strip's left with no gap for a
 * tap to fall through.
 *
 * Every child is `edge: true`: they are nested inside the columns, so the safe-area padding that
 * belongs on a frame-anchored cluster would be added AGAIN to each cell and shove the icons out of
 * their own container.
 */
export function anchors(g: Strip): StripAnchor[] {
    const tall: number = columnHeight(g, ROWS_TALL);
    const short: number = columnHeight(g, ROWS_SHORT);
    const pitch: number = g.cell + g.gap;

    const out: StripAnchor[] = [
        // The outer columns, right-anchored and sharing a baseline. com_10 is the outermost.
        { com: 10, x: g.edge, y: g.edge, width: g.col, height: short, xa: X_RIGHT, ya: Y_BOTTOM, wa: 0, ha: 0, layer: HOST },
        { com: 27, x: g.edge + g.col, y: g.edge, width: g.col, height: tall, xa: X_RIGHT, ya: Y_BOTTOM, wa: 0, ha: 0, layer: HOST },
        // The inner layers have to grow with their columns or every cell past the first is clipped
        // away — drawLayer clips children to the parent's box.
        { com: 12, x: 0, y: 0, width: g.col, height: short, xa: X_LEFT, ya: Y_TOP, wa: 0, ha: 0, edge: true },
        { com: 29, x: 0, y: 0, width: g.col, height: tall, xa: X_LEFT, ya: Y_TOP, wa: 0, ha: 0, edge: true },
        // The dead Clan Chat slot and its empty icon. `hide` is safe on these two for the one
        // reason it is forbidden on every other plate: there is no button to take away.
        { com: 13, hide: true },
        { com: 20, hide: true },
        // The side panel, immediately left of the strip and sharing its baseline.
        { com: 82, x: g.footprint, y: g.edge, xa: X_RIGHT, ya: Y_BOTTOM, layer: HOST }
    ];

    // Plate and icon are given the SAME box — the whole cell — so the icon's centre is the cell's
    // centre by construction. The draw takes `childX + (renderWidth >> 1)`, so anything else here
    // shows up as a glyph sitting a pixel or two off-centre in its stone, which is precisely the
    // "the icons don't match each other" complaint this strip was rebuilt to fix.
    const cellAt = (com: number, row: number): StripAnchor => ({
        com,
        x: PAD,
        y: row * pitch,
        width: g.cell,
        height: g.cell,
        xa: X_LEFT,
        ya: Y_TOP,
        wa: 0,
        ha: 0,
        edge: true
    });

    // Inner column, seven: Combat, Stats, Quest, Inventory, Equipment, Prayer, Magic.
    for (let row = 0; row < ROWS_TALL; row++) {
        out.push(cellAt(30 + row, row), cellAt(37 + row, row));
    }
    // Outer column, six: Friends, Ignore, Logout, Settings, Emotes, Music.
    for (let row = 0; row < ROWS_SHORT; row++) {
        out.push(cellAt(14 + row, row), cellAt(21 + row, row));
    }
    return out;
}
