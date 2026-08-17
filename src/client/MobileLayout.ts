import { CHAT_CHIPS } from '#/client/ChatFilter.js';
import HotkeyBar from '#/client/HotkeyBar.js';
import HudSkin from '#/client/HudSkin.js';
import * as HudStrip from '#/client/HudStrip.js';
import { FILL, X_CENTRE, X_LEFT, X_RIGHT, Y_BOTTOM, Y_TOP } from '#/client/HudStrip.js';
import IfType from '#/config/IfType.js';

/**
 * Re-anchors the fixed game frame (window pane 548) so it lays itself out against ANY frame size,
 * with the 3D viewport filling the whole frame and the HUD hanging off the corners — the layout
 * RuneScape calls "resizable" mode, and the layout OSRS mobile uses.
 *
 * ---------------------------------------------------------------------------------------------
 * THE MECHANISM: THIS FILE WRITES NO COORDINATES PER FRAME. IT TURNS ON AN ENGINE THAT IS ALREADY
 * HERE.
 * ---------------------------------------------------------------------------------------------
 *
 * `IfType` carries four alignment fields — `xAlignment`, `yAlignment`, `widthAlignment`,
 * `heightAlignment` — and `Client.computeComponentPosition` / `computeComponentSize` implement a
 * complete relative-anchoring layout pass over them: anchor right, anchor bottom, centre, fill,
 * proportional. `Client.computeInterfaceLayout` runs that pass over the whole pane against
 * `GameShell.sWid`/`sHei` on every frame, and nested children are laid out against their own
 * parent's RESOLVED box.
 *
 * None of it has ever done anything, because the 465 cache has no bytes for it: alignment fields
 * were a rev-500 addition, and both decoders hard-zero all four (`IfType.decode3`, `IfType.decode`
 * — there is a comment there about the four phantom bytes that desynced the packet when an earlier
 * port tried to read them). The layout engine came over with the rest of the engine and has been
 * sitting dormant for want of data.
 *
 * So a resizable HUD is not a relayout. It is ~20 property writes that hand the engine the data
 * the cache never had. The previous attempt at this — see the "What used to be here" section of
 * docs/display-and-settings.md — re-stamped `x`/`y` on 548's children every frame and had to
 * classify each child as a pane-root delta or a viewport delta by hand. That classification is
 * what went wrong. Here it cannot: a child of `com_82` is anchored against `com_82` by the engine,
 * a child of `com_62` against `com_62`, a pane-root child against the frame — automatically, which
 * is why the other ~80 children of 548 need no treatment at all and simply ride their parents.
 *
 * EVERY NUMBER BELOW IS DERIVED, NOT INVENTED. A right anchor is `765 - x - width` and a bottom
 * anchor is `503 - y - height`, taken off a dump of 548 out of the 465 cache
 * (`server/tools/dump-interface.ts 548`), where 765x503 is the frame the cache authors 548 for.
 * The consequence worth knowing: at 765x503 every one of these anchors resolves to exactly the
 * coordinate the cache gave it. The re-anchor is an identity at the baseline; it only starts
 * moving things once the frame is a different size.
 *
 * WHAT IS NOT DERIVED, and is a deliberate design choice: `com_64` (the modal slot) is centred
 * rather than left-anchored, `com_27` (the upper tab row) is bottom-anchored so it stays glued to
 * the sidebar instead of stranded under the minimap, and the nine frame-trim layers are hidden
 * because a resizable frame has no stone border to draw.
 *
 * This file imports nothing but `IfType` — no `Client`, no `ScreenMode`. The pane id, the enabled
 * flag and the safe-area insets all arrive as arguments, which is what keeps it free of the module
 * cycle the rest of the client's display code is careful about.
 */

/** The fixed game frame. The only pane this file knows how to lay out. */
const PANE: number = 548;

// The frame pane 548's coordinates are authored for is 765x503, and every inset in the table below
// is derived from it: `765 - x - width` for a right anchor, `503 - y - height` for a bottom one.
// They are written out as resolved numbers rather than computed here, so each entry can be checked
// against a cache dump on its own line.

// The alignment codes live in `HudStrip` — that module is imported BY this one, so it is the
// end of the dependency chain and the only place they can sit without a cycle.

/** Safe-area padding, in FRAME pixels. On a notched iPhone in landscape these are the sides. */
export type SafeInsets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export const NO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

type Anchor = {
    /** child index within pane 548 */
    com: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    xa?: number;
    ya?: number;
    wa?: number;
    ha?: number;
    /** re-hang this child under another child of the same pane, by child index */
    layer?: number;
    hide?: boolean;
    /**
     * Opt out of safe-area padding. For anything that is supposed to reach the glass — the scene,
     * and the layers that merely contain it — an inset would just paint a black margin where the
     * world should be.
     */
    edge?: boolean;
};

/** The cache values a component had before we touched it, so the mode can be switched back off. */
type Base = {
    com: IfType;
    x: number;
    y: number;
    width: number;
    height: number;
    xa: number;
    ya: number;
    wa: number;
    ha: number;
    layerId: number;
    hide: boolean;
    trans: number;
    hAlign: number;
};

export default class MobileLayout {
    /**
     * The anchor table.
     *
     * Cache rects (from the 548 dump) are quoted so the arithmetic can be checked without the
     * dump in front of you. Children of `com_62` are inset against the viewport's authored
     * 512x334, NOT against the frame — the engine feeds every child its own parent's box, so the
     * baseline the inset is derived from has to be the parent's too.
     */
    private static readonly ANCHORS: Anchor[] = [
        // ---- the 3D viewport, and everything that lives inside it -----------------------------
        // com_62 is the viewport container at (4,4) 512x334. Filling the frame with it is what
        // makes the scene full-screen, and it drags 63/64/65/66-70/71 along as its children.
        { com: 62, x: 0, y: 0, width: 0, height: 0, xa: X_LEFT, ya: Y_TOP, wa: FILL, ha: FILL, edge: true },
        // com_63 IS the scene (clientCode 1337). Because its renderWidth/renderHeight are now
        // genuinely frame-sized, the 1337 branch in drawInterface reads the right rect straight
        // off the component and needs no special case — and componentDrawWidth/Height, recorded
        // from those same fields one block earlier, describe the right blit rect too. Overriding
        // the rect locally instead (which is what "Big view" did) left the blit list believing the
        // scene was still 512x334, so only that much of it ever reached the canvas.
        { com: 63, x: 0, y: 0, width: 0, height: 0, xa: X_LEFT, ya: Y_TOP, wa: FILL, ha: FILL, edge: true },
        // com_71 is an empty layer drawn AFTER the scene. It is the host for the three HUD strips
        // that would otherwise be painted over — see the reparent note on com_0/10/27 below.
        { com: 71, x: 0, y: 0, width: 0, height: 0, xa: X_LEFT, ya: Y_TOP, wa: FILL, ha: FILL, edge: true },
        // com_64 (0,0) 512x334 — the modal slot the server opens banks, shops and dialogues into.
        // Centred horizontally and pinned near the top: it keeps its authored 512x334 size, so on
        // a wide frame left-anchoring would strand it in the corner. Top-pinned rather than
        // centred vertically because com_73 (the chatbox) draws AFTER it and would otherwise cut
        // across its lower half — at y=4 it ends at 338 and the chatbox starts at 357.
        { com: 64, x: 0, y: 4, xa: X_CENTRE, ya: Y_TOP, edge: true },
        // THE NEXT SIX ARE NOT DERIVED, AND THE ARITHMETIC IS A TRAP.
        //
        // com_65 and com_66..70 are children of com_62, so before this they were inset against the
        // viewport's authored 512x334 — the icon 40px in from ITS right edge, the chat lines 4px
        // up from ITS bottom. But com_62 is now the whole frame, so re-deriving those same insets
        // against 512x334 would be re-deriving them against a box that no longer exists: the icon
        // would land in the frame's bottom-right corner, underneath the tab row, and the chat
        // lines underneath the chatbox. Both would be arithmetically faithful and both would be
        // invisible.
        //
        // So these are placed against the resizable layout rather than converted from the fixed
        // one, and they are the only entries in this table where that is true.

        // com_65 (472,296) 25x25 — the multiway-combat indicator. BOTTOM-LEFT: the chat cluster
        // used to own that corner and has moved to the top, while the top-left is now the chat's.
        // The verifier caught the swap — it collided with the mode bar the moment chat moved.
        { com: 65, x: 15, y: 15, xa: X_LEFT, ya: Y_BOTTOM },
        // com_66..70 (0,265..317) 512x13 — the five chat lines drawn OVER the scene, i.e. what
        // you see with the chatbox closed. They follow the chatbox to the top-left on the cache's
        // own 13px pitch, and stop 190px short of the right edge so a long line is not sliced by
        // the minimap. They may sit on the chat cluster: the two are never both up, because
        // closing the chatbox hides com_0 and com_73 together.
        { com: 66, x: 0, y: 4, width: 190, xa: X_LEFT, ya: Y_TOP, wa: FILL },
        { com: 67, x: 0, y: 17, width: 190, xa: X_LEFT, ya: Y_TOP, wa: FILL },
        { com: 68, x: 0, y: 30, width: 190, xa: X_LEFT, ya: Y_TOP, wa: FILL },
        { com: 69, x: 0, y: 43, width: 190, xa: X_LEFT, ya: Y_TOP, wa: FILL },
        { com: 70, x: 0, y: 56, width: 190, xa: X_LEFT, ya: Y_TOP, wa: FILL },

        // ---- the HUD ---------------------------------------------------------------------------
        // com_72 (550,4) 172x156 — minimap + compass. Top-right, and FLUSH: the cache's insets here
        // are 43 across and 4 down, which is the gap the fixed frame's stone trim used to fill.
        // That trim is hidden in this layout, so the inset is 43 pixels of nothing between the map
        // and the edge of the screen — the roomiest single thing left to reclaim. Every
        // right-hand piece is now at 0, so the minimap, the panel and both tab rows share one
        // edge instead of three.
        //
        // REPARENTED, unlike every earlier revision of this table, and for draw order alone. As a
        // pane-root child it drew AFTER com_62's whole subtree, so once the side panel started
        // floating up into the minimap's corner the minimap painted over the top of it and the
        // panel's first two rows were simply gone. Under com_71 it sits at index 72 — after the
        // chat-mode bar and both tab rows, before the chatbox and the panel — so the panel now
        // covers the map rather than the other way round.
        //
        // The old note here said it was deliberately NOT reparented because clientCode 1338 draws
        // in its own branch above the redraw gate and therefore repainted regardless. That is
        // still true and is exactly why the move is safe: the branch is unconditional, so
        // inheriting com_62's always-dirty slot changes nothing about whether it paints.
        { com: 72, x: 0, y: 0, xa: X_RIGHT, ya: Y_TOP, layer: 71 },
        // ---- THE TAB STRIP: two columns of seven, welded to the right edge -------------------
        //
        // ---- the side tab strip, and the panel beside it -------------------------------------
        //
        // NOT HERE. `HudStrip.anchors()` builds these, because they are the one part of the HUD
        // whose SIZE depends on the frame rather than only its position — see that file for why,
        // and for the minimap constraint that decides the cell.
        //
        // What the strip does, in one line each, since the entries are no longer in front of you:
        // the cache's fourteen tabs are turned from two ROWS of seven into two COLUMNS, which puts
        // them beside the side panel instead of under it and stops the right-hand cluster growing
        // downward. That is worth 82 rows of frame height, which is why `ScreenMode.FIT_H` is 420
        // rather than 499 — a HUD ~18% larger on glass for the same no-overlap guarantee.
        // THE REPARENT — every HUD piece carries `layer: 71`, and it is doing TWO jobs.
        //
        // 1. DRAW ORDER. Order inside a layer is array-index order, so the pane's own children
        //    below index 62 are painted over by the now-frame-sized scene — while staying
        //    clickable, because hit-testing walks the same array independently of what painted
        //    last. That is the chat-mode bar and both tab rows: invisible, and still switching your
        //    sidebar tab when you tap the world.
        //
        // 2. THE DIRTY SLOT, which is the subtle one and cost a round of on-device testing.
        //    Painting is gated on Client.componentRedraw[drawSlot] (Client.ts:11036) — layout and
        //    hit-testing run every frame, but pixels only go down when that slot is dirty. A
        //    pane-root child claims its OWN slot and so only repaints when its content changes.
        //    That was fine while the scene lived in a 512x334 hole. It is fatal once the scene
        //    covers the whole frame and marks itself dirty every frame: it repaints over the
        //    sidebar and chatbox continuously, and they never repaint back. They were simply
        //    absent on screen.
        //
        //    A child of com_71 is inside the viewport's subtree, so drawSlotArg is not -1 and it
        //    inherits com_62's always-dirty slot — repainting in step with the scene that
        //    overpaints it. Sub-interfaces come along too: drawInterface is handed the parent's
        //    drawSlot (Client.ts:11031), so the chatbox's widget 137 and whatever tab is open in
        //    the sidebar follow their container.
        //
        // The minimap (com_72) is deliberately NOT reparented: clientCode 1338 draws in its own
        // branch above the redraw gate, so it repaints regardless and already worked.
        //
        // Cost: the dirty-rect optimisation is gone in this mode. That is not a consequence of the
        // reparent — it is a consequence of a full-frame scene, and it was already paid.
        //
        // Everything else rides along free: draw, hit-test and layout all recurse on parentId over
        // the very same components array, so clicks and layout follow with no extra work. com_71 is
        // made frame-sized above, so these insets stay measured against the frame exactly as they
        // are for the pane's own children.
        // com_73 (17,357) 479x96 — the chatbox, now TOP-LEFT with its tab bar above it rather
        // than below, which is the reference layout's arrangement and frees the bottom edge
        // entirely. x 8 centres its 479 inside the 496 the bar needs; y is the bar's height, so
        // the two share one container with no step.
        { com: 73, x: 8, y: 34, xa: X_LEFT, ya: Y_TOP, layer: 71 },
        // com_0 (0,453) 496x50 — the chat-mode bar, above the box it filters, and RESIZED: the
        // chip row drawn over it needs 34 rows, not the 50 the cache's two-line stone labels did.
        // Sized absolutely (wa/ha 0) because a bar that grew with the frame would put the chips
        // somewhere different at every window size.
        { com: 0, x: 0, y: 0, width: 496, height: 34, xa: X_LEFT, ya: Y_TOP, wa: 0, ha: 0, layer: 71 },

        // ---- frame trim -------------------------------------------------------------------------
        // The nine stone/wood border sprites that fill the gaps of the FIXED layout. A resizable
        // frame has no such gaps, and at any other size they are just bars lying across the world.
        // `hide` removes them from the draw pass AND from hit-testing, which matters: the pane's
        // children are hit-tested in array order regardless of what painted over them, so a merely
        // overpainted strip stays clickable.
        { com: 44, hide: true },
        { com: 46, hide: true },
        { com: 48, hide: true },
        { com: 50, hide: true },
        { com: 52, hide: true },
        { com: 54, hide: true },
        { com: 56, hide: true },
        { com: 58, hide: true },
        { com: 60, hide: true }
    ];

    // ---------------------------------------------------------------------------------------
    // THE COLLAPSIBLE HUD
    //
    // Everything below is state the anchor table reads, not more geometry. The layout above says
    // WHERE each HUD piece goes; this says whether it is on screen and how solid it is drawn.
    // ---------------------------------------------------------------------------------------

    /**
     * Is the side panel showing?
     *
     * The tab rows are the buttons — they stay up either way — and only `com_82`, the panel they
     * switch between, comes and goes. That is the OSRS-mobile arrangement and it needs no new
     * button: `Client.ifButtonX` routes every tab activation (tap AND hotkey) through `tapTab`.
     */
    static sidebarOpen: boolean = true;

    /** Is the chatbox showing? Toggled from the mobile button bar; see MobileTouch. */
    static chatOpen: boolean = true;

    /**
     * Is the second column of side tabs folded away?
     *
     * 2.0's misclick guard, and the reason it is the OUTER column that goes: the strip's two
     * columns are the cache's two tab rows, and they divide almost exactly the way the reference
     * divides them — `com_27` holds Combat, Stats, Quest, Inventory, Equipment, Prayer and Magic,
     * the things you touch mid-fight, and `com_10` holds Friends, Ignore, Logout, Options, Emotes
     * and Music, the things you do not. Hiding `com_10` takes the six away and slides the seven
     * out to the frame edge, so the column you kept is the one under your thumb.
     */
    static stonesCollapsed: boolean = false;

    /**
     * Is a modal (bank, shop, dialogue) loaded into the modal slot?
     *
     * Written by `Client.stampMobileLayout`, because the answer lives in `Client.subinterfaces`
     * and this file imports nothing but `IfType`. It matters for `pointOverHud`: `com_64` is a
     * 512x334 layer sitting over the middle of the frame at all times, and treating it as HUD
     * while it is empty would turn a big rectangle of world into dead space for camera drags.
     */
    static modalOpen: boolean = false;

    /**
     * The panel sprites, i.e. the backing art of each HUD cluster — NOT the clusters themselves.
     *
     * Each is the plain background GRAPHIC of its layer, so putting alpha here leaves everything
     * drawn on top of it (tab icons, item icons, chat text) fully opaque. That is what makes the
     * result read as an OSRS-mobile HUD rather than a faded screenshot.
     */
    private static readonly PANELS: number[] = [
        74, // the chatbox parchment (in com_73)
        83 // the sidebar's background (in com_82)
    ];

    /**
     * Backdrops REPLACED by a plain rounded container, rather than faded or deleted.
     *
     * These are the flat stone strips behind a whole cluster — the chat-mode bar's and each tab
     * row's. Deleting them outright was the first attempt and it left the icons floating with
     * nothing tying them together; fading them left a faded rectangle. Drawing one rounded
     * translucent box in their place is what "just icons, in a container like the map" means, and
     * because the component is still there it keeps its place in the hit test.
     *
     * Every one is a plain GRAPHIC with no op (verified), so nothing but pixels depends on them.
     */
    private static readonly BACKDROPS: number[] = [
        1, // behind the four chat-mode labels (in com_0)
        11, // behind the lower tab row (in com_10)
        28, // behind the upper tab row (in com_27)
        74, // the chatbox parchment (in com_73)
        83 // behind the side panel (in com_82)
    ];

    /**
     * ONE container per CLUSTER, not per backdrop — which is what "uniform" turned out to mean.
     *
     * The HUD has two groups of pieces that read as a single thing, and each piece was drawing its
     * own box. Measured on a 1050-wide frame, that gave:
     *
     *   panel container   x 860..1050   190 wide
     *   tabs container    x 781..1050   269 wide     <- a 79px step, stacked directly under it
     *
     * A step like that is the whole of "uneven, not flush". The fix is not to nudge them into
     * line — the panel is 190 and seven tab icons need 269, so they can never match — but to stop
     * treating them as two things. ONE container spans the entire right column and the panel is
     * centred inside it, so the extra 79px reads as padding rather than a ledge.
     *
     * Each entry maps the backdrop that DRAWS the box to the clusters the box has to span.
     *
     * Which backdrop draws it is not a free choice: it must be the one that paints FIRST, or the
     * box lands on top of content already drawn. Order inside com_71 is array-index order, so the
     * chat group draws on `com_1` (index 1, ahead of the chatbox at 73) and the tab group on
     * `com_11` (index 11, ahead of the upper row at 27). The others are absorbed and draw nothing.
     */
    private static readonly CONTAINERS: Map<number, number[]> = new Map([
        [1, [0, 73]], // chat-mode bar + chatbox
        // THE PANEL ONLY. The tab strip used to be in this union, giving one slab behind the
        // panel and both columns — right while the cells were butted together, wrong the moment
        // they were spaced, because the gaps between them would show slab rather than world and
        // the lattice would be back as a negative. Spaced cells float over the scene exactly as
        // the hotkey column does.
        //
        // Drawn by `com_83`, the panel's own backing, rather than by a tab row's: the row is what
        // the one-column setting hides, and a slab hosted there would vanish with it.
        [83, [82]]
    ]);

    private static readonly backdropIds: Set<number> = new Set(MobileLayout.BACKDROPS.map((c: number): number => (PANE << 16) + c));

    /** Draw this component as a rounded container — or, if it is absorbed, as nothing at all. */
    static isBoxed(packed: number): boolean {
        return MobileLayout.cropped() && MobileLayout.backdropIds.has(packed);
    }

    /**
     * The box this backdrop should draw, in absolute frame pixels, or null if another backdrop's
     * container already covers it. Hidden clusters drop out, so a collapsed chatbox takes the
     * chat-mode bar's half of the box with it.
     */
    static containerRect(packed: number): { x: number; y: number; w: number; h: number } | null {
        const group: number[] | undefined = MobileLayout.CONTAINERS.get(packed - (PANE << 16));
        if (group === undefined) {
            return null;
        }
        let x0: number = Number.MAX_SAFE_INTEGER;
        let y0: number = Number.MAX_SAFE_INTEGER;
        let x1: number = Number.MIN_SAFE_INTEGER;
        let y1: number = Number.MIN_SAFE_INTEGER;
        for (const index of group) {
            const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
            if (com === null || com.hide || com.renderWidth <= 0 || com.renderHeight <= 0) {
                continue;
            }
            x0 = Math.min(x0, com.renderX);
            y0 = Math.min(y0, com.renderY);
            x1 = Math.max(x1, com.renderX + com.renderWidth);
            y1 = Math.max(y1, com.renderY + com.renderHeight);
        }
        return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
    }

    /**
     * The chat-mode bar's four cells: `[layer, text, the chip it belongs under]`.
     *
     * THE OP IS ON THE LAYER, NOT THE TEXT (verified against a decode of 548): `com_2/4/6` carry
     * `onclick` hooks that cycle On/Friends/Off and send the setting to the server, and `com_8`
     * carries a real `Report abuse` op. So the TEXT can be hidden — it has no hook — and the LAYER
     * must not be, or the setting becomes unreachable.
     *
     * Each layer is therefore parked under the chip that means the same thing, occupying its lower
     * strip: tapping a chip's NAME switches tab (this client), tapping the STATE under it cycles
     * the mode (the cache's own hook, untouched). The chip row draws the state itself, read from
     * `Client.chatPublicMode` and friends, which is the same source the cache's cs2 writes those
     * labels from.
     *
     * Report has no chip: this client refuses to send an abuse report at all — the 465 server has
     * no handler and the rev-500 body poisons the stream (see opcode 5002 in ScriptRunner) — so a
     * button for it is a button that cannot work. It is parked at zero size, which removes it from
     * the draw and from hit-testing without `hide`'s side effects.
     */
    private static readonly CHAT_MODE_CELLS: number[][] = [
        [2, 3, 2], // Public chat  -> the Public chip
        [4, 5, 3], // Private chat -> the Private chip
        [6, 7, 4], // Trade/compete -> the Trade chip
        [8, 9, -1] // Report abuse -> nowhere
    ];

    /**
     * The chat tab bar: 496 wide, and **34 tall against the cache's 50**.
     *
     * The cache sizes this strip for two lines of its own 12px font plus the stone frame around
     * them. The chip row needs neither: a name in p11 over a state in p11 fits 28 with air, and
     * the sixteen rows saved come straight off the top of the chat cluster — which is the whole
     * of "the buttons on top of chat are very big". `com_73`, the chatbox, moves up to meet it.
     */
    static readonly CHAT_BAR_W: number = 496;
    static readonly CHAT_BAR_H: number = 34;

    /** One chip's box inside the chat-mode bar, in bar-local coordinates. */
    static chipRect(index: number): { x: number; y: number; w: number; h: number } {
        return HudSkin.chipRect(index, CHAT_CHIPS.length, MobileLayout.CHAT_BAR_W, MobileLayout.CHAT_BAR_H);
    }

    /**
     * Which chip is at this ABSOLUTE frame point, or -1.
     *
     * The chips are drawn pixels with no components behind them, so they are hit-tested here
     * rather than by the interface walk. A hidden chat cluster matches nothing, which is what
     * makes the collapsed chatbox hand its ground back to the world.
     */
    static chipAt(x: number, y: number): number {
        if (!MobileLayout.applied) {
            return -1;
        }
        const bar: IfType | null = IfType.get(MobileLayout.packedLayer(MobileLayout.CHATMODES));
        if (bar === null || bar.hide || bar.renderWidth <= 0) {
            return -1;
        }
        for (let i = 0; i < CHAT_CHIPS.length; i++) {
            const r = MobileLayout.chipRect(i);
            // Where a mode cell is parked, the chip's lower strip belongs to IT, not to the tab —
            // that strip is the On/Friends/Off control. This test runs before the interface walk,
            // so failing to exclude it would swallow every attempt to change a chat mode.
            const height: number = MobileLayout.chipHasMode(i) ? r.h - HudSkin.CHIP_STATE_H : r.h;
            if (x >= bar.renderX + r.x && x < bar.renderX + r.x + r.w && y >= bar.renderY + r.y && y < bar.renderY + r.y + height) {
                return i;
            }
        }
        return -1;
    }

    /**
     * How far down the frame's top-left corner is occupied by the chat cluster, in frame pixels.
     *
     * The hover text ("Talk-to Hans / 2 more options") is drawn at the VIEWPORT's top-left, which
     * in the fixed frame is a corner of empty world — the scene sits in a 512x334 hole and the
     * chat is below it. In this layout the viewport is the whole frame and the chat cluster is in
     * that corner, so the two land on each other.
     *
     * Returns 0 when there is nothing there: fixed layout, or the chatbox collapsed. The caller
     * adds it, so the text sits under the chat while it is up and springs back to the top when it
     * is not.
     */
    static chatClusterBottom(): number {
        if (!MobileLayout.applied) {
            return 0;
        }
        let bottom: number = 0;
        for (const index of [MobileLayout.CHATMODES, MobileLayout.CHATBOX]) {
            const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
            if (com === null || com.hide || com.renderHeight <= 0) {
                continue;
            }
            bottom = Math.max(bottom, com.renderY + com.renderHeight);
        }
        return bottom;
    }

    /**
     * Is this frame point on the dark chat panel?
     *
     * THE TEST IS POSITION, NOT INTERFACE ID, and that is the whole point of it. The chatbox is
     * authored for parchment and so is everything the server opens INTO it — NPC dialogue, "Click
     * here to continue", Enter amount, the make-X menus — and every one of those is a different
     * cache interface with its own black or navy text. Keying the recolour on widget 137 fixed the
     * chat lines and left every dialogue unreadable, then keying it on 137 plus a list of dialogue
     * ids would have been a list that is never finished.
     *
     * Anything drawn inside the cluster's rect is on the dark panel by definition, whoever owns
     * it. Outside it nothing is touched — a bank or a shop opens in the modal slot over the world
     * with its own art, and must keep its authored colours.
     */
    static overChatPanel(x: number, y: number): boolean {
        if (!MobileLayout.applied) {
            return false;
        }
        for (const index of [MobileLayout.CHATMODES, MobileLayout.CHATBOX]) {
            if (MobileLayout.pointOverCom(index, x, y)) {
                return true;
            }
        }
        return false;
    }

    /** Does a cache chat-mode cell sit under this chip? */
    static chipHasMode(chip: number): boolean {
        return MobileLayout.CHAT_MODE_CELLS.some((cell: number[]): boolean => cell[2] === chip);
    }

    /**
     * A tab row is TWO layers of stone. `BACKDROPS` covers the strip behind the whole row; these
     * are the rounded plate under each individual icon (sprites 305/306/307), and they are the
     * other half of the rectangle.
     *
     * They CANNOT be hidden: every one of them carries the tab's op hook, and `hide` removes a
     * component from hit-testing as well as from the draw. So instead the draw skips their sprite
     * and puts a disc under the icon in its place — see `Client.drawTabDisc`. The component is
     * still there, still exactly as clickable as the cache made it.
     */
    private static readonly TAB_PLATES: number[] = [13, 14, 15, 16, 17, 18, 19, 30, 31, 32, 33, 34, 35, 36];

    private static readonly plateIds: Set<number> = new Set(MobileLayout.TAB_PLATES.map((c: number): number => (PANE << 16) + c));

    /**
     * The fourteen tab ICONS — the siblings of the plates, one per stone.
     *
     * Separate from `TAB_PLATES` because they are separate components: the plate carries the tab's
     * op hook and draws nothing, the icon carries no op at all and draws the picture. Which also
     * makes this the safe half to interfere with — re-centring or rescaling an icon cannot cost a
     * button, because the icon was never the button.
     */
    private static readonly TAB_ICONS: number[] = [20, 21, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 43];

    private static readonly iconIds: Set<number> = new Set(MobileLayout.TAB_ICONS.map((c: number): number => (PANE << 16) + c));

    /** Draw this component's sprite through the skin's uniform-icon fit rather than as authored. */
    static isTabIcon(packed: number): boolean {
        return MobileLayout.cropped() && MobileLayout.iconIds.has(packed);
    }

    /**
     * Which baked icon replaces this component's cache sprite, if one exists.
     *
     * The pairing is the component's own, not a guess: each icon sits beside a plate whose op
     * names the tab (`com_30` is `Combat Options`, `com_33` is `Inventory`, and so on down both
     * rows), and the names here are the ones the art was exported under. A name with no baked art
     * simply falls back to the cache sprite, which is what makes this safe to ship half-finished.
     */
    private static readonly TAB_ICON_NAMES: Map<number, string> = new Map([
        // upper row: com_37..43
        [37, 'combat'],
        [38, 'skills'],
        [39, 'quests'],
        [40, 'inventory'],
        [41, 'equipment'],
        [42, 'prayer'],
        [43, 'magic'],
        // lower row: com_20..26 (20 is the dead Clan Chat slot, hidden — art kept for the day it is not)
        [20, 'clanchat'],
        [21, 'friends'],
        [22, 'ignore'],
        [23, 'logout'],
        [24, 'settings'],
        [25, 'emotes'],
        [26, 'music']
    ]);

    static tabIconName(packed: number): string | null {
        return MobileLayout.TAB_ICON_NAMES.get(packed - (PANE << 16)) ?? null;
    }

    // ---------------------------------------------------------------------------------------
    // The IF3 scrollbar
    // ---------------------------------------------------------------------------------------

    /** What one piece of a cs2-built scrollbar is, for the skin to draw in its place. */
    static readonly SCROLL_NONE: number = 0;
    static readonly SCROLL_TRACK: number = 1;
    static readonly SCROLL_GRIP: number = 2;
    static readonly SCROLL_CAP: number = 3;
    static readonly SCROLL_UP: number = 4;
    static readonly SCROLL_DOWN: number = 5;

    /**
     * Identify a scrollbar piece BY ITS SPRITE, which is the only thing all of them share.
     *
     * Every IF3 scrollbar in the game — the chatbox, the side panels, a quest journal — is built
     * at runtime by the same pair of cache clientscripts (30 calls 31), which `cc_create`s six
     * GRAPHIC subcomponents into a host layer and hands each one a sprite id. There is no
     * component in the cache to match on and no interface id worth matching on: the host is
     * whichever layer wanted a scrollbar.
     *
     * The six ids are script 30's own constants, so matching them catches every scrollbar at once
     * and nothing else — no other component in the cache draws sprite 789-792, and 773/788 are
     * `scrollbar_v2`, an arrow pair used for exactly this.
     *
     * Worth knowing if a rule is ever added here that keys on the COMPONENT instead: a
     * `cc_create`d subcomponent inherits its host's `parentId`, so a parentId-keyed rule fires on
     * every subcomponent of that host, not the one you meant. Key on `(parentId, subId)` — or, as
     * here, on the sprite.
     */
    private static readonly SCROLL_SPRITES: Map<number, number> = new Map([
        [792, MobileLayout.SCROLL_TRACK],
        [790, MobileLayout.SCROLL_GRIP],
        [789, MobileLayout.SCROLL_CAP],
        [791, MobileLayout.SCROLL_CAP],
        [773, MobileLayout.SCROLL_UP],
        [788, MobileLayout.SCROLL_DOWN]
    ]);

    static scrollPart(graphic: number): number {
        if (!MobileLayout.cropped()) {
            return MobileLayout.SCROLL_NONE;
        }
        return MobileLayout.SCROLL_SPRITES.get(graphic) ?? MobileLayout.SCROLL_NONE;
    }

    /**
     * Is the cropped look on? Whenever the resizable layout is — it is not a separate switch and
     * it is NOT tied to the alpha level.
     *
     * It was tied to the alpha at first, on the reasoning that nobody wants see-through panels
     * inside opaque stone rectangles. That was true but backwards: it made `HUD panels: Solid`
     * silently mean "and also put the cache's stone frames back", so a player who had picked Solid
     * — or never touched it — got the old rectangles and no way to tell why. One setting was
     * quietly controlling two unrelated things.
     *
     * Now the containers are always drawn in this layout and `panelTrans` only decides how
     * see-through they are, with 0 giving solid ones. The way to get the cache art exactly as
     * authored is `Layout: Fixed`, which is what that setting is for.
     */
    static cropped(): boolean {
        return MobileLayout.applied;
    }

    /** Skip this component's sprite — it is a tab plate, and a drawn cell goes there instead. */
    static isTabPlate(packed: number): boolean {
        return MobileLayout.cropped() && MobileLayout.plateIds.has(packed);
    }

    /**
     * Is this tab the one whose panel is open? Drives the lit cell behind its icon.
     *
     * Reuses the panel mapping `tapTab`/`noteTabShown` build by watching, so it needs no idea of
     * which sprite the cache uses for a selected plate — and it puts back the selected-tab
     * indicator that hiding those plates removed. A tab never yet tapped has no mapping and simply
     * draws unlit, which is the safe way to be wrong.
     */
    static isTabSelected(packed: number): boolean {
        const panel: number | undefined = MobileLayout.tabPanel.get(packed);
        return panel !== undefined && panel === MobileLayout.openPanel();
    }

    /**
     * The side panels, 548:86..99 — one per side tab, in `ControlBar.TABS` order (86 = Combat,
     * 89 = Inventory, which is the one the cache leaves un-hidden).
     */
    private static readonly PANEL_BASE: number = 86;
    private static readonly PANEL_COUNT: number = 14;

    /**
     * HUD clusters, for `pointOverHud`. The scene is everything these do not cover.
     *
     * Every one of them is either a pane-root child or a child of `com_71`/`com_62`, and the
     * anchor table pins all three of those containers to (0,0) at frame size — so a cluster's
     * `renderX`/`renderY`, which the layout pass writes relative to its parent, is already the
     * absolute frame coordinate. That is only true because of those three entries; a cluster
     * re-hung under anything offset would need its parent's origin added.
     */
    private static readonly CLUSTERS: number[] = [72, 27, 10, 82, 73, 0, 64];

    /** A child index of 548 as the packed id the rest of the client uses. */
    private static packedLayer(com: number): number {
        return (PANE << 16) + com;
    }

    /**
     * Which side PANEL is showing, or -1 if it cannot be told.
     *
     * Read off the panels' own `hide` flags rather than a varp: the cache's cs2 owns the switch,
     * and those flags are what it writes, so this can never disagree with what is on screen.
     */
    static openPanel(): number {
        for (let i: number = 0; i < MobileLayout.PANEL_COUNT; i++) {
            const com: IfType | null = IfType.get(MobileLayout.packedLayer(MobileLayout.PANEL_BASE + i));
            if (com !== null && !com.hide) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Which panel each tab component turned out to open, learned by watching.
     *
     * THE PANEL INDEX IS NOT THE TAB INDEX, and assuming it was is what broke the lower row.
     * There are 14 panels for 13 tabs: panel 7 belongs to `com_13`, a tab plate carrying no hook
     * and no sprite — the Clan Chat slot this build has no tab for. So the seven upper tabs line
     * up 0..6 and every lower tab is off by one; Friends is tab 7 but panel 8.
     *
     * Comparing a tab index against a panel index therefore answered "this tab is already
     * showing" for the WRONG tab, and the toggle collapsed the sidebar instead of switching to it.
     * From the outside that reads as the lower row not responding to taps at all.
     *
     * Rather than hardcode the off-by-one — a fact about this cache that a future one need not
     * share — the mapping is observed: fire the hook, see which panel came up, remember it. A tab
     * that has never been tapped simply opens, which is the right answer anyway.
     */
    private static readonly tabPanel: Map<number, number> = new Map();

    /** The tab whose hook is running right now, awaiting `noteTabShown`. */
    private static pendingTab: number = -1;

    /**
     * A side-tab icon was activated, identified by packed component id. Tapping the tab that is
     * ALREADY showing collapses the panel; any other tab opens it.
     *
     * MUST be called before the tab's cs2 hook runs — the comparison is against the tab currently
     * showing, and the hook is what switches it. `Client.ifButtonX` calls this ahead of
     * `executeScript` and `noteTabShown` immediately after.
     */
    static tapTab(com: number): void {
        const panel: number | undefined = MobileLayout.tabPanel.get(com);
        const showing: boolean = panel !== undefined && panel === MobileLayout.openPanel();
        MobileLayout.sidebarOpen = !(MobileLayout.sidebarOpen && showing);
        MobileLayout.pendingTab = com;
    }

    /** The hook has run: learn which panel this tab actually shows. */
    static noteTabShown(): void {
        if (MobileLayout.pendingTab === -1) {
            return;
        }
        const panel: number = MobileLayout.openPanel();
        if (panel >= 0) {
            MobileLayout.tabPanel.set(MobileLayout.pendingTab, panel);
        }
        MobileLayout.pendingTab = -1;
    }

    /**
     * Is this frame-pixel point over a HUD cluster rather than the world?
     *
     * The question `Client.viewportX/Y/W/H` used to answer. It cannot any more: in this layout the
     * viewport IS the frame, so that rect says "world" everywhere — which left every drag a camera
     * turn (no interface could be scroll-dragged) and every wheel notch a camera zoom (no scrollbar
     * ever saw one). Asking the anchored clusters instead restores the distinction the fixed
     * frame got for free from its 512x334 hole.
     *
     * Hidden clusters are skipped, so collapsing the sidebar really does hand that ground back to
     * the world.
     */
    static pointOverHud(x: number, y: number): boolean {
        if (!MobileLayout.applied) {
            return false;
        }
        // The hotkey row is drawn pixels with no component behind it, so it is not in CLUSTERS and
        // has to be asked about separately — otherwise a tap on a hotkey would ALSO walk you to the
        // tile behind it, which is the exact failure the cluster list exists to prevent. Its own
        // frame is the same one the row is drawn against.
        const frame: IfType | null = IfType.get(MobileLayout.packedLayer(62));
        const hotkeys = frame === null ? null : HotkeyBar.bounds(frame.renderWidth, frame.renderHeight);
        if (hotkeys !== null && x >= hotkeys.x && x < hotkeys.x + hotkeys.w && y >= hotkeys.y && y < hotkeys.y + hotkeys.h) {
            return true;
        }
        for (const index of MobileLayout.CLUSTERS) {
            if (index === 64 && !MobileLayout.modalOpen) {
                continue;
            }
            if (MobileLayout.pointOverCom(index, x, y)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Is this frame point inside one anchored child of the pane? A hidden child never matches,
     * which is what makes a collapsed panel hand its ground back to the world.
     *
     * Only meaningful for the clusters listed in CLUSTERS — see the note there about why their
     * `renderX`/`renderY` are already absolute.
     */
    static pointOverCom(index: number, x: number, y: number): boolean {
        if (!MobileLayout.applied) {
            return false;
        }
        const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
        if (com === null || com.hide || com.renderWidth <= 0 || com.renderHeight <= 0) {
            return false;
        }
        return x >= com.renderX && x < com.renderX + com.renderWidth && y >= com.renderY && y < com.renderY + com.renderHeight;
    }

    /** The chatbox and the chat-mode bar under it. */
    static readonly CHATBOX: number = 73;
    static readonly CHATMODES: number = 0;

    /**
     * Height of the entry line at the bottom of the chatbox, in frame pixels.
     *
     * Widget 137 puts its input text at y=79 in a 96-tall box, under a separator line at y=77 —
     * so the bottom 19 rows are the line you type into and everything above is scrollback. 24 is
     * that plus a little, because it is a fingertip.
     */
    private static readonly CHAT_ENTRY_H: number = 24;

    /**
     * Is this frame point on the chatbox's ENTRY LINE — the strip next to your name?
     *
     * Tapping anywhere in the chatbox used to raise the keyboard, which meant every attempt to
     * read scrollback, click a name or use the scrollbar popped it open. Only the entry line means
     * "I want to type".
     */
    static pointOverChatEntry(x: number, y: number): boolean {
        if (!MobileLayout.applied) {
            return false;
        }
        const com: IfType | null = IfType.get(MobileLayout.packedLayer(MobileLayout.CHATBOX));
        if (com === null || com.hide || com.renderWidth <= 0 || com.renderHeight <= 0) {
            return false;
        }
        const bottom: number = com.renderY + com.renderHeight;
        return x >= com.renderX && x < com.renderX + com.renderWidth && y >= bottom - MobileLayout.CHAT_ENTRY_H && y < bottom;
    }

    /** Cache geometry, captured the first time each component object is seen. */
    private static readonly bases: Map<number, Base> = new Map();

    /** True while the anchors are stamped, so the mode can be turned back off exactly once. */
    private static applied: boolean = false;

    /**
     * Stamp (or un-stamp) the anchors. Call once per frame with the live top-level pane id.
     *
     * Re-asserted every frame rather than gated behind a sentinel: `IfType.unloadInterface` drops
     * 548's component array on the way back to the title screen and it is decoded fresh on the way
     * in, which zeroes the alignment fields again; and cs2's `if_setposition` / `if_setsize` /
     * `if_sethide` (opcodes 1000/1001/1003) each zero part of what we write. A sentinel that
     * checked one component would miss all of those. The re-assert is ~20 property writes on
     * objects already in memory, which is not worth being clever about.
     */
    static apply(toplevelId: number, enabled: boolean, insets: SafeInsets, strip: HudStrip.Strip): void {
        if (toplevelId !== PANE || !IfType.openInterface(PANE)) {
            return;
        }
        if (!enabled) {
            if (MobileLayout.applied) {
                MobileLayout.restore();
                MobileLayout.applied = false;
            }
            return;
        }
        MobileLayout.strip = strip;
        for (const anchor of MobileLayout.stripAnchors(strip)) {
            MobileLayout.stamp(anchor, insets);
        }
        for (const anchor of MobileLayout.ANCHORS) {
            MobileLayout.stamp(anchor, insets);
        }
        MobileLayout.applyHudState();
        MobileLayout.applied = true;
    }

    /** The strip's live metrics, for the draw and the hit test. Recomputed every frame by `apply`. */
    static strip: HudStrip.Strip = HudStrip.geometry(765, 503, NO_INSETS, 1);

    /**
     * The strip's anchors, rebuilt only when its metrics actually change.
     *
     * `apply` runs every frame, and the strip's ~33 entries would otherwise be ~33 fresh objects
     * per frame for a table that changes on a resize and never again. The cell is the whole key:
     * everything else in `Strip` is derived from it and the scale it was computed at.
     */
    private static stripCell: number = -1;
    private static stripCache: HudStrip.StripAnchor[] = [];

    private static stripAnchors(g: HudStrip.Strip): HudStrip.StripAnchor[] {
        if (g.cell !== MobileLayout.stripCell) {
            MobileLayout.stripCell = g.cell;
            MobileLayout.stripCache = HudStrip.anchors(g);
        }
        return MobileLayout.stripCache;
    }

    /**
     * Write one anchor onto its component.
     *
     * Shared by the static table and the computed strip so the safe-area rules below cannot come
     * to differ between them — which they would, because the strip is the cluster those rules are
     * hardest on: it is frame-anchored on the outside and `edge` on every child.
     */
    private static stamp(anchor: HudStrip.StripAnchor, insets: SafeInsets): void {
        const com: IfType | null = IfType.get(MobileLayout.packedLayer(anchor.com));
        if (com === null) {
            return;
        }
        MobileLayout.snapshot(anchor.com, com);
        if (anchor.hide) {
            com.hide = true;
            return;
        }
        // Safe-area padding is added to whichever edge the component is anchored to — that is
        // the only edge it can collide with. Anything marked `edge` is meant to reach the
        // glass and takes none.
        const pad: SafeInsets = anchor.edge ? NO_INSETS : insets;
        if (anchor.xa !== undefined) {
            com.xAlignment = anchor.xa;
            com.x = (anchor.x ?? 0) + (anchor.xa === X_RIGHT ? pad.right : anchor.xa === X_LEFT ? pad.left : 0);
        }
        if (anchor.ya !== undefined) {
            com.yAlignment = anchor.ya;
            com.y = (anchor.y ?? 0) + (anchor.ya === Y_BOTTOM ? pad.bottom : anchor.ya === Y_TOP ? pad.top : 0);
        }
        // A FILL size means "parent size MINUS this much", so the authored number is really a
        // margin — and a margin has to absorb the safe area on BOTH sides, not just the one
        // the component is anchored to. Padding only the origin slides the component inwards
        // while leaving its far edge where it was, so a left-anchored filled row would still
        // run out under the right-hand HUD by exactly the right inset.
        if (anchor.wa !== undefined) {
            com.widthAlignment = anchor.wa;
            com.width = (anchor.width ?? 0) + (anchor.wa === FILL ? pad.left + pad.right : 0);
        }
        if (anchor.ha !== undefined) {
            com.heightAlignment = anchor.ha;
            com.height = (anchor.height ?? 0) + (anchor.ha === FILL ? pad.top + pad.bottom : 0);
        }
        if (anchor.layer !== undefined) {
            com.layerId = MobileLayout.packedLayer(anchor.layer);
        }
    }

    /**
     * The collapsible half: what is on screen, and how solid it is drawn.
     *
     * Kept out of the anchor table on purpose. The table is a static statement about GEOMETRY that
     * `tools/verify-mobile-anchors.ts` parses out of this file and checks against the cache; these
     * are per-frame reads of mutable state, and folding them in would make the table's own numbers
     * a function of the HUD's mood.
     */
    private static applyHudState(): void {
        // Alpha on the panel art. Set on the backgrounds only, so tab icons, item icons and chat
        // text stay fully opaque on top of a see-through panel.
        for (const index of MobileLayout.PANELS) {
            const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
            if (com === null) {
                continue;
            }
            MobileLayout.snapshot(index, com);
            // A v3 GRAPHIC with a non-zero `trans` draws through `transScalePlotSprite` — real
            // per-pixel alpha the engine has always had and the cache never uses — so fading a
            // cache panel is one property, not a draw path. The level is the skin's, because it is
            // the same number the drawn containers are composited at.
            com.trans = HudSkin.trans;
        }

        // THE CHAT-MODE CELLS BECOME THE LOWER STRIP OF THEIR CHIP.
        //
        // The chip row is drawn over this bar and has no components of its own, so anything the
        // cache leaves lying here would go on quietly eating taps aimed at a chip — hit-testing
        // walks the component array whatever is painted on top. Parking each cell under the chip
        // that means the same thing turns that problem into the feature: the state line under
        // "Public" IS the cache's own control, so cycling On/Friends/Off still runs the cache's
        // hook and still tells the server, with nothing reimplemented.
        //
        // The TEXT is hidden rather than moved. It is the cache's two-line
        // "Public chat<br><col=00ff00>On", authored for a stone strip, and the chip draws both
        // parts itself in the skin's own type. Hiding it is safe precisely because the hook is on
        // the layer — see CHAT_MODE_CELLS.
        for (const [layerIndex, textIndex, chip] of MobileLayout.CHAT_MODE_CELLS) {
            const layer: IfType | null = IfType.get(MobileLayout.packedLayer(layerIndex));
            if (layer !== null) {
                MobileLayout.snapshot(layerIndex, layer);
                if (chip < 0) {
                    // Zero-sized: out of the draw and out of the hit test, without `hide`.
                    layer.x = 0;
                    layer.y = 0;
                    layer.width = 0;
                    layer.height = 0;
                } else {
                    const rect = MobileLayout.chipRect(chip);
                    layer.x = rect.x;
                    layer.y = rect.y + rect.h - HudSkin.CHIP_STATE_H;
                    layer.width = rect.w;
                    layer.height = HudSkin.CHIP_STATE_H;
                }
            }
            const text: IfType | null = IfType.get(MobileLayout.packedLayer(textIndex));
            if (text !== null) {
                MobileLayout.snapshot(textIndex, text);
                text.hide = true;
            }
        }

        // The side panel. `hide` takes a component out of the draw pass AND out of hit-testing,
        // which is the point — an invisible panel that still ate taps would be worse than no
        // toggle at all. The tab rows are deliberately untouched: they are the buttons.
        MobileLayout.setHidden(82, !MobileLayout.sidebarOpen);

        // COLLAPSING THE SECOND COLUMN moves the other two pieces of the right cluster out to
        // meet the edge — otherwise the column that remains floats 34px in from the frame with a
        // hole beside it. `containerRect` drops the hidden column from the union on its own, so
        // the slab behind them narrows with no help. These are absolute x values in the anchor
        // table's terms (an inset from the right edge), so they are written after `apply` has
        // stamped the table rather than in it.
        if (MobileLayout.stonesCollapsed) {
            MobileLayout.setHidden(10, true);
            const strip: IfType | null = IfType.get(MobileLayout.packedLayer(27));
            if (strip !== null) {
                strip.x = 0;
            }
            const panel: IfType | null = IfType.get(MobileLayout.packedLayer(82));
            if (panel !== null) {
                panel.x = 34;
            }
        } else {
            MobileLayout.setHidden(10, false);
        }

        // The chatbox and the chat-mode bar go together — the bar's three chat-filter buttons are
        // controls for the box, so leaving it up under a hidden box would be a strip of dead HUD.
        MobileLayout.setHidden(73, !MobileLayout.chatOpen);
        MobileLayout.setHidden(0, !MobileLayout.chatOpen);

        // com_66..70 are the five chat lines drawn straight onto the scene, and the table lifts
        // them 50px so the oldest clears the chat-mode bar. With the bar hidden that clearance is
        // ground they should be using, so give it back. The table keeps the chat-OPEN values,
        // which are the ones the overlap check in verify-mobile-anchors.ts cares about — closing
        // the chatbox only ever frees space.
        if (!MobileLayout.chatOpen) {
            for (let index: number = 66; index <= 70; index++) {
                const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
                if (com !== null) {
                    com.y -= 50;
                }
            }
        }
    }

    /** Hide/show one child of the pane, snapshotting it first so `restore` can put it back. */
    private static setHidden(index: number, hidden: boolean): void {
        const com: IfType | null = IfType.get(MobileLayout.packedLayer(index));
        if (com === null) {
            return;
        }
        MobileLayout.snapshot(index, com);
        com.hide = hidden;
    }

    /** Put every touched component back exactly as the cache decoded it. */
    private static restore(): void {
        for (const base of MobileLayout.bases.values()) {
            const com: IfType = base.com;
            com.x = base.x;
            com.y = base.y;
            com.width = base.width;
            com.height = base.height;
            com.xAlignment = base.xa;
            com.yAlignment = base.ya;
            com.widthAlignment = base.wa;
            com.heightAlignment = base.ha;
            com.layerId = base.layerId;
            com.hide = base.hide;
            com.trans = base.trans;
            com.hAlign = base.hAlign;
        }
    }

    /**
     * Capture cache geometry the first time this component INSTANCE is seen.
     *
     * Keyed on object identity, not just child index: `unloadInterface` throws the array away and
     * the pane is decoded into fresh objects, so a stale snapshot would restore into components
     * that no longer exist. A fresh instance is always freshly decoded — i.e. holding exactly the
     * cache values — so re-snapshotting it is always safe and always correct.
     */
    private static snapshot(index: number, com: IfType): void {
        const existing: Base | undefined = MobileLayout.bases.get(index);
        if (existing !== undefined && existing.com === com) {
            return;
        }
        MobileLayout.bases.set(index, {
            com,
            x: com.x,
            y: com.y,
            width: com.width,
            height: com.height,
            xa: com.xAlignment,
            ya: com.yAlignment,
            wa: com.widthAlignment,
            ha: com.heightAlignment,
            layerId: com.layerId,
            hide: com.hide,
            trans: com.trans,
            hAlign: com.hAlign
        });
    }
}
