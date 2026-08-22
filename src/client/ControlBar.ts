import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';
import HudSkin from '#/client/HudSkin.js';
import If3Live from '#/client/If3Live.js';
import MobileLayout from '#/client/MobileLayout.js';
import ScreenMode from '#/client/ScreenMode.js';
import GlRenderer from '#/dash3d/GlRenderer.js';
import World from '#/dash3d/World.js';

// Plain-DOM settings panel that lives with the client (see public/index.html), in the spirit of the
// 2004scape webclient's text controls. It owns every client-side user preference - display mode,
// WASD camera, the side-tab hotkey bindings - persists them to localStorage and renders one
// settings button that opens a tabbed panel (Display / HUD / Game / Hotkeys).
//
// It deliberately imports nothing from Client: Client imports ControlBar, reads ControlBar.settings
// on boot and registers `onWasdChange`, so there is no module cycle. ScreenMode is import-safe for
// the same reason (it talks to GameShell/IfType, never to Client).
//
// Adding a control is one entry in the registry below - the panel is rendered from `controls`, not
// hardcoded, and a control's `tab` decides which page it lands on. The panel body scrolls; a
// control's `hint` is a tooltip, not a paragraph, so the page stays one row per setting.

export type ChoiceOption = {
    label: string;
    value: number;
};

export type Control = {
    id: string;
    label: string;
    // 'toggle' renders an ON/OFF pill, 'action' a button, 'keybind' a keycap that rebinds on click
    // and 'choice' a row of mutually exclusive options.
    kind: 'toggle' | 'action' | 'keybind' | 'choice';
    // settings page this control belongs to
    tab: string;
    // optional heading printed once in front of a run of controls that share it
    group?: string;
    get?: () => boolean;
    set?: (value: boolean) => void;
    run?: () => void;
    // 'keybind' only: the side-tab index this control binds a key to
    tabIndex?: number;
    // 'choice' only
    options?: ChoiceOption[];
    getChoice?: () => number;
    setChoice?: (value: number) => void;
    // optional dimmed explanatory text rendered immediately after the control
    hint?: string;
};

type Settings = {
    wasd: boolean;
    // client keycode -> tab index
    keys: Record<string, number>;
    // 3D raster scale: 1 = full res, 2 = half res. Applies in every screen mode and on both
    // renderers - cost is pixel count, and a full-res 1600x900 viewport is ~13x the pixels of the
    // fixed 512x334 one. Defaults to FULL so a fresh install looks exactly like the cache baseline;
    // half res is the lever you reach for once the viewport is large.
    detail: number;
    // Tile draw distance (World.visibilityRadius). 25 = cache baseline; landscape is drawn this far
    // in every direction (the far clip follows it). Only the landscape reaches the extra distance -
    // players and NPCs only appear as far as the server broadcasts them.
    drawDist: number;
    fps: boolean;
    // GPU (WebGL) scene renderer instead of the software rasterizer
    gpu: boolean;
    // Shift-click promotes an interface's bulk option (Drop / Deposit-All / Buy 50 / Offer-All)
    // to the default left-click. Read straight off this by Client.shiftMenuOption.
    shiftClick: boolean;
    // Floating "Coal x 9" labels over ground piles. Drawn by Client.groundItemOverlays.
    groundItems: boolean;
    // Collapse a pile's repeated right-click lines into one "Coal x 9". Read by Client.groundItemMenu.
    groundItemMenu: boolean;
    // Draw the levels above the player at all. ON is the cache's own behaviour, where a roof is
    // drawn until you walk under it; OFF clamps the scene to your own plane permanently. Read by
    // Client.showRoofs in gameDrawMain.
    roofs: boolean;
    // Resizable layout: the frame grows to the window, the 3D scene fills it and MobileLayout
    // re-anchors pane 548's HUD around it. Off = the authentic fixed 765x503 frame, letterboxed.
    resizable: boolean;
    // Alpha every HUD surface is composited at in the resizable layout (HudSkin.trans).
    // 0 = the cache's solid art. Higher is more see-through; the blit gets 256 - this.
    hudTrans: number;
    // Fold the second column of side tabs away (MobileLayout.stonesCollapsed): the seven combat
    // and inventory tabs stay, the six social ones go, and the strip slides out to the frame edge.
    oneColumn: boolean;
    // Draw the minimap as a bare circle with a thin ring instead of the cache's frame sprite.
    // Resizable only: the fixed frame's trim is authored around that art.
    minimalMap: boolean;
    // Right-click menu row pitch, as a target in CSS pixels. The cache's own is 15 FRAME pixels,
    // which on a phone is about 11pt of glass. See Client.menuRowPitch.
    menuRows: number;
    // Smallest frame height the resizable layout will fit to (ScreenMode.minHeight), i.e. how
    // large the HUD is drawn. Lower = bigger HUD and an open side panel covers more of the
    // minimap; 499 is the height at which they exactly stop touching.
    hudMin: number;
    // How much of the SIDE safe-area inset the HUD keeps, 0..1 (ScreenMode.edgeMargin). Full is
    // what iOS asks for; None reclaims ~60pt of dead band on each edge of a notched phone, and is
    // right whenever the cutout is not on that side. The bottom inset is never scaled.
    edgeMargin: number;
};

/**
 * Whether the resizable layout is on by default.
 *
 * Touch devices: yes. The fixed frame is landscape 1.52:1 and a phone is about 2.17:1, so fitting
 * it leaves roughly 40% of the screen as black bar AND shrinks the frame below 1:1 — "authentic"
 * is not a useful default when it costs half the screen. Desktop: no, the fixed layout is the
 * point there and resizable is a setting you choose.
 */
const TOUCH_DEFAULT: boolean = 'ontouchstart' in globalThis || (globalThis.navigator?.maxTouchPoints ?? 0) > 0;

/**
 * A fresh preferences blob.
 *
 * One function rather than a literal repeated at each site, because there are two of them (the
 * static initialiser and the fallback inside `load`) and they must never drift: a new key added to
 * one and not the other is a setting that reads as `undefined` on exactly the installs that have a
 * stored blob.
 *
 * The touch defaults are the collapsible-HUD ones — see-through panels, a bare minimap and a menu
 * row you can actually hit. Desktop keeps the cache exactly as authored; that is the point of the
 * fixed layout, and every one of these only does anything in the resizable one anyway.
 */
function defaults(): Settings {
    return {
        wasd: true,
        keys: { ...DEFAULT_KEYS },
        detail: 1,
        drawDist: 25,
        fps: false,
        gpu: false,
        shiftClick: true,
        groundItems: true,
        groundItemMenu: true,
        // ON is the cache baseline. Roof removal is a PK convenience, not the authored look.
        roofs: true,
        resizable: TOUCH_DEFAULT,
        // See-through EVERYWHERE, not just on touch. It reads as a touch-only default and is not
        // one: it does nothing at all outside the resizable layout (MobileLayout only stamps
        // `panelTrans` when it is applied), so `0` on desktop only meant that anyone who switched
        // to resizable got the see-through HUD's arrangement drawn in solid slabs, with no hint
        // that the setting making it so was one panel away.
        hudTrans: HUD_TRANS_LIGHT,
        oneColumn: false,
        minimalMap: TOUCH_DEFAULT,
        menuRows: TOUCH_DEFAULT ? MENU_ROWS_LARGE : MENU_ROWS_CACHE,
        // FIT by default: it is the height at which an open side panel stops covering the
        // minimap, and having the two fight is worse than the HUD being a fifth smaller.
        hudMin: HUD_MIN_FIT,
        edgeMargin: EDGE_FULL
    };
}

/**
 * The three HUD alpha steps offered in the panel. Higher is more see-through.
 *
 * 84 lands the containers at ~67% opaque. It was 70 (~73%), which was chosen against the old
 * palette — a mid-grey fill behind a bright rim, where any more transparency turned the rim into
 * the only thing you could see. A near-black panel with no rim can afford the extra, and needs it:
 * dark and solid is a hole in the screen.
 *
 * A stored 70 does not survive `load`'s whitelist, so an existing install lands back on this
 * default rather than on a value the panel can no longer show as selected.
 */
export const HUD_TRANS_LIGHT: number = 84;
export const HUD_TRANS_HEAVY: number = 140;

/**
 * HUD size presets — the frame height the resizable layout fits to, so LOWER means a BIGGER HUD.
 * 350 is ScreenMode's floor and 420 is minimap 156 + panel 261, the point at which an open panel
 * exactly stops touching the minimap. 385 splits the difference. (420, not 499, because the tab
 * strip sits BESIDE the panel rather than under it — see MobileLayout's tab-strip note.)
 */
export const HUD_MIN_LARGE: number = 350;
export const HUD_MIN_MEDIUM: number = 385;
export const HUD_MIN_FIT: number = 420;

/** Side safe-area presets. See ScreenMode.edgeMargin for why this is a dial and not a constant. */
export const EDGE_FULL: number = 1;
export const EDGE_HALF: number = 0.5;
export const EDGE_NONE: number = 0;

/** Menu row pitch presets, as targets in CSS pixels. 15 is the cache's own pitch in frame pixels. */
export const MENU_ROWS_CACHE: number = 15;
export const MENU_ROWS_LARGE: number = 24;
export const MENU_ROWS_HUGE: number = 32;

const STORAGE_KEY: string = 'rune465.settings.v2';
// superseded key, read once so an existing install keeps its hotkeys
const LEGACY_KEY: string = 'rune465.controlbar.v1';

export const TAB_DISPLAY: string = 'Display';
export const TAB_HUD: string = 'HUD';
export const TAB_GAME: string = 'Game';
export const TAB_HOTKEYS: string = 'Hotkeys';

// Side tabs of the 465 fixed game frame (window 548), in sidebar order (top row left-to-right,
// then bottom row). `com` is the packed component id (548 << 16 | child) whose op-1 hook switches
// the sidebar - exactly what a mouse click on the tab icon runs. The child ids are the components
// of 548 that carry a tab op name ("Combat Options", "Stats", "Quest List", ...).
export const TABS: { label: string; com: number }[] = [
    { label: 'Combat', com: (548 << 16) | 30 },
    { label: 'Skills', com: (548 << 16) | 31 },
    { label: 'Quest', com: (548 << 16) | 32 },
    { label: 'Inventory', com: (548 << 16) | 33 },
    { label: 'Equipment', com: (548 << 16) | 34 },
    { label: 'Prayer', com: (548 << 16) | 35 },
    { label: 'Magic', com: (548 << 16) | 36 },
    { label: 'Friends', com: (548 << 16) | 14 },
    { label: 'Ignore', com: (548 << 16) | 15 },
    { label: 'Logout', com: (548 << 16) | 16 },
    { label: 'Settings', com: (548 << 16) | 17 },
    { label: 'Emotes', com: (548 << 16) | 18 },
    { label: 'Music', com: (548 << 16) | 19 }
];

// Default bindings: the number row 1-9 then 0, straight down the sidebar order. That covers the
// first ten tabs (Combat .. Logout); Settings/Emotes/Music start unbound and can be given any
// key from the panel. Values are the client's internal keycodes (see
// ClientKeyboardListener.setupKeyCodeMap): 16..24 = '1'..'9', 25 = '0'.
export const DEFAULT_KEYS: Record<string, number> = {
    16: 0,
    17: 1,
    18: 2,
    19: 3,
    20: 4,
    21: 5,
    22: 6,
    23: 7,
    24: 8,
    25: 9
};

// browser event.keyCode -> printable name, for the keys the client's keycode map understands
const KEY_NAMES: [number, string][] = (() => {
    const names: [number, string][] = [
        [8, 'Backspace'],
        [9, 'Tab'],
        [13, 'Enter'],
        [27, 'Esc'],
        [32, 'Space'],
        [33, 'PgUp'],
        [34, 'PgDn'],
        [35, 'End'],
        [36, 'Home'],
        [37, 'Left'],
        [38, 'Up'],
        [39, 'Right'],
        [40, 'Down']
    ];
    for (let i = 48; i <= 57; i++) names.push([i, String.fromCharCode(i)]);
    for (let i = 65; i <= 90; i++) names.push([i, String.fromCharCode(i)]);
    for (let i = 112; i <= 123; i++) names.push([i, 'F' + (i - 111)]);
    return names;
})();

export default class ControlBar {
    static settings: Settings = defaults();

    // set by Client so a panel toggle drives Client.wasdMode
    static onWasdChange: ((value: boolean) => void) | null = null;
    // set by Client so the FPS row drives Client.showFpsCounter
    static onFpsChange: ((value: boolean) => void) | null = null;
    // set by Client so the ground-items row drives Client.showGroundItems
    static onGroundItemsChange: ((value: boolean) => void) | null = null;
    // set by Client so the pile-menu row drives Client.groundItemMenu
    static onGroundMenuChange: ((value: boolean) => void) | null = null;
    // set by Client so the roofs row drives Client.showRoofs
    static onRoofsChange: ((value: boolean) => void) | null = null;

    static readonly controls: Control[] = [];

    private static root: HTMLElement | null = null;
    private static panel: HTMLElement | null = null;
    private static open: boolean = false;
    private static activeTab: string = TAB_DISPLAY;
    // tab currently being rebound, -1 = none
    private static capturing: number = -1;
    // document-level key listeners attached; kept until the key is released so the keypress
    // char of the bound key can't slip through to the canvas
    private static armed: boolean = false;
    private static keyToTab: Map<number, number> = new Map();

    // ---- state -------------------------------------------------------------

    static load(): void {
        let stored: unknown = null;
        let legacy: boolean = false;
        try {
            let raw = globalThis.localStorage?.getItem(STORAGE_KEY);
            if (raw === null || raw === undefined) {
                raw = globalThis.localStorage?.getItem(LEGACY_KEY);
                legacy = raw !== null && raw !== undefined;
            }
            stored = raw === null || raw === undefined ? null : JSON.parse(raw);
        } catch {
            stored = null;
        }
        // Anything unexpected falls back to defaults - a bad parse here must never be able to
        // break keyboard input.
        const settings: Settings = defaults();
        if (stored !== null && typeof stored === 'object') {
            const obj = stored as Record<string, unknown>;
            if (typeof obj.wasd === 'boolean') {
                settings.wasd = obj.wasd;
            }
            if (obj.keys !== null && typeof obj.keys === 'object') {
                const keys: Record<string, number> = {};
                for (const [code, tab] of Object.entries(obj.keys as Record<string, unknown>)) {
                    const codeNum = Number(code);
                    if (!Number.isInteger(codeNum) || codeNum < 0 || codeNum > 255) continue;
                    if (typeof tab !== 'number' || !Number.isInteger(tab) || tab < 0 || tab >= TABS.length) continue;
                    keys[String(codeNum)] = tab;
                }
                settings.keys = keys;
            }
            // v1 blobs carry no display prefs at all - the defaults above stand. A stored `screen`
            // from when this had display presets is simply dropped: there is only one now.
            if (!legacy) {
                if (obj.detail === 1 || obj.detail === 2) {
                    settings.detail = obj.detail;
                }
                if (obj.drawDist === 15 || obj.drawDist === 25 || obj.drawDist === 35 || obj.drawDist === 45) {
                    settings.drawDist = obj.drawDist;
                }
                if (typeof obj.fps === 'boolean') {
                    settings.fps = obj.fps;
                }
                if (typeof obj.gpu === 'boolean') {
                    settings.gpu = obj.gpu;
                }
                if (typeof obj.shiftClick === 'boolean') {
                    settings.shiftClick = obj.shiftClick;
                }
                if (typeof obj.groundItems === 'boolean') {
                    settings.groundItems = obj.groundItems;
                }
                if (typeof obj.groundItemMenu === 'boolean') {
                    settings.groundItemMenu = obj.groundItemMenu;
                }
                if (typeof obj.roofs === 'boolean') {
                    settings.roofs = obj.roofs;
                }
                if (typeof obj.resizable === 'boolean') {
                    settings.resizable = obj.resizable;
                }
                if (obj.hudTrans === 0 || obj.hudTrans === HUD_TRANS_LIGHT || obj.hudTrans === HUD_TRANS_HEAVY) {
                    settings.hudTrans = obj.hudTrans;
                }
                if (typeof obj.oneColumn === 'boolean') {
                    settings.oneColumn = obj.oneColumn;
                }
                if (typeof obj.minimalMap === 'boolean') {
                    settings.minimalMap = obj.minimalMap;
                }
                if (obj.menuRows === MENU_ROWS_CACHE || obj.menuRows === MENU_ROWS_LARGE || obj.menuRows === MENU_ROWS_HUGE) {
                    settings.menuRows = obj.menuRows;
                }
                if (obj.hudMin === HUD_MIN_LARGE || obj.hudMin === HUD_MIN_MEDIUM || obj.hudMin === HUD_MIN_FIT) {
                    settings.hudMin = obj.hudMin;
                }
                if (obj.edgeMargin === EDGE_FULL || obj.edgeMargin === EDGE_HALF || obj.edgeMargin === EDGE_NONE) {
                    settings.edgeMargin = obj.edgeMargin;
                }
            }
        }
        ControlBar.settings = settings;
        ControlBar.reindex();
    }

    static save(): void {
        try {
            globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(ControlBar.settings));
        } catch {
            // private mode / quota: preferences just don't persist
        }
    }

    private static reindex(): void {
        ControlBar.keyToTab = new Map();
        for (const [code, tab] of Object.entries(ControlBar.settings.keys)) {
            ControlBar.keyToTab.set(Number(code), tab);
        }
    }

    // Client's key gate calls this: client keycode -> tab index, or -1.
    static tabForKey(code: number): number {
        const tab = ControlBar.keyToTab.get(code);
        return tab === undefined ? -1 : tab;
    }

    static setWasd(value: boolean): void {
        ControlBar.settings.wasd = value;
        ControlBar.save();
        ControlBar.render();
    }

    /**
     * Switch layout from outside the settings panel — `::layout` in the chatbox.
     *
     * Does everything the panel's own Layout control does, in the same order, so the two routes
     * cannot leave the preference and the surface disagreeing. It exists because the panel is not
     * always reachable: on a phone in the fixed layout it opens upward from a button near the
     * bottom of the screen and the page cannot scroll, so the row that switches back could sit off
     * the top of the window.
     */
    static setResizable(value: boolean): void {
        ControlBar.settings.resizable = value;
        ControlBar.save();
        ScreenMode.setResizable(value);
        ControlBar.render();
    }

    // ::grounditems flips it from the chatbox; keep the panel pill in step.
    static setGroundItems(value: boolean): void {
        ControlBar.settings.groundItems = value;
        ControlBar.save();
        ControlBar.render();
    }

    // ::groundmenu, same deal.
    static setGroundMenu(value: boolean): void {
        ControlBar.settings.groundItemMenu = value;
        ControlBar.save();
        ControlBar.render();
    }

    // ::roofs, same deal. Client.setRoofsMode is the pair that also moves what the scene reads.
    static setRoofs(value: boolean): void {
        ControlBar.settings.roofs = value;
        ControlBar.save();
        ControlBar.render();
    }

    static isCapturing(): boolean {
        return ControlBar.armed;
    }

    static register(control: Control): void {
        ControlBar.controls.push(control);
        ControlBar.render();
    }

    /** Push the stored display preferences into ScreenMode (boot, and after every change). */
    private static applyScreen(): void {
        ScreenMode.setResizable(ControlBar.settings.resizable);
        ScreenMode.setRenderScale(ControlBar.settings.detail);
        World.setVisibilityRadius(ControlBar.settings.drawDist);
        MobileLayout.stonesCollapsed = ControlBar.settings.oneColumn;
        ControlBar.applyHudTrans(ControlBar.settings.hudTrans);
        ScreenMode.setMinHeight(ControlBar.settings.hudMin);
        ScreenMode.setEdgeMargin(ControlBar.settings.edgeMargin);
    }

    /**
     * The HUD's alpha, in the one place that owns it plus the stylesheet that mirrors it.
     *
     * `HudSkin` holds the level — every drawn surface composites at it, and `MobileLayout`
     * re-asserts it onto the cache panel sprites on every frame it stamps, so it only has to be
     * written once per change. `publishCss` re-stamps the CSS custom properties because the DOM
     * chrome's translucency has to track the canvas's, or the buttons float at a different weight
     * to the panels they sit beside.
     */
    private static applyHudTrans(value: number): void {
        HudSkin.trans = value;
        HudSkin.publishCss(globalThis.document?.body ?? null);
    }

    // ---- dom ---------------------------------------------------------------

    static init(): void {
        ControlBar.load();

        ControlBar.controls.push({
            id: 'layout',
            label: 'Layout',
            kind: 'choice',
            tab: TAB_DISPLAY,
            hint: 'Resizable fills the window: the 3D scene becomes the whole frame and the HUD anchors to the corners.',
            options: [
                { label: 'Fixed', value: 0 },
                { label: 'Resizable', value: 1 }
            ],
            getChoice: (): number => (ControlBar.settings.resizable ? 1 : 0),
            setChoice: (value: number): void => {
                ControlBar.settings.resizable = value === 1;
                ControlBar.save();
                ScreenMode.setResizable(ControlBar.settings.resizable);
                // The gear itself changes shape with the layout — labelled in a strip below a
                // fixed frame, a bare icon in the overlay stack — so this one setting has to
                // redraw the control that set it.
                ControlBar.render();
            }
        });
        ControlBar.controls.push({
            id: 'detail',
            label: '3D detail',
            kind: 'choice',
            tab: TAB_DISPLAY,
            group: 'Graphics',
            hint: 'Half res renders the 3D scene at 1/4 the pixels and upscales — much faster at large sizes.',
            options: [
                { label: 'Full res', value: 1 },
                { label: 'Half res', value: 2 }
            ],
            getChoice: (): number => ControlBar.settings.detail,
            setChoice: (value: number): void => {
                ControlBar.settings.detail = value;
                ControlBar.save();
                ScreenMode.setRenderScale(value);
            }
        });
        ControlBar.controls.push({
            id: 'drawdist',
            label: 'Draw distance',
            kind: 'choice',
            tab: TAB_DISPLAY,
            group: 'Graphics',
            hint: 'Landscape is drawn this far in tiles; the far clip follows. Players and NPCs only appear as far as the server sends them.',
            options: [
                { label: 'Near', value: 15 },
                { label: 'Normal', value: 25 },
                { label: 'Far', value: 35 },
                { label: 'Max', value: 45 }
            ],
            getChoice: (): number => ControlBar.settings.drawDist,
            setChoice: (value: number): void => {
                ControlBar.settings.drawDist = value;
                ControlBar.save();
                World.setVisibilityRadius(value);
            }
        });
        ControlBar.controls.push({
            id: 'renderer',
            label: 'Renderer',
            kind: 'choice',
            tab: TAB_DISPLAY,
            group: 'Graphics',
            hint: 'GPU uses WebGL and falls back to software if init fails.',
            options: [
                { label: 'Software', value: 0 },
                { label: 'GPU', value: 1 }
            ],
            // Report what is actually in use, not what was asked for: a failed GL init silently
            // falls back, and the pill must not claim GPU while the software rasterizer is drawing.
            getChoice: (): number => (GlRenderer.enabled ? 1 : 0),
            setChoice: (value: number): void => {
                GlRenderer.enabled = value === 1 && GlRenderer.ready();
                ControlBar.settings.gpu = GlRenderer.enabled;
                ControlBar.save();
            }
        });
        ControlBar.controls.push({
            id: 'roofs',
            label: 'Roofs',
            kind: 'toggle',
            tab: TAB_DISPLAY,
            group: 'Graphics',
            hint: 'On is the cache behaviour — a roof is drawn until you walk under it. Off never draws above your own floor, so upper storeys and bridges go with it.',
            get: (): boolean => ControlBar.settings.roofs,
            set: (value: boolean): void => {
                ControlBar.settings.roofs = value;
                ControlBar.save();
                ControlBar.onRoofsChange?.(value);
            }
        });
        ControlBar.controls.push({
            id: 'fps',
            label: 'FPS counter',
            kind: 'toggle',
            tab: TAB_DISPLAY,
            group: 'Debug',
            get: (): boolean => ControlBar.settings.fps,
            set: (value: boolean): void => {
                ControlBar.settings.fps = value;
                ControlBar.save();
                ControlBar.onFpsChange?.(value);
            }
        });
        ControlBar.controls.push({
            id: 'if3live',
            label: 'IF3 editor',
            kind: 'action',
            tab: TAB_DISPLAY,
            group: 'Debug',
            hint: 'F8 — edits the real widget draw path. Save writes .if3 via :8799, never server/cache/.',
            run: (): void => If3Live.toggle()
        });

        ControlBar.controls.push({
            id: 'hudsize',
            label: 'HUD size',
            kind: 'choice',
            tab: TAB_HUD,
            hint: 'Resizable only. Large fills the screen but an open side panel covers part of the minimap; Fit is the height at which they stop touching.',
            options: [
                { label: 'Large', value: HUD_MIN_LARGE },
                { label: 'Medium', value: HUD_MIN_MEDIUM },
                { label: 'Fit', value: HUD_MIN_FIT }
            ],
            getChoice: (): number => ControlBar.settings.hudMin,
            setChoice: (value: number): void => {
                ControlBar.settings.hudMin = value;
                ControlBar.save();
                ScreenMode.setMinHeight(value);
            }
        });
        ControlBar.controls.push({
            id: 'hudtrans',
            label: 'Panels',
            kind: 'choice',
            tab: TAB_HUD,
            hint: 'Resizable only. Alpha on the panel art, so the world shows through behind chat, tabs and the sidebar. Icons and text stay solid.',
            options: [
                { label: 'Solid', value: 0 },
                { label: 'See-through', value: HUD_TRANS_LIGHT },
                { label: 'Ghost', value: HUD_TRANS_HEAVY }
            ],
            getChoice: (): number => ControlBar.settings.hudTrans,
            setChoice: (value: number): void => {
                ControlBar.settings.hudTrans = value;
                ControlBar.save();
                ControlBar.applyHudTrans(value);
            }
        });
        ControlBar.controls.push({
            id: 'sidetabs',
            label: 'Side tabs',
            kind: 'choice',
            tab: TAB_HUD,
            hint: 'Resizable only. One column keeps the seven combat and inventory tabs and folds away Friends, Ignore, Logout, Options, Emotes and Music.',
            options: [
                { label: 'Two columns', value: 0 },
                { label: 'One column', value: 1 }
            ],
            getChoice: (): number => (ControlBar.settings.oneColumn ? 1 : 0),
            setChoice: (value: number): void => {
                ControlBar.settings.oneColumn = value === 1;
                ControlBar.save();
                MobileLayout.stonesCollapsed = ControlBar.settings.oneColumn;
            }
        });
        ControlBar.controls.push({
            id: 'minimalmap',
            label: 'Minimap',
            kind: 'choice',
            tab: TAB_HUD,
            hint: 'Resizable only. The bare map circle with a thin ring, instead of the stone frame the fixed layout is built around.',
            options: [
                { label: 'Cache art', value: 0 },
                { label: 'Thin ring', value: 1 }
            ],
            getChoice: (): number => (ControlBar.settings.minimalMap ? 1 : 0),
            setChoice: (value: number): void => {
                ControlBar.settings.minimalMap = value === 1;
                ControlBar.save();
            }
        });
        ControlBar.controls.push({
            id: 'edgemargin',
            label: 'Edge margin',
            kind: 'choice',
            tab: TAB_HUD,
            hint: "Resizable only. How much of the phone's side safe area the HUD keeps clear. None pulls the tabs, minimap and hotkeys out to the glass — correct unless the notch is on that side.",
            options: [
                { label: 'Full', value: EDGE_FULL },
                { label: 'Half', value: EDGE_HALF },
                { label: 'None', value: EDGE_NONE }
            ],
            getChoice: (): number => ControlBar.settings.edgeMargin,
            setChoice: (value: number): void => {
                ControlBar.settings.edgeMargin = value;
                ControlBar.save();
                ScreenMode.setEdgeMargin(value);
            }
        });
        ControlBar.controls.push({
            id: 'menurows',
            label: 'Menu rows',
            kind: 'choice',
            tab: TAB_HUD,
            hint: "Right-click menu row height, held constant in real screen pixels. The cache's 15 is about 11pt on a phone.",
            options: [
                { label: 'Cache', value: MENU_ROWS_CACHE },
                { label: 'Large', value: MENU_ROWS_LARGE },
                { label: 'Huge', value: MENU_ROWS_HUGE }
            ],
            getChoice: (): number => ControlBar.settings.menuRows,
            setChoice: (value: number): void => {
                ControlBar.settings.menuRows = value;
                ControlBar.save();
            }
        });

        ControlBar.controls.push({
            id: 'wasd',
            label: 'WASD camera',
            kind: 'toggle',
            tab: TAB_GAME,
            hint: 'Press Enter to switch between typing and WASD.',
            get: (): boolean => ControlBar.settings.wasd,
            set: (value: boolean): void => {
                ControlBar.settings.wasd = value;
                ControlBar.save();
                ControlBar.onWasdChange?.(value);
            }
        });
        ControlBar.controls.push({
            id: 'shiftclick',
            label: 'Shift-click',
            kind: 'toggle',
            tab: TAB_GAME,
            hint: 'Hold Shift to drop, deposit-all, offer-all or buy the largest amount.',
            get: (): boolean => ControlBar.settings.shiftClick,
            set: (value: boolean): void => {
                ControlBar.settings.shiftClick = value;
                ControlBar.save();
            }
        });
        ControlBar.controls.push({
            id: 'grounditems',
            label: 'Item names',
            kind: 'toggle',
            tab: TAB_GAME,
            hint: 'Floating labels over ground piles. A non-stackable drop is one obj per item, so a 9-coal pile draws as a single lump without this.',
            get: (): boolean => ControlBar.settings.groundItems,
            set: (value: boolean): void => {
                ControlBar.settings.groundItems = value;
                ControlBar.save();
                ControlBar.onGroundItemsChange?.(value);
            }
        });
        ControlBar.controls.push({
            id: 'groundmenu',
            label: 'Pile menu',
            kind: 'toggle',
            tab: TAB_GAME,
            hint: "One 'Take Coal x 9' line instead of nine 'Take Coal' lines. Each click still takes one.",
            get: (): boolean => ControlBar.settings.groundItemMenu,
            set: (value: boolean): void => {
                ControlBar.settings.groundItemMenu = value;
                ControlBar.save();
                ControlBar.onGroundMenuChange?.(value);
            }
        });

        for (let i = 0; i < TABS.length; i++) {
            ControlBar.controls.push({ id: 'tab' + i, label: TABS[i].label, kind: 'keybind', tab: TAB_HOTKEYS, group: 'Side tabs', tabIndex: i });
        }
        ControlBar.controls.push({
            id: 'defaults',
            // shares the group so it renders inside that section rather than opening a new one
            group: 'Side tabs',
            tab: TAB_HOTKEYS,
            label: 'reset to defaults',
            kind: 'action',
            run: (): void => {
                ControlBar.settings.keys = { ...DEFAULT_KEYS };
                ControlBar.reindex();
                ControlBar.save();
            }
        });

        // ScreenMode re-renders the panel whenever the surface changes underneath it (a window
        // resize, the title screen forcing the frame back) so the pills never show stale state.
        ScreenMode.onChange = (): void => ControlBar.render();
        ControlBar.applyScreen();
        // Restore the renderer choice, but only if WebGL actually comes up - a stored `true` on a
        // machine that can't init GL must not leave the scene blank.
        GlRenderer.enabled = ControlBar.settings.gpu && GlRenderer.ready();
        ControlBar.settings.gpu = GlRenderer.enabled;
        ControlBar.render();
    }

    private static container(): HTMLElement | null {
        if (ControlBar.root !== null) {
            return ControlBar.root;
        }
        if (typeof document === 'undefined') {
            return null;
        }
        ControlBar.root = document.getElementById('controlbar');
        return ControlBar.root;
    }

    private static focusGame(): void {
        // Real DOM means real focus: hand it straight back so the canvas keeps receiving keys.
        document.getElementById('canvas')?.focus();
    }

    private static button(label: string, title: string, onClick: () => void, className: string = 'cb-btn', html: string = ''): HTMLButtonElement {
        const el = document.createElement('button');
        el.className = className;
        el.type = 'button';
        // `html` is for the baked pixel glyphs, which are an <img> rather than a character. It is
        // never user input — the only caller passes HudSkin.glyphUri's data: URI.
        if (html !== '') {
            el.innerHTML = html;
        } else {
            el.textContent = label;
        }
        el.title = title;
        el.onclick = (): void => onClick();
        return el;
    }

    /**
     * A keybind entry rendered as a keycap followed by its tab name, e.g. [1] Combat.
     * Unbound tabs get a dimmed placeholder cap so the row keeps its rhythm.
     */
    private static keyButton(cap: string, name: string, title: string, onClick: () => void, capturing: boolean): HTMLButtonElement {
        const el = document.createElement('button');
        el.className = 'cb-key' + (capturing ? ' cb-key-capturing' : '') + (cap === '-' ? ' cb-key-unbound' : '');
        el.type = 'button';
        el.title = title;
        el.onclick = (): void => onClick();

        const capEl = document.createElement('span');
        capEl.className = 'cb-cap';
        capEl.textContent = cap;
        el.append(capEl);

        const nameEl = document.createElement('span');
        nameEl.className = 'cb-name';
        nameEl.textContent = name;
        el.append(nameEl);
        return el;
    }

    private static setOpen(open: boolean): void {
        ControlBar.open = open;
        if (!open) {
            ControlBar.capturing = -1;
            ControlBar.disarm();
        }
        ControlBar.render();
        if (!open) {
            ControlBar.focusGame();
        }
    }

    static render(): void {
        const root = ControlBar.container();
        if (root === null) {
            return;
        }
        // Toggling a pill rebuilds the panel; keep the scrolled page where it was.
        const prevBody = ControlBar.panel?.querySelector('.cb-body');
        const prevScroll = prevBody instanceof HTMLElement ? prevBody.scrollTop : 0;
        const prevTab = ControlBar.panel?.getAttribute('data-tab') ?? '';
        root.textContent = '';
        // The button hangs off the bottom of the frame, and the fit reserves ScreenMode's
        // BUTTON_STRIP for it, so it is always on screen.
        //
        // Icon only whenever the RESIZABLE layout is on — not just on touch, which is what this
        // used to test. In that layout the button is the bottom cell of the left-edge stack and
        // has to be the same 44px square as the ones above it; the word is also 60-odd pixels of
        // the world spent saying what a gear already says. Fixed layout keeps the label, where it
        // sits in a strip below the frame with room to spare.
        const iconOnly: boolean = TOUCH_DEFAULT || ScreenMode.resizable;
        const label = iconOnly ? '⚙' : ControlBar.open ? '⚙ Settings ▾' : '⚙ Settings';
        // Icon-only means it is a cell of the left-edge stack, so it takes the hand-drawn glyph
        // the other two carry rather than the ⚙ character — which is a font, and looked like one
        // beside two pixel icons. The character stays as the fallback and for the labelled form.
        const glyph: string = iconOnly ? HudSkin.glyphUri('ui_settings') : '';
        const openBtn = ControlBar.button(label, 'Client settings', () => ControlBar.setOpen(!ControlBar.open), 'cb-open' + (ControlBar.open ? ' cb-open-active' : ''), glyph === '' ? '' : `<img src="${glyph}" width="24" height="24" alt="" aria-hidden="true">`);
        root.append(openBtn);
        if (!ControlBar.open) {
            ControlBar.panel = null;
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'cb-panel';
        ControlBar.panel = panel;

        const head = document.createElement('div');
        head.className = 'cb-head';
        const headTitle = document.createElement('span');
        headTitle.className = 'cb-head-title';
        headTitle.textContent = 'Settings';
        head.append(headTitle);
        head.append(ControlBar.button('×', 'Close settings', () => ControlBar.setOpen(false), 'cb-close'));
        panel.append(head);

        // Tab strip, in first-seen order so the registry alone decides the page order.
        const tabNames: string[] = [];
        for (const control of ControlBar.controls) {
            if (!tabNames.includes(control.tab)) {
                tabNames.push(control.tab);
            }
        }
        if (!tabNames.includes(ControlBar.activeTab)) {
            ControlBar.activeTab = tabNames[0] ?? TAB_DISPLAY;
        }
        panel.setAttribute('data-tab', ControlBar.activeTab);
        const tabStrip = document.createElement('div');
        tabStrip.className = 'cb-tabs';
        for (const name of tabNames) {
            tabStrip.append(
                ControlBar.button(
                    name,
                    name + ' settings',
                    () => {
                        ControlBar.activeTab = name;
                        ControlBar.render();
                        ControlBar.focusGame();
                    },
                    'cb-tab' + (name === ControlBar.activeTab ? ' cb-tab-active' : '')
                )
            );
        }
        panel.append(tabStrip);

        const body = document.createElement('div');
        body.className = 'cb-body';
        panel.append(body);

        // One labelled row per control. A `group` is a heading above a run of rows, except
        // keybinds which still wrap as a chip grid (the chip already carries the tab name).
        let groupName: string | undefined;
        let keyWrap: HTMLElement | null = null;
        for (const control of ControlBar.controls) {
            if (control.tab !== ControlBar.activeTab) {
                continue;
            }
            if (control.group !== groupName) {
                groupName = control.group;
                keyWrap = null;
                if (groupName !== undefined) {
                    const heading = document.createElement('div');
                    heading.className = 'cb-group';
                    heading.textContent = groupName;
                    body.append(heading);
                }
            }
            if (control.kind === 'keybind') {
                if (keyWrap === null) {
                    keyWrap = document.createElement('div');
                    keyWrap.className = 'cb-keys';
                    body.append(keyWrap);
                }
                ControlBar.appendControl(keyWrap, control);
                continue;
            }
            if (control.kind === 'action' && keyWrap !== null && control.group === groupName) {
                ControlBar.appendControl(keyWrap, control);
                continue;
            }
            const row = document.createElement('div');
            row.className = 'cb-section';
            if (control.hint !== undefined) {
                row.title = control.hint;
            }
            const title = document.createElement('span');
            title.className = 'cb-title';
            title.textContent = control.label;
            row.append(title);
            const items = document.createElement('span');
            items.className = 'cb-items';
            ControlBar.appendControl(items, control, true);
            row.append(items);
            body.append(row);
        }
        root.append(panel);
        body.scrollTop = prevTab === ControlBar.activeTab ? prevScroll : 0;
        ControlBar.pinPanel(panel, openBtn);
    }

    /** Put the control's widgets into `into` — pills, a keycap, or an action button. */
    private static appendControl(into: HTMLElement, control: Control, rowLabelled: boolean = false): void {
        if (control.kind === 'toggle') {
            const on = control.get?.() === true;
            into.append(
                ControlBar.button(
                    on ? 'ON' : 'OFF',
                    'Toggle ' + control.label,
                    () => {
                        control.set?.(!on);
                        ControlBar.render();
                        ControlBar.focusGame();
                    },
                    'cb-toggle ' + (on ? 'cb-on' : 'cb-off')
                )
            );
            return;
        }
        if (control.kind === 'choice') {
            const selected = control.getChoice?.() ?? -1;
            for (const option of control.options ?? []) {
                into.append(
                    ControlBar.button(
                        option.label,
                        control.label + ': ' + option.label,
                        () => {
                            control.setChoice?.(option.value);
                            ControlBar.render();
                            ControlBar.focusGame();
                        },
                        'cb-choice' + (option.value === selected ? ' cb-choice-active' : '')
                    )
                );
            }
            return;
        }
        if (control.kind === 'keybind') {
            const tab = control.tabIndex ?? -1;
            const capturing = ControlBar.capturing === tab;
            const bound = capturing ? '?' : ControlBar.keyLabelForTab(tab);
            into.append(
                ControlBar.keyButton(
                    bound,
                    control.label,
                    capturing ? 'Press a key to bind ' + control.label + ' (Esc cancels, Backspace unbinds)' : 'Click to rebind ' + control.label,
                    () => {
                        ControlBar.beginCapture(tab);
                    },
                    capturing
                )
            );
            return;
        }
        into.append(
            ControlBar.button(
                rowLabelled ? 'Open' : control.label,
                control.hint ?? control.label,
                () => {
                    control.run?.();
                    ControlBar.render();
                    ControlBar.focusGame();
                },
                'cb-action'
            )
        );
    }

    /**
     * Cap the panel to the space actually on screen in the direction it opens, so a long page
     * never runs off the window. The body (not the panel) is what scrolls; the header and tabs
     * stay put. Absolute positioning does not contribute to document height, so without this
     * there is nothing to scroll and the top rows are simply gone.
     */
    private static pinPanel(panel: HTMLElement, button: HTMLElement): void {
        const vh = globalThis.innerHeight ?? 0;
        if (vh <= 0) {
            return;
        }
        const fill = document.body?.getAttribute('data-layout') === 'fill';
        // Fill mode is a centred overlay pinned from the top of the window (the gear lives at
        // the bottom of the left-edge stack). Windowed opens upward from the gear, so the
        // space that exists is between the button and the top of the viewport.
        const available = fill ? vh - panel.getBoundingClientRect().top - 12 : button.getBoundingClientRect().top - 8;
        panel.style.maxHeight = Math.max(160, Math.min(available, vh - 16)) + 'px';
    }

    private static readonly onWinResize = (): void => {
        if (ControlBar.panel === null || ControlBar.root === null) {
            return;
        }
        const btn = ControlBar.root.querySelector('.cb-open');
        if (btn instanceof HTMLElement) {
            ControlBar.pinPanel(ControlBar.panel, btn);
        }
    };

    private static keyLabelForTab(tab: number): string {
        for (const [code, value] of ControlBar.keyToTab) {
            if (value === tab) {
                return ControlBar.labelForCode(code);
            }
        }
        return '-';
    }

    private static labelForCode(code: number): string {
        for (const [browserCode, name] of KEY_NAMES) {
            if (ClientKeyboardListener.KEY_CODE_MAP[browserCode] === code) {
                return name;
            }
        }
        return '#' + code;
    }

    // ---- rebinding ---------------------------------------------------------

    private static readonly captureHandler = (event: KeyboardEvent): void => {
        // Capture phase on document: keydown/keypress/keyup are all consumed here and never
        // reach the canvas listener, so a rebind can't leak a keystroke into the game.
        event.preventDefault();
        event.stopPropagation();

        if (event.type !== 'keydown') {
            // the bound key's own keyup ends the capture, one event after its keypress
            if (event.type === 'keyup' && ControlBar.capturing === -1) {
                ControlBar.disarm();
            }
            return;
        }
        const tab = ControlBar.capturing;
        if (tab === -1) {
            return;
        }
        const browserCode = event.keyCode;
        if (browserCode === 27) {
            ControlBar.capturing = -1;
            ControlBar.render();
            return;
        }
        if (browserCode === 8 || browserCode === 46) {
            ControlBar.bind(-1, tab);
            ControlBar.capturing = -1;
            ControlBar.render();
            return;
        }
        const code = browserCode >= 0 && browserCode < ClientKeyboardListener.KEY_CODE_MAP.length ? ClientKeyboardListener.KEY_CODE_MAP[browserCode] : -1;
        // Unmapped keys and Enter (the chat gate) are rejected; keep waiting for a usable key.
        if (code < 0 || (code & 0x80) !== 0 || code === 84) {
            return;
        }
        ControlBar.bind(code, tab);
        ControlBar.capturing = -1;
        ControlBar.render();
    };

    // Clicking anywhere outside the settings element (the canvas, typically) abandons a pending
    // rebind and closes the panel, so a half-finished capture can never sit there eating every
    // keystroke.
    private static readonly cancelHandler = (event: MouseEvent): void => {
        if (ControlBar.root !== null && event.target instanceof Node && ControlBar.root.contains(event.target)) {
            return;
        }
        ControlBar.capturing = -1;
        ControlBar.disarm();
        if (ControlBar.open) {
            ControlBar.setOpen(false);
        }
    };

    private static beginCapture(tab: number): void {
        ControlBar.capturing = tab;
        if (!ControlBar.armed) {
            ControlBar.armed = true;
            document.addEventListener('keydown', ControlBar.captureHandler, true);
            document.addEventListener('keyup', ControlBar.captureHandler, true);
            document.addEventListener('keypress', ControlBar.captureHandler, true);
            globalThis.addEventListener('blur', ControlBar.disarm);
        }
        ControlBar.render();
    }

    private static readonly disarm = (): void => {
        if (!ControlBar.armed) {
            return;
        }
        ControlBar.armed = false;
        ControlBar.capturing = -1;
        document.removeEventListener('keydown', ControlBar.captureHandler, true);
        document.removeEventListener('keyup', ControlBar.captureHandler, true);
        document.removeEventListener('keypress', ControlBar.captureHandler, true);
        globalThis.removeEventListener('blur', ControlBar.disarm);
        ControlBar.render();
        ControlBar.focusGame();
    };

    private static bind(code: number, tab: number): void {
        // one key per tab, one tab per key
        for (const key of Object.keys(ControlBar.settings.keys)) {
            if (ControlBar.settings.keys[key] === tab) {
                delete ControlBar.settings.keys[key];
            }
        }
        if (code >= 0) {
            ControlBar.settings.keys[String(code)] = tab;
        }
        ControlBar.reindex();
        ControlBar.save();
    }

    static {
        // The outside-click watcher is permanent: the panel closes on any click that isn't in it,
        // and a pending rebind is abandoned the same way.
        if (typeof document !== 'undefined') {
            document.addEventListener('mousedown', ControlBar.cancelHandler, true);
            globalThis.addEventListener('resize', ControlBar.onWinResize);
        }
    }
}
