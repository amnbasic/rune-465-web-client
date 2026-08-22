import ClientMouseListener from '#/client/ClientMouseListener.js';
import If3Live from '#/client/If3Live.js';
import IfType from '#/config/IfType.js';

const TYPES: string[] = ['LAYER', 'U1', 'INV', 'RECT', 'TEXT', 'GRAPHIC', 'MODEL', 'U7', 'U8', 'LINE'];
const FONTS: Array<[number, string]> = [
    [494, 'p11'],
    [495, 'b12'],
    [496, 'p12'],
    [497, 'q8']
];
const EVENT_OPS: Array<{ bit: number; lab: string }> = [
    { bit: 0, lab: 'Click' },
    { bit: 1, lab: 'Op1' }, { bit: 2, lab: 'Op2' }, { bit: 3, lab: 'Op3' }, { bit: 4, lab: 'Op4' }, { bit: 5, lab: 'Op5' },
    { bit: 6, lab: 'Op6' }, { bit: 7, lab: 'Op7' }, { bit: 8, lab: 'Op8' }, { bit: 9, lab: 'Op9' }, { bit: 10, lab: 'Op10' },
    { bit: 20, lab: 'Drag tgt' }, { bit: 21, lab: 'Use tgt' }
];
const PALETTE: number[] = [0x000000, 0xffffff, 0xffff00, 0xff981f, 0xff0000, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff, 0xc0c0c0, 0x808080, 0x8b0000, 0x000080, 0x005000];
const HOOK_KEYS: string[] = [
    'onload', 'onmouseover', 'onmouseleave', 'ontargetleave', 'ontargetenter',
    'onvartransmit', 'oninvtransmit', 'onstattransmit', 'ontimer', 'onop',
    'onmouserepeat', 'onclick', 'onclickrepeat', 'onrelease', 'onhold',
    'ondrag', 'ondragcomplete', 'onscrollwheel'
];
const PLACE_TYPES: Record<string, number> = { '1': 0, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6 };
const TYPE_KEYS: Array<[number, string]> = [[0, 'LAYER'], [3, 'RECT'], [4, 'TEXT'], [5, 'GRAPHIC'], [6, 'MODEL']];

type ChildDump = Record<string, unknown>;
type DragState =
    | { mode: 'move'; ids: number[]; mx: number; my: number; hist: boolean; origin: Array<{ id: number; x: number; y: number }>; hx: number; hy: number; armed: boolean }
    | { mode: 'resize'; handle: string; id: number; ox: number; oy: number; ow: number; oh: number; ax: number; ay: number; mx: number; my: number; hist: boolean }
    | { mode: 'marquee'; gx: number; gy: number; add: boolean }
    | { mode: 'place'; gx: number; gy: number; type: number }
    | { mode: 'orbit'; id: number; hist: boolean };

/**
 * JS5-only IF3 studio: the live client's drawLayer as the preview, tree + props like
 * bun tools/if3-editor.ts. Same idea as LostCityModelAndAnimEditor — a standalone viewer
 * over cache content, no login or world. Open the web client with ?if3 or ?if3=521.
 */
export default class If3Studio {
    static enabled: boolean = false;
    static widget: number = 157;
    static editorUrl: string = 'http://127.0.0.1:8799';

    static editorBase(): string {
        try {
            const loc = globalThis.location;
            if (loc.port === '8799') {
                return loc.origin;
            }
            return loc.origin + '/if3';
        } catch {
            return 'http://127.0.0.1:8799';
        }
    }
    static spin: boolean = false;
    static showHidden: boolean = false;
    static status: string = '';
    static opened: boolean = false;
    private static authoredApplied: boolean = false;
    /** Crop the 765×503 canvas to the iface slot (mainframe/tabs/chat/overlay). Off = whole frame. */
    static fitAuto: boolean = true;
    private static cachedFrame: { kind: string; x: number; y: number; w: number; h: number } | null = null;

    static layout: ((w: number, h: number) => void) | null = null;
    static resetAnim: ((id: number) => void) | null = null;
    static notifyVarp: ((id: number, value: number) => void) | null = null;
    static notifyVarbit: ((id: number, value: number) => void) | null = null;
    static onOpened: ((id: number) => void) | null = null;

    private static treeEl: HTMLElement | null = null;
    private static fieldsEl: HTMLElement | null = null;
    private static statusEl: HTMLElement | null = null;
    private static fileSel: HTMLSelectElement | null = null;
    private static lastMx: number = 0;
    private static lastMy: number = 0;
    private static dragging: boolean = false;
    private static drag: DragState | null = null;
    private static undoStack: string[] = [];
    private static redoStack: string[] = [];
    private static clipboard: ChildDump[] = [];
    private static stockSnap: ChildDump[] | null = null;
    private static stockCount: number = 0;
    private static placeType: number | null = null;
    private static focusId: number = -1;
    private static propsKey: string = '';
    private static slideHist: boolean = false;
    private static holdTimer: number = 0;
    private static lastClickAt: number = 0;
    private static lastClickId: number = -1;
    private static ptr = { ctrl: false, shift: false, alt: false, meta: false, x: 0, y: 0 };
    private static pickLabel: Map<string, string> = new Map();

    static isMobile(): boolean {
        return window.matchMedia('(pointer: coarse)').matches
            || window.matchMedia('(max-width: 900px)').matches
            || window.matchMedia('(max-height: 520px) and (orientation: landscape)').matches;
    }

    static setPanel(name: string): void {
        document.getElementById('if3-more-menu')?.classList.remove('open');
        document.body.classList.remove('panel-tree', 'panel-props', 'panel-stage');
        document.body.classList.add('panel-' + name);
        const dock = document.getElementById('if3-dock');
        if (dock) {
            dock.querySelectorAll('[data-panel]').forEach(b => {
                (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.panel === name);
            });
        }
        const back = document.getElementById('if3-drawer-back');
        if (back) {
            back.classList.toggle('if3-hide', name === 'stage' || !document.body.classList.contains('if3-mobile'));
        }
    }

    static syncMobile(): void {
        const mobile = If3Studio.isMobile();
        document.body.classList.toggle('if3-mobile', mobile);
        const standalone = !!(window.navigator as Navigator & { standalone?: boolean }).standalone
            || window.matchMedia('(display-mode: standalone)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches;
        document.body.classList.toggle('if3-standalone', standalone);
        const extras = document.getElementById('if3-extras');
        const menu = document.getElementById('if3-more-menu');
        const top = document.getElementById('if3-top');
        const wrap = document.querySelector('.if3-more-wrap');
        if (extras && menu && top && wrap) {
            if (mobile && extras.parentElement !== menu) {
                menu.appendChild(extras);
            } else if (!mobile && extras.parentElement === menu) {
                top.insertBefore(extras, wrap);
            }
        }
        if (!mobile) {
            document.body.classList.remove('panel-tree', 'panel-props', 'panel-stage');
            const back = document.getElementById('if3-drawer-back');
            if (back) {
                back.classList.add('if3-hide');
            }
        } else if (!Array.from(document.body.classList).some(c => c.startsWith('panel-'))) {
            If3Studio.setPanel('stage');
        }
        requestAnimationFrame(() => If3Studio.fitGame());
    }

    static invalidateFrame(): void {
        If3Studio.cachedFrame = null;
    }

    /**
     * Snap the 765×503 canvas to the 465 gameframe slot this widget belongs in.
     * Roots are usually IF1 children authored in that slot (0,0), not a nested LAYER.
     *   full 765×503 · mainframe 512×334 · tabs 190×261 · chat 479×96
     */
    static contentFrame(): { kind: string; x: number; y: number; w: number; h: number } {
        const full = { kind: 'full', x: 0, y: 0, w: 765, h: 503 };
        const list = If3Studio.list();
        let minX = 1e9;
        let minY = 1e9;
        let maxX = -1e9;
        let maxY = -1e9;
        let n = 0;
        const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
        const slotLayer = (w: number, h: number): boolean =>
            (near(w, 512, 8) && near(h, 334, 8))
            || (near(w, 190, 8) && near(h, 261, 8))
            || (near(w, 479, 8) && near(h, 96, 8))
            || (near(w, 765, 8) && near(h, 503, 8));
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (!c) {
                continue;
            }
            const p = c.layerId === -1 ? -1 : c.layerId & 0xffff;
            if (p >= 0 && p !== i && list[p]) {
                continue;
            }
            const w = c.renderWidth || c.width;
            const h = c.renderHeight || c.height;
            if (w <= 0 || h <= 0) {
                continue;
            }
            if (!If3Studio.showHidden && c.hide && !slotLayer(w, h)) {
                continue;
            }
            const x = c.renderWidth ? c.renderX : c.x;
            const y = c.renderHeight ? c.renderY : c.y;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
            n++;
        }
        if (!n) {
            return full;
        }
        minX = Math.max(0, minX);
        minY = Math.max(0, minY);
        maxX = Math.min(765, maxX);
        maxY = Math.min(503, maxY);
        const w = Math.max(1, maxX - minX);
        const h = Math.max(1, maxY - minY);
        if (w >= 700 && h >= 430) {
            return full;
        }
        if (w <= 230 && h >= 180 && h <= 310) {
            return { kind: 'tabs', x: 0, y: 0, w: 190, h: 261 };
        }
        if (w >= 380 && h <= 150) {
            return { kind: 'chat', x: 0, y: 0, w: Math.max(479, Math.ceil(maxX)), h: Math.max(96, Math.ceil(maxY)) };
        }
        if (maxX <= 540 && maxY <= 360) {
            return { kind: 'mainframe', x: 0, y: 0, w: 512, h: 334 };
        }
        return { kind: 'overlay', x: minX, y: minY, w, h };
    }

    static fitGame(): void {
        const stage = document.getElementById('if3-stage');
        const fit = document.getElementById('if3-fit');
        const game = document.getElementById('game');
        if (!stage || !fit || !game) {
            return;
        }
        if (If3Studio.fitAuto && !If3Studio.dragging) {
            If3Studio.cachedFrame = If3Studio.contentFrame();
        }
        const frame = If3Studio.fitAuto
            ? (If3Studio.cachedFrame || { kind: 'full', x: 0, y: 0, w: 765, h: 503 })
            : { kind: 'full', x: 0, y: 0, w: 765, h: 503 };
        const sw = stage.clientWidth;
        const sh = stage.clientHeight;
        if (sw < 16 || sh < 16) {
            return;
        }
        const s = Math.min(sw / frame.w, sh / frame.h);
        fit.style.width = (frame.w * s) + 'px';
        fit.style.height = (frame.h * s) + 'px';
        game.style.width = '765px';
        game.style.height = '503px';
        game.style.transformOrigin = '0 0';
        game.style.transform = 'translate(' + (-frame.x * s) + 'px,' + (-frame.y * s) + 'px) scale(' + s + ')';
        document.body.setAttribute('data-smooth', s < 0.98 ? 'on' : 'off');
        const tag = document.getElementById('if3-frame-tag');
        if (tag) {
            tag.textContent = frame.kind + ' ' + frame.w + '×' + frame.h;
            tag.classList.toggle('locked', !If3Studio.fitAuto);
        }
        const fitBtn = document.getElementById('if3-fit-btn');
        if (fitBtn) {
            fitBtn.classList.toggle('on', If3Studio.fitAuto);
        }
    }

    static toggleFit(): void {
        If3Studio.fitAuto = !If3Studio.fitAuto;
        If3Studio.invalidateFrame();
        If3Studio.fitGame();
    }

    static wanted(): boolean {
        try {
            if ((globalThis as unknown as { __IF3_STUDIO__?: boolean }).__IF3_STUDIO__) {
                return true;
            }
            const u = new URL(globalThis.location.href);
            if (u.searchParams.has('if3')) {
                return true;
            }
            const p = u.pathname.replace(/\/+$/, '') || '/';
            return p === '/studio';
        } catch {
            return false;
        }
    }

    static embed(): boolean {
        try {
            return new URL(globalThis.location.href).searchParams.get('embed') === '1';
        } catch {
            return false;
        }
    }

    static notifyParent(): void {
        if (globalThis.parent && globalThis.parent !== window) {
            globalThis.parent.postMessage({ type: 'if3-ready', widget: If3Studio.widget }, '*');
        }
    }

    static widgetFromUrl(): number {
        try {
            const raw = new URL(globalThis.location.href).searchParams.get('if3') || '';
            const n = parseInt(raw, 10);
            return Number.isFinite(n) && n >= 0 ? n : 157;
        } catch {
            return 157;
        }
    }

    static init(): void {
        If3Studio.enabled = true;
        If3Live.studioMode = true;
        If3Studio.editorUrl = If3Studio.editorBase();
        If3Studio.widget = If3Studio.widgetFromUrl();
        try {
            const u = new URL(globalThis.location.href);
            if (u.pathname === '/' && u.searchParams.has('if3')) {
                u.pathname = '/studio';
                u.searchParams.delete('if3');
                history.replaceState(null, '', u.pathname + u.search);
            }
        } catch {
            /* keep the current URL */
        }
        If3Live.active = true;
        const embed = If3Studio.embed();
        If3Live.alwaysPick = !embed;
        If3Live.picking = !embed;
        If3Live.onSelect = (): void => If3Studio.sync();
        document.body.classList.add('if3-studio');
        document.title = 'IF3';
        const man = document.querySelector('link[rel="manifest"]');
        if (man) {
            man.setAttribute('href', 'if3.webmanifest');
        }
        const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appTitle) {
            appTitle.setAttribute('content', 'IF3');
        }
        if (embed) {
            document.body.classList.add('if3-embed');
        }
        const bar = document.getElementById('controlbar');
        if (bar) {
            bar.style.display = 'none';
        }
        const mobile = document.getElementById('mobile-bar');
        if (mobile) {
            mobile.style.display = 'none';
        }

        const style = document.createElement('style');
        style.textContent = If3Studio.chromeCss();
        document.head.appendChild(style);

        const app = document.createElement('div');
        app.id = 'if3-app';
        app.innerHTML = `
            <header id="if3-top">
                <b>IF3</b>
                <select id="if3-file" title="Open widget"></select>
                <button type="button" data-act="open">Open</button>
                <button type="button" class="primary" data-act="save" title="Write .if3 and pack idx3 overlay (Ctrl+S)">Save</button>
                <button type="button" id="if3-fit-btn" class="on" data-act="fit" title="Crop to this iface slot. Off = whole 765×503 frame.">Fit</button>
                <div class="if3-more-wrap">
                    <button type="button" id="if3-more-btn">Add</button>
                    <div id="if3-more-menu"></div>
                </div>
                <div id="if3-extras">
                    <span class="sep"></span>
                    <span class="seg if3-add-grid" id="if3-add" title="Arm a type, then click the preview to place (1–6)">
                        ${TYPE_KEYS.map(([t, n], i) => `<button type="button" data-act="add" data-type="${t}">${n} <span class="k">${i === 0 ? 1 : i + 2}</span></button>`).join('')}
                    </span>
                    <button type="button" data-act="del" title="Hide (Delete)">Hide</button>
                    <input id="if3-search" type="search" placeholder="widget id…" style="width:90px">
                    <div class="if3-toggles">
                    <label title="Draw hide=yes children (stacked states). Off = in-game visibility."><input type="checkbox" id="if3-hidden"> hidden</label>
                    <label><input type="checkbox" id="if3-spin"> spin</label>
                    </div>
                    <button type="button" id="if3-adv-btn">Advanced</button>
                    <div class="if3-adv">
                    <span title="Poke a client varp so CS1/CS2 bars and onvartransmit run">varp</span>
                    <select id="if3-varp-used" title="Varps this widget listens to"><option value="">used varps…</option></select>
                    <button type="button" data-act="pick-varp">Varp…</button>
                    <input id="if3-varp-id" type="text" inputmode="numeric" placeholder="id" style="width:56px" value="0">
                    <input id="if3-varp-val" type="text" inputmode="numeric" placeholder="val" style="width:64px" value="0">
                    <button type="button" data-act="varp">Set</button>
                    <button type="button" data-act="pick-varbit">Varbit…</button>
                    <input id="if3-varbit-id" type="text" inputmode="numeric" placeholder="id" style="width:56px" value="0">
                    <input id="if3-varbit-val" type="text" inputmode="numeric" placeholder="val" style="width:64px" value="0">
                    <button type="button" data-act="varbit">Set</button>
                    <span title="Clip-bar fill (521 offset RECT / 520 pip layers). Not a varp.">fill</span>
                    <input id="if3-bar" type="range" min="0" max="100" value="0" style="width:100px">
                    <span id="if3-bar-pct">0%</span>
                    </div>
                </div>
                <button type="button" id="if3-help-btn" title="Shortcuts (?)">?</button>
                <span id="if3-status">Click to pick. [ ] cycle. ? help.</span>
            </header>
            <div id="if3-main">
                <aside id="if3-tree"><h2>Components</h2><div id="if3-rows"></div></aside>
                <div id="if3-stage">
                    <nav id="if3-crumb" class="if3-hide"></nav>
                    <div id="if3-place" class="if3-hide">Click the preview to place. Drag to size. Esc cancels.</div>
                </div>
                <aside id="if3-props"><h2>Properties</h2><div id="if3-fields"><div class="hint">Click a component. Ctrl-click adds. Shift-drag marquees.</div></div></aside>
            </div>
            <div id="if3-hits"></div>
            <nav id="if3-dock">
                <button type="button" data-panel="tree">Tree</button>
                <button type="button" data-panel="stage" class="on">Preview</button>
                <button type="button" data-panel="props">Props</button>
            </nav>
            <div id="if3-drawer-back" class="if3-hide"></div>
            <div id="if3-ctx" class="if3-hide"></div>
            <div id="if3-help" class="if3-hide">${If3Studio.helpHtml()}</div>`;
        document.body.appendChild(app);

        const stage = app.querySelector('#if3-stage')!;
        const fit = document.createElement('div');
        fit.id = 'if3-fit';
        stage.appendChild(fit);
        const game = document.getElementById('game');
        if (game) {
            fit.appendChild(game);
        }
        const tag = document.createElement('button');
        tag.type = 'button';
        tag.id = 'if3-frame-tag';
        tag.title = 'Tap to toggle Fit (crop to this iface) vs whole 765×503 frame';
        tag.textContent = 'full 765×503';
        tag.onclick = () => If3Studio.toggleFit();
        stage.appendChild(tag);

        If3Studio.treeEl = app.querySelector('#if3-rows');
        If3Studio.fieldsEl = app.querySelector('#if3-fields');
        If3Studio.statusEl = app.querySelector('#if3-status');
        If3Studio.fileSel = app.querySelector('#if3-file');
        If3Studio.syncMobile();
        window.addEventListener('resize', () => If3Studio.syncMobile());
        window.addEventListener('orientationchange', () => setTimeout(() => If3Studio.syncMobile(), 250));
        const moreBtn = document.getElementById('if3-more-btn');
        const moreMenu = document.getElementById('if3-more-menu');
        if (moreBtn && moreMenu) {
            moreBtn.onclick = ev => {
                ev.stopPropagation();
                moreMenu.classList.toggle('open');
            };
        }
        document.getElementById('if3-dock')?.querySelectorAll('[data-panel]').forEach(b => {
            (b as HTMLButtonElement).onclick = () => If3Studio.setPanel((b as HTMLElement).dataset.panel || 'stage');
        });
        const drawerBack = document.getElementById('if3-drawer-back');
        if (drawerBack) {
            drawerBack.onclick = () => If3Studio.setPanel('stage');
        }
        window.addEventListener('pointerdown', ev => {
            const menu = document.getElementById('if3-more-menu');
            const btn = document.getElementById('if3-more-btn');
            if (menu && btn && !menu.contains(ev.target as Node) && ev.target !== btn) {
                menu.classList.remove('open');
            }
        }, true);

        app.querySelectorAll('button[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = (btn as HTMLElement).dataset.act;
                if (act === 'open') {
                    If3Studio.openTyped();
                } else if (act === 'fit') {
                    If3Studio.toggleFit();
                } else if (act === 'add') {
                    If3Studio.startPlace(Number((btn as HTMLElement).dataset.type));
                    document.getElementById('if3-more-menu')?.classList.remove('open');
                } else if (act === 'del') {
                    If3Studio.hideSel();
                } else if (act === 'save') {
                    void If3Studio.save();
                } else if (act === 'varp') {
                    If3Studio.pokeVarp();
                } else if (act === 'varbit') {
                    If3Studio.pokeVarbit();
                } else if (act === 'pick-varp') {
                    If3Studio.openNamedPicker('varp');
                } else if (act === 'pick-varbit') {
                    If3Studio.openNamedPicker('varbit');
                }
            });
        });
        const spin = document.getElementById('if3-spin') as HTMLInputElement | null;
        if (spin) {
            spin.onchange = () => {
                If3Studio.spin = spin.checked;
            };
        }
        const hid = document.getElementById('if3-hidden') as HTMLInputElement | null;
        if (hid) {
            hid.onchange = () => {
                If3Studio.showHidden = hid.checked;
                If3Studio.invalidateFrame();
                If3Studio.renderTree();
                If3Studio.fitGame();
            };
        }
        const advBtn = document.getElementById('if3-adv-btn');
        const adv = document.querySelector('.if3-adv');
        if (advBtn && adv) {
            advBtn.onclick = ev => {
                ev.stopPropagation();
                adv.classList.toggle('open');
            };
        }
        const fill = document.getElementById('if3-bar') as HTMLInputElement | null;
        if (fill) {
            fill.oninput = () => {
                const pct = Number(fill.value) || 0;
                const lab = document.getElementById('if3-bar-pct');
                if (lab) {
                    lab.textContent = pct + '%';
                }
                If3Studio.applyBarFill(pct);
            };
        }
        If3Studio.fileSel?.addEventListener('change', () => {
            If3Studio.widget = Number(If3Studio.fileSel!.value);
            If3Studio.resetWidget();
            If3Studio.setStatus('Opening widget ' + If3Studio.widget);
        });
        const used = document.getElementById('if3-varp-used') as HTMLSelectElement | null;
        if (used) {
            used.onchange = () => {
                const id = Number(used.value);
                if (!Number.isInteger(id) || id < 0) {
                    return;
                }
                const inp = document.getElementById('if3-varp-id') as HTMLInputElement | null;
                if (inp) {
                    inp.value = String(id);
                }
            };
        }
        const search = document.getElementById('if3-search') as HTMLInputElement | null;
        if (search) {
            search.value = String(If3Studio.widget);
            search.addEventListener('keydown', ev => {
                if (ev.key === 'Enter') {
                    If3Studio.openTyped();
                }
                ev.stopPropagation();
            });
        }
        window.addEventListener('keydown', ev => If3Studio.onKey(ev));
        window.addEventListener('keyup', ev => {
            If3Studio.ptr.ctrl = ev.ctrlKey || ev.metaKey;
            If3Studio.ptr.shift = ev.shiftKey;
            If3Studio.ptr.alt = ev.altKey;
            If3Studio.ptr.meta = ev.metaKey;
        });
        document.getElementById('if3-help-btn')!.addEventListener('click', () => If3Studio.toggleHelp());
        document.getElementById('if3-help')!.addEventListener('click', ev => {
            if ((ev.target as HTMLElement).id === 'if3-help' || (ev.target as HTMLElement).id === 'if3-help-x') {
                document.getElementById('if3-help')?.classList.add('if3-hide');
            }
        });
        app.addEventListener('contextmenu', ev => ev.preventDefault());
        const stageEl = document.getElementById('if3-stage');
        stageEl?.addEventListener('pointerdown', ev => If3Studio.onPtr(ev), true);
        stageEl?.addEventListener('pointermove', ev => {
            If3Studio.ptr.x = ev.clientX;
            If3Studio.ptr.y = ev.clientY;
            If3Studio.ptr.ctrl = ev.ctrlKey || ev.metaKey;
            If3Studio.ptr.shift = ev.shiftKey;
            If3Studio.ptr.alt = ev.altKey;
        }, true);
        stageEl?.addEventListener('contextmenu', ev => {
            ev.preventDefault();
            If3Studio.onRightClick(ev.clientX, ev.clientY);
        });
        window.addEventListener('pointerdown', ev => {
            const ctx = document.getElementById('if3-ctx');
            if (ctx && !ctx.contains(ev.target as Node) && ev.button !== 2) {
                ctx.classList.add('if3-hide');
            }
        }, true);

        window.addEventListener('message', ev => {
            const d = ev.data as { type?: string; widget?: number } | null;
            if (!d || d.type !== 'if3-open') {
                return;
            }
            const n = Number(d.widget);
            if (!Number.isInteger(n) || n < 0) {
                return;
            }
            If3Studio.widget = n;
            If3Studio.resetWidget();
            If3Studio.setStatus('Opening widget ' + n);
        });

        void If3Studio.loadList();
        If3Studio.setStatus('Loading JS5… then widget ' + If3Studio.widget);
    }

    static tick(): void {
        if (!If3Studio.enabled) {
            return;
        }
        const mx = ClientMouseListener.mouseX;
        const my = ClientMouseListener.mouseY;
        If3Live.lastMx = mx;
        If3Live.lastMy = my;
        if (!If3Studio.embed()) {
            If3Studio.tickEdit(mx, my);
        }
        If3Studio.lastMx = mx;
        If3Studio.lastMy = my;
        if (If3Studio.spin && If3Live.com && If3Live.com.type === 6) {
            If3Live.dirty(If3Live.com);
            If3Live.redraw();
        }
    }

    static ensureOpen(): boolean {
        if (!IfType.interfaces) {
            return false;
        }
        if (!IfType.openInterface(If3Studio.widget)) {
            If3Studio.setStatus('Downloading widget ' + If3Studio.widget + '…');
            return false;
        }
        if (!If3Studio.opened) {
            If3Studio.resetAnim?.(If3Studio.widget);
            If3Studio.onOpened?.(If3Studio.widget);
            If3Studio.opened = true;
            If3Studio.authoredApplied = false;
            If3Studio.stockCount = If3Studio.list().length;
            If3Studio.stockSnap = If3Studio.dumpChildren();
            If3Studio.invalidateFrame();
            If3Studio.renderTree();
            If3Studio.fillUsedVarps();
            void If3Studio.pullAuthored();
            If3Studio.setStatus('Widget ' + If3Studio.widget + ' — click a component to edit');
            document.body.classList.add('if3-studio-ready');
            if (If3Studio.embed()) {
                document.body.classList.add('if3-embed-ready');
            }
            If3Studio.notifyParent();
        }
        If3Studio.layout?.(765, 503);
        requestAnimationFrame(() => If3Studio.fitGame());
        return true;
    }

    /** Overlay authored .if3 fields onto live IfType. Same-origin `/if3/api` from the game tab too. */
    static async applyAuthoredToWidget(widget: number): Promise<boolean> {
        if (!IfType.list[widget]) {
            IfType.openInterface(widget);
        }
        const list = IfType.list[widget];
        if (!list) {
            return false;
        }
        try {
            const r = await fetch(If3Studio.editorBase() + '/api/widget/' + widget).then(x => x.json()) as {
                children?: Array<Record<string, unknown>>;
            };
            if (!r.children) {
                return false;
            }
            for (const raw of r.children) {
                const id = Number(raw.id);
                const c = list[id];
                if (!c || raw.format === 'empty') {
                    continue;
                }
                if (typeof raw.x === 'number') {
                    c.x = raw.x;
                }
                if (typeof raw.y === 'number') {
                    c.y = raw.y;
                }
                if (typeof raw.width === 'number') {
                    c.width = raw.width;
                }
                if (typeof raw.height === 'number') {
                    c.height = raw.height;
                }
                if (typeof raw.hide === 'boolean') {
                    c.hide = raw.hide;
                }
                if (typeof raw.text === 'string') {
                    c.text = raw.text;
                }
                if (typeof raw.graphic === 'number') {
                    c.graphic = raw.graphic;
                }
                if (typeof raw.colour === 'number') {
                    c.colour = raw.colour;
                }
                if (typeof raw.font === 'number') {
                    c.font = raw.font;
                }
                if (typeof raw.fill === 'boolean') {
                    c.fill = raw.fill;
                }
                if (typeof raw.trans === 'number') {
                    c.trans = raw.trans;
                }
                if (typeof raw.rotate === 'number') {
                    c.rotate = raw.rotate;
                }
                if (typeof raw.tiling === 'boolean') {
                    c.tiling = raw.tiling;
                }
                if (typeof raw.hflip === 'boolean') {
                    c.hFlip = raw.hflip;
                }
                if (typeof raw.vflip === 'boolean') {
                    c.vFlip = raw.vflip;
                }
                if (typeof raw.lineheight === 'number') {
                    c.lineHeight = raw.lineheight;
                }
                if (typeof raw.halign === 'number') {
                    c.hAlign = raw.halign;
                }
                if (typeof raw.valign === 'number') {
                    c.vAlign = raw.valign;
                }
                if (typeof raw.shadow === 'boolean') {
                    c.shadow = raw.shadow;
                }
                if (typeof raw.outline === 'number') {
                    c.outline = raw.outline;
                }
                if (typeof raw.shadowcolour === 'number') {
                    c.shadowColour = raw.shadowcolour;
                }
                if (typeof raw.orthog === 'boolean') {
                    c.orthog = raw.orthog;
                }
                if (typeof raw.linewidth === 'number') {
                    c.lineWidth = raw.linewidth;
                }
                if (typeof raw.alpha_mode === 'boolean') {
                    c.field3477 = raw.alpha_mode;
                }
                if (typeof raw.baseop === 'string') {
                    c.baseOpName = raw.baseop;
                }
                if (typeof raw.targetverb === 'string') {
                    c.targetVerb = raw.targetverb;
                }
                if (typeof raw.dragdeadzone === 'number') {
                    c.dragdeadzone = raw.dragdeadzone;
                }
                if (typeof raw.dragdeadtime === 'number') {
                    c.dragdeadtime = raw.dragdeadtime;
                }
                if (typeof raw.draggable === 'boolean') {
                    c.draggablebehavior = raw.draggable;
                }
                if (typeof raw.modelzoom === 'number') {
                    c.modelZoom = raw.modelzoom;
                }
                if (typeof raw.modelxan === 'number') {
                    c.modelXAn = raw.modelxan;
                }
                if (typeof raw.modelyan === 'number') {
                    c.modelYAn = raw.modelyan;
                }
                if (typeof raw.modelzan === 'number') {
                    c.modelZAn = raw.modelzan;
                }
                if (typeof raw.modelxof === 'number') {
                    c.modelXOf = raw.modelxof;
                }
                if (typeof raw.modelyof === 'number') {
                    c.modelYOf = raw.modelyof;
                }
                if (typeof raw.modelanim === 'number') {
                    c.modelAnim = raw.modelanim < 0 ? -1 : raw.modelanim;
                }
                if (typeof raw.model === 'number') {
                    c.model1Type = 1;
                    c.model1Id = raw.model;
                    c.invobject = raw.model === -1 ? -1 : c.invobject;
                    if (raw.model === -1) {
                        c.invobject = -1;
                    }
                }
                if (typeof raw.layer === 'number') {
                    c.layerId = raw.layer < 0 ? -1 : raw.layer + (widget << 16);
                }
                if (typeof raw.scrollheight === 'number') {
                    c.scrollHeight = raw.scrollheight;
                }
                if (typeof raw.scrollwidth === 'number') {
                    c.scrollWidth = raw.scrollwidth;
                }
                if (typeof raw.eventcode === 'number') {
                    c.eventCode = raw.eventcode;
                }
                if (typeof raw.clientcode === 'number') {
                    c.clientCode = raw.clientcode;
                }
                if (Array.isArray(raw.ops)) {
                    for (let i = 0; i < raw.ops.length; i++) {
                        c.setOpName(String(raw.ops[i] ?? ''), i);
                    }
                }
            }
            If3Studio.resetAnim?.(widget);
            If3Live.redraw();
            return true;
        } catch {
            return false;
        }
    }

    /** JS5 may still have stock bytes after Save; re-apply the authored .if3 onto live IfType. */
    private static async pullAuthored(): Promise<void> {
        if (If3Studio.authoredApplied) {
            return;
        }
        const ok = await If3Studio.applyAuthoredToWidget(If3Studio.widget);
        if (ok && If3Studio.widget) {
            If3Studio.authoredApplied = true;
            If3Studio.sync();
        }
    }

    private static openTyped(): void {
        const search = document.getElementById('if3-search') as HTMLInputElement | null;
        const n = parseInt(search?.value || If3Studio.fileSel?.value || '0', 10);
        if (!Number.isFinite(n) || n < 0) {
            return;
        }
        If3Studio.widget = n;
        If3Studio.resetWidget();
        If3Studio.renderTree();
        If3Studio.setStatus('Opening widget ' + n);
    }

    private static list(): (IfType | null)[] {
        return IfType.list[If3Studio.widget] || [];
    }

    private static renderTree(): void {
        const rows = If3Studio.treeEl;
        if (!rows) {
            return;
        }
        const list = If3Studio.list();
        const kids = new Map<number, number[]>();
        const roots: number[] = [];
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (!c) {
                continue;
            }
            const p = c.layerId === -1 ? -1 : c.layerId & 0xffff;
            if (p >= 0 && p !== i && list[p]) {
                if (!kids.has(p)) {
                    kids.set(p, []);
                }
                kids.get(p)!.push(i);
            } else {
                roots.push(i);
            }
        }
        const html: string[] = [];
        const walk = (id: number, depth: number): void => {
            const c = list[id];
            if (!c) {
                return;
            }
            const primary = If3Live.child === id;
            const on = primary ? ' on' : If3Live.isSelectedId(id) ? ' on2' : '';
            const hid = c.hide ? ' hid' : '';
            const lock = If3Live.isLocked(id) ? ' lock' : '';
            const focus = If3Studio.focusId === id ? ' focus-root' : '';
            const lab = c.text ? c.text.slice(0, 24) : c.type === 6 ? 'mdl ' + c.model1Id : c.width + 'x' + c.height;
            const if1 = c.v3 ? '' : ' <span class="badge if1">IF1</span>';
            html.push(`<div class="if3-row${on}${hid}${lock}${focus}" data-id="${id}" style="padding-left:${8 + depth * 12}px">
                <span class="typ t-${TYPES[c.type] || 'U'}">${TYPES[c.type] || c.type}</span>
                <span class="lab">${If3Studio.esc(lab)}${if1}</span>
                <span class="id">${id}</span></div>`);
            for (const k of kids.get(id) || []) {
                walk(k, depth + 1);
            }
        };
        for (const id of roots) {
            walk(id, 0);
        }
        rows.innerHTML = html.join('');
        rows.querySelectorAll('.if3-row').forEach(el => {
            const node = el as HTMLElement;
            node.addEventListener('click', ev => {
                const id = Number(node.dataset.id);
                const c = list[id];
                if (!c) {
                    return;
                }
                if (ev.shiftKey) {
                    If3Studio.rangeSel(id);
                } else if (ev.ctrlKey || ev.metaKey) {
                    If3Live.toggleSel(c);
                } else {
                    If3Live.selectOne(c);
                }
            });
            node.addEventListener('dblclick', () => {
                const id = Number(node.dataset.id);
                const c = list[id];
                if (c && c.type === 0) {
                    If3Studio.enterLayer(id);
                } else if (c && c.layerId >= 0) {
                    If3Studio.enterLayer(c.layerId & 0xffff);
                }
            });
            node.addEventListener('contextmenu', ev => {
                ev.preventDefault();
                const id = Number(node.dataset.id);
                const c = list[id];
                if (c && !If3Live.isSelectedId(id)) {
                    If3Live.selectOne(c);
                }
                If3Studio.showCtx(ev.clientX, ev.clientY);
            });
        });
        If3Studio.renderCrumb();
    }

    static sync(): void {
        If3Studio.renderTree();
        If3Studio.fillProps();
    }

    private static fillProps(): void {
        If3Studio.renderProps();
    }

    private static renderProps(): void {
        const box = If3Studio.fieldsEl;
        if (!box) {
            return;
        }
        const c = If3Live.com;
        const key = If3Live.selected.join(',') + ':' + If3Studio.focusId;
        if (document.activeElement && box.contains(document.activeElement) && key === If3Studio.propsKey) {
            return;
        }
        If3Studio.propsKey = key;
        if (!c) {
            box.innerHTML = '<div class="hint">Click a component. Ctrl-click adds. Shift-drag marquees. 1–6 then click to place.</div>';
            return;
        }
        if (If3Live.selected.length > 1) {
            box.innerHTML = If3Studio.multiPropsHtml();
            If3Studio.bindMultiProps();
            return;
        }
        box.innerHTML = If3Studio.singlePropsHtml(c);
        If3Studio.bindSingleProps(c);
    }

    private static scriptHint(c: IfType): string {
        const bits: string[] = [];
        if (c.onvartransmitlist && c.onvartransmitlist.length) {
            bits.push('onvartransmitlist ' + Array.from(c.onvartransmitlist).join(','));
        }
        if (c.onstattransmitlist && c.onstattransmitlist.length) {
            bits.push('onstattransmitlist ' + Array.from(c.onstattransmitlist).join(','));
        }
        if (c.oninvtransmitlist && c.oninvtransmitlist.length) {
            bits.push('oninvtransmitlist ' + Array.from(c.oninvtransmitlist).join(','));
        }
        if (c.scripts && c.scripts[0] && c.scriptComparator) {
            const s = c.scripts[0];
            let varp = -1;
            for (let i = 0; i < s.length - 1; i++) {
                if (s[i] === 5) {
                    varp = s[i + 1];
                    break;
                }
            }
            const cmp = ['', '==', '>=', '<=', '!='][c.scriptComparator[0]] || '?';
            bits.push('CS1 ' + (varp >= 0 ? 'varp ' + varp : 'script') + ' ' + cmp + ' ' + (c.scriptOperand ? c.scriptOperand[0] : ''));
        }
        const rec = c as unknown as Record<string, unknown>;
        for (const k of HOOK_KEYS) {
            const v = rec[k];
            if (Array.isArray(v) && v.length) {
                bits.push(k + ' cs2 ' + v[0]);
            }
        }
        const bar = If3Studio.barNote(c);
        if (bar) {
            bits.unshift(bar);
        }
        if (!bits.length) {
            return '<div class="sec">Scripts / hooks</div><div class="hint">Cache/CS2 — read-only. No varp or hook on this component. 520/521 bars are a RECT clipped by a LAYER (fill slider), not a varp.</div>';
        }
        return '<div class="sec">Scripts / hooks</div><div class="hint">Cache/CS2 — read-only. Not authored here; Save does not rewrite these.</div><div class="script-hint">' + bits.map(b => If3Studio.esc(b)).join('<br>') + '</div>';
    }

    private static parentOf(c: IfType): IfType | null {
        if (c.layerId < 0) {
            return null;
        }
        return IfType.get(c.layerId);
    }

    private static kidsOf(c: IfType): IfType[] {
        const pid = c.parentId;
        return If3Studio.list().filter((x): x is IfType => !!x && x.layerId === pid);
    }

    private static isClipFill(c: IfType): boolean {
        const p = If3Studio.parentOf(c);
        return !!p && p.type === 0 && (c.type === 3 || c.type === 5) && c.x < 0;
    }

    private static isClipLayer(c: IfType): boolean {
        return c.type === 0 && If3Studio.kidsOf(c).some(k => If3Studio.isClipFill(k) || ((k.type === 3 || k.type === 5) && k.width >= c.width && c.height <= 24));
    }

    private static pipLayers(): IfType[] {
        const layers = If3Studio.list()
            .filter((c): c is IfType => !!c && c.type === 0 && c.height > 0 && c.height <= 24)
            .filter(c => If3Studio.kidsOf(c).some(k => k.type === 3 || k.type === 5))
            .sort((a, b) => a.x - b.x);
        return layers.length >= 4 ? layers : [];
    }

    private static barNote(c: IfType): string | null {
        if (If3Studio.isClipFill(c)) {
            const p = If3Studio.parentOf(c)!;
            return 'Clip bar: RECT x=' + c.x + ' inside layer ' + (p.parentId & 0xffff) + ' (' + p.width + 'px). In-game if_setposition on x. Use the fill slider.';
        }
        if (If3Studio.isClipLayer(c)) {
            return 'Clip window: children are clipped to this LAYER width. In-game if_setsize. Use the fill slider.';
        }
        const pips = If3Studio.pipLayers();
        if (pips.includes(c) || (c.type === 3 && If3Studio.parentOf(c) && pips.includes(If3Studio.parentOf(c)!))) {
            return 'Pip bar: ' + pips.length + ' clip layers. Fill slider unhides the first N.';
        }
        return null;
    }

    private static applyBarFill(pct: number): void {
        const p = Math.max(0, Math.min(100, pct));
        const com = If3Live.com;
        if (com && If3Studio.isClipFill(com)) {
            If3Studio.applyClipX(com, p);
        } else if (com && If3Studio.isClipLayer(com)) {
            If3Studio.applyClipW(com, p);
        } else {
            const pips = If3Studio.pipLayers();
            if (pips.length) {
                const n = Math.round((p / 100) * pips.length);
                for (let i = 0; i < pips.length; i++) {
                    pips[i].hide = i >= n;
                    if (!pips[i].hide) {
                        pips[i].renderWidth = pips[i].width;
                        pips[i].renderHeight = pips[i].height;
                    }
                }
            } else {
                for (const c of If3Studio.list()) {
                    if (c && If3Studio.isClipFill(c)) {
                        If3Studio.applyClipX(c, p);
                    }
                }
            }
        }
        If3Live.apply();
        If3Studio.renderTree();
    }

    private static applyClipX(c: IfType, pct: number): void {
        const p = If3Studio.parentOf(c);
        const minX = -c.width;
        const maxX = p ? p.width - c.width : 0;
        c.x = Math.round(minX + (maxX - minX) * (pct / 100));
        c.hide = false;
        if (p) {
            p.hide = false;
        }
    }

    private static applyClipW(c: IfType, pct: number): void {
        const kids = If3Studio.kidsOf(c);
        const maxW = Math.max(c.width, ...kids.map(k => k.width), 1);
        c.width = Math.max(1, Math.round(maxW * (pct / 100)));
        c.renderWidth = c.width;
        c.hide = pct <= 0;
    }

    private static colourHex(c: number): string {
        const n = Number(c) >>> 0;
        return '#' + ((n >> 16) & 255).toString(16).padStart(2, '0') + ((n >> 8) & 255).toString(16).padStart(2, '0') + (n & 255).toString(16).padStart(2, '0');
    }

    private static hexToColour(h: string): number {
        const m = /^#?([0-9a-f]{6})$/i.exec(h);
        return m ? parseInt(m[1], 16) : 0;
    }

    private static collectUsedVarps(): number[] {
        const ids = new Set<number>();
        for (const c of If3Studio.list()) {
            if (!c) {
                continue;
            }
            if (c.onvartransmitlist) {
                for (const id of c.onvartransmitlist) {
                    ids.add(id);
                }
            }
            if (c.scripts) {
                for (const s of c.scripts) {
                    if (!s) {
                        continue;
                    }
                    for (let i = 0; i < s.length - 1; i++) {
                        if (s[i] === 5) {
                            ids.add(s[i + 1]);
                        }
                    }
                }
            }
        }
        return [...ids].filter(id => id >= 0).sort((a, b) => a - b);
    }

    private static fillUsedVarps(): void {
        const sel = document.getElementById('if3-varp-used') as HTMLSelectElement | null;
        if (!sel) {
            return;
        }
        const ids = If3Studio.collectUsedVarps();
        sel.innerHTML = ids.length
            ? '<option value="">used varps…</option>' + ids.map(id => `<option value="${id}">${id}</option>`).join('')
            : '<option value="">no varp hooks on this widget</option>';
    }

    private static ensureModal(): HTMLElement {
        let m = document.getElementById('if3-modal');
        if (m) {
            return m;
        }
        m = document.createElement('div');
        m.id = 'if3-modal';
        m.innerHTML = `<div class="sheet"><header><b id="if3-modal-title"></b><button type="button" id="if3-modal-x">×</button></header>
            <input id="if3-modal-q" type="search" placeholder="name or id…" style="width:100%;box-sizing:border-box;margin-bottom:8px">
            <div id="if3-modal-hits"></div></div>`;
        document.body.appendChild(m);
        m.querySelector('#if3-modal-x')!.addEventListener('click', () => m!.classList.remove('on'));
        m.addEventListener('click', ev => {
            if (ev.target === m) {
                m!.classList.remove('on');
            }
        });
        return m;
    }

    private static openNamedPicker(kind: 'varp' | 'varbit' | 'seq' | 'model'): void {
        const m = If3Studio.ensureModal();
        const title = m.querySelector('#if3-modal-title')!;
        const qel = m.querySelector('#if3-modal-q') as HTMLInputElement;
        const hitsEl = m.querySelector('#if3-modal-hits')!;
        title.textContent = kind === 'varp' ? 'Pick varp' : kind === 'seq' ? 'Pick seq' : kind === 'model' ? 'Pick model' : 'Pick varbit';
        qel.value = kind === 'seq' ? 'chathead' : '';
        hitsEl.innerHTML = '';
        m.classList.add('on');
        qel.focus();
        let t = 0;
        const run = async (): Promise<void> => {
            const q = qel.value.trim();
            const path = kind === 'varp' ? '/api/varps' : kind === 'seq' ? '/api/seqs' : kind === 'model' ? '/api/models' : '/api/varbits';
            try {
                const r = await fetch(If3Studio.editorUrl + path + '?q=' + encodeURIComponent(q)).then(x => x.json()) as { hits?: Array<{ id: number; name: string }> };
                const hits = (r.hits || []).slice();
                if (kind === 'seq' || kind === 'model') {
                    hits.unshift({ id: -1, name: '(none)' });
                }
                if (!hits.length) {
                    hitsEl.textContent = 'no hits (is if3-editor on :8799?)';
                    return;
                }
                hitsEl.innerHTML = hits.map(h => `<button type="button" data-id="${h.id}"><b>${h.id}</b> ${If3Studio.esc(h.name)}</button>`).join('');
                hitsEl.querySelectorAll('button').forEach(b => {
                    b.addEventListener('click', () => {
                        const id = Number((b as HTMLElement).dataset.id);
                        If3Studio.pushHist();
                        if (kind === 'seq') {
                            If3Studio.setOnSelected(com => {
                                com.modelAnim = id < 0 ? -1 : id;
                            });
                            If3Live.apply();
                            If3Studio.resetAnim?.(If3Studio.widget);
                            If3Studio.pickLabel.set('seq', hits.find(h => h.id === id)?.name || '');
                            If3Studio.propsKey = '';
                            If3Studio.fillProps();
                        } else if (kind === 'model') {
                            If3Studio.setOnSelected(com => {
                                com.model1Type = 1;
                                com.model1Id = id;
                                com.invobject = -1;
                            });
                            If3Live.apply(true);
                            If3Studio.pickLabel.set('model', hits.find(h => h.id === id)?.name || '');
                            If3Studio.propsKey = '';
                            If3Studio.fillProps();
                        } else {
                            const inp = document.getElementById(kind === 'varp' ? 'if3-varp-id' : 'if3-varbit-id') as HTMLInputElement | null;
                            if (inp) {
                                inp.value = String(id);
                            }
                        }
                        m.classList.remove('on');
                    });
                });
            } catch {
                hitsEl.textContent = 'cannot reach ' + If3Studio.editorUrl;
            }
        };
        qel.oninput = () => {
            clearTimeout(t);
            t = window.setTimeout(() => void run(), 200);
        };
        void run();
    }

    private static openSpritePicker(): void {
        const m = If3Studio.ensureModal();
        const title = m.querySelector('#if3-modal-title')!;
        const qel = m.querySelector('#if3-modal-q') as HTMLInputElement;
        const hitsEl = m.querySelector('#if3-modal-hits')!;
        title.textContent = 'Pick sprite';
        qel.value = '';
        m.classList.add('on');
        qel.focus();
        const used = [...new Set(If3Studio.list().map(c => (c && c.type === 5 ? c.graphic : -1)).filter(id => id >= 0))];
        const render = (ids: number[]): void => {
            const none = `<button type="button" data-id="-1">(none)</button>`;
            hitsEl.innerHTML = none + (ids.slice(0, 80).map(id =>
                `<button type="button" data-id="${id}"><img src="${If3Studio.editorUrl}/api/sprite/${id}.png" alt=""> ${id}</button>`
            ).join('') || '');
            hitsEl.querySelectorAll('button').forEach(b => {
                b.addEventListener('click', () => {
                    If3Studio.pushHist();
                    const id = Number((b as HTMLElement).dataset.id);
                    If3Studio.setOnSelected(com => {
                        com.graphic = id;
                    });
                    If3Live.apply();
                    If3Studio.propsKey = '';
                    If3Studio.fillProps();
                    m.classList.remove('on');
                });
            });
        };
        render(used);
        let t = 0;
        qel.oninput = () => {
            clearTimeout(t);
            t = window.setTimeout(async () => {
                const q = qel.value.trim();
                if (!q) {
                    render(used);
                    return;
                }
                if (/^\d+$/.test(q)) {
                    render([Number(q), ...used.filter(id => String(id).includes(q))]);
                    return;
                }
                try {
                    const r = await fetch(If3Studio.editorUrl + '/api/sprites').then(x => x.json()) as { ids?: number[] };
                    const ids = (r.ids || []).filter(id => String(id).includes(q));
                    render(ids);
                } catch {
                    hitsEl.textContent = 'cannot reach editor';
                }
            }, 200);
        };
    }

    private static openEntityPicker(kind: 'npc' | 'obj'): void {
        const m = If3Studio.ensureModal();
        const title = m.querySelector('#if3-modal-title')!;
        const qel = m.querySelector('#if3-modal-q') as HTMLInputElement;
        const hitsEl = m.querySelector('#if3-modal-hits')!;
        title.textContent = kind === 'npc' ? 'Preview NPC' : 'Preview OBJ';
        qel.value = '';
        hitsEl.innerHTML = `<button type="button" data-id="-1">(none)</button>`;
        hitsEl.querySelector('button')?.addEventListener('click', () => {
            If3Studio.clearModel();
            m.classList.remove('on');
        });
        m.classList.add('on');
        qel.focus();
        let t = 0;
        qel.oninput = () => {
            clearTimeout(t);
            t = window.setTimeout(async () => {
                const q = qel.value.trim();
                if (!q) {
                    hitsEl.textContent = '';
                    return;
                }
                try {
                    const r = await fetch(If3Studio.editorUrl + '/api/' + (kind === 'npc' ? 'npcs' : 'objs') + '?q=' + encodeURIComponent(q)).then(x => x.json()) as { hits?: Array<{ id: number; name: string }> };
                    const hits = r.hits || [];
                    hitsEl.innerHTML = hits.map(h => `<button type="button" data-id="${h.id}"><b>${h.id}</b> ${h.name}</button>`).join('') || 'no hits';
                    hitsEl.querySelectorAll('button').forEach(b => {
                        b.addEventListener('click', async () => {
                            const id = Number((b as HTMLElement).dataset.id);
                            if (id < 0) {
                                If3Studio.clearModel();
                                m.classList.remove('on');
                                return;
                            }
                            if (!If3Live.com) {
                                return;
                            }
                            const full = await fetch(If3Studio.editorUrl + '/api/' + kind + '/' + id).then(x => x.json()) as {
                                models?: number[]; heads?: number[]; model?: number; zoom?: number; xan?: number; yan?: number; xof?: number; yof?: number;
                            };
                            if (kind === 'npc') {
                                If3Live.com.model1Type = 2;
                                If3Live.com.model1Id = id;
                                If3Live.com.invobject = -1;
                            } else {
                                If3Live.com.model1Type = 4;
                                If3Live.com.model1Id = id;
                                If3Live.com.invobject = id;
                                if (full.zoom) {
                                    If3Live.com.modelZoom = Math.max(40, (full.zoom / 10) | 0);
                                }
                                if (full.xan != null) {
                                    If3Live.com.modelXAn = full.xan;
                                }
                                if (full.yan != null) {
                                    If3Live.com.modelYAn = full.yan;
                                }
                            }
                            If3Live.apply(true);
                            If3Studio.fillProps();
                            m.classList.remove('on');
                        });
                    });
                } catch {
                    hitsEl.textContent = 'cannot reach ' + If3Studio.editorUrl;
                }
            }, 200);
        };
    }

    private static pokeVarp(): void {
        const id = Number((document.getElementById('if3-varp-id') as HTMLInputElement | null)?.value);
        const val = Number((document.getElementById('if3-varp-val') as HTMLInputElement | null)?.value);
        if (!Number.isInteger(id) || id < 0) {
            return;
        }
        If3Studio.notifyVarp?.(id, val | 0);
        If3Studio.setStatus('varp ' + id + ' = ' + (val | 0));
    }

    private static pokeVarbit(): void {
        const id = Number((document.getElementById('if3-varbit-id') as HTMLInputElement | null)?.value);
        const val = Number((document.getElementById('if3-varbit-val') as HTMLInputElement | null)?.value);
        if (!Number.isInteger(id) || id < 0) {
            return;
        }
        If3Studio.notifyVarbit?.(id, val | 0);
        If3Studio.setStatus('varbit ' + id + ' = ' + (val | 0));
    }

    private static nextSlot(): number {
        const list = If3Studio.list();
        for (let i = 0; i < list.length; i++) {
            if (!list[i]) {
                return i;
            }
        }
        return list.length;
    }

    private static add(type: number, gx?: number, gy?: number, w?: number, h?: number): void {
        if (!IfType.openInterface(If3Studio.widget)) {
            return;
        }
        If3Studio.pushHist();
        const sel = If3Live.com;
        if (sel && If3Studio.isEmptySlot(If3Live.child)) {
            If3Studio.fillSlot(If3Live.child, type, gx, gy, w, h);
            return;
        }
        const slot = If3Studio.nextSlot();
        If3Studio.fillSlot(slot, type, gx, gy, w, h);
    }

    private static hideSel(): void {
        if (!If3Live.selected.length) {
            return;
        }
        If3Studio.pushHist();
        const list = If3Studio.list();
        for (const id of If3Live.selected) {
            const c = list[id];
            if (c) {
                c.hide = !c.hide;
                If3Live.applyCom(c);
            }
        }
        If3Studio.sync();
    }

    static dumpChildren(): Array<Record<string, unknown>> {
        const list = If3Studio.list();
        const out: Array<Record<string, unknown>> = [];
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (!c) {
                out.push({ id: i, format: 'empty' });
                continue;
            }
            const row: Record<string, unknown> = {
                id: i,
                format: c.v3 ? 'if3' : 'if1',
                type: c.type,
                x: c.x,
                y: c.y,
                width: c.width,
                height: c.height,
                layer: c.layerId === -1 ? -1 : c.layerId & 0xffff,
                hide: c.hide,
                text: c.text || '',
                graphic: c.graphic,
                colour: c.colour,
                font: c.font,
                fill: c.fill,
                trans: c.trans,
                rotate: c.rotate,
                tiling: c.tiling,
                hflip: c.hFlip,
                vflip: c.vFlip,
                lineheight: c.lineHeight,
                halign: c.hAlign,
                valign: c.vAlign,
                shadow: c.shadow,
                outline: c.outline,
                shadowcolour: c.shadowColour,
                orthog: c.orthog,
                linewidth: c.lineWidth,
                alpha_mode: c.field3477,
                clientcode: c.clientCode,
                eventcode: c.eventCode,
                scrollheight: c.scrollHeight,
                scrollwidth: c.scrollWidth,
                modelzoom: c.modelZoom,
                modelxan: c.modelXAn,
                modelyan: c.modelYAn,
                modelzan: c.modelZAn,
                modelxof: c.modelXOf,
                modelyof: c.modelYOf,
                modelanim: c.modelAnim,
                baseop: c.baseOpName || '',
                targetverb: c.targetVerb || '',
                dragdeadzone: c.dragdeadzone,
                dragdeadtime: c.dragdeadtime,
                draggable: c.draggablebehavior,
                ops: c.opNames ? c.opNames.map(o => o || '') : []
            };
            if (c.type === 6 && c.model1Type === 1) {
                row.model = c.model1Id;
            }
            out.push(row);
        }
        return out;
    }

    private static async save(): Promise<void> {
        If3Studio.setStatus('Saving…');
        try {
            const r = await fetch(If3Studio.editorUrl + '/api/live-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    widget: If3Studio.widget,
                    pack: true,
                    children: If3Studio.dumpChildren()
                })
            });
            const j = (await r.json()) as { ok?: boolean; saved?: string; error?: string; packed?: boolean; log?: string };
            if (!r.ok || !j.ok) {
                If3Studio.setStatus(j.error || j.log || 'save failed (if3-editor on :8799?)');
                return;
            }
            If3Studio.setStatus('Saved+packed ' + (j.saved || '').split(/[/\\]/).pop());
            window.setTimeout(() => {
                try {
                    new BroadcastChannel('if3-pack').postMessage({ widget: If3Studio.widget });
                } catch {
                    /* BroadcastChannel missing */
                }
            }, 800);
        } catch (e) {
            If3Studio.setStatus('Cannot reach ' + If3Studio.editorUrl + ' — ' + (e instanceof Error ? e.message : String(e)));
        }
    }

    private static async loadList(): Promise<void> {
        const sel = If3Studio.fileSel;
        if (!sel) {
            return;
        }
        try {
            const r = await fetch(If3Studio.editorUrl + '/api/list').then(x => x.json()) as { widgets?: Array<{ id: number; name: string }> };
            const widgets = r.widgets || [];
            sel.innerHTML = widgets.map(w => `<option value="${w.id}">${w.id} ${w.name}</option>`).join('');
            sel.value = String(If3Studio.widget);
        } catch {
            sel.innerHTML = `<option value="${If3Studio.widget}">${If3Studio.widget}</option>`;
        }
    }

    private static setStatus(msg: string): void {
        If3Studio.status = msg;
        if (If3Studio.statusEl) {
            If3Studio.statusEl.textContent = msg;
        }
    }

    private static num(v: string | number, fallback = 0): number {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

    private static esc(s: string): string {
        return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
    }

    private static typingInField(ev: KeyboardEvent): boolean {
        const t = ev.target as HTMLElement | null;
        if (!t) {
            return false;
        }
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return true;
        }
        return !!t.isContentEditable;
    }

    private static resetWidget(): void {
        If3Studio.opened = false;
        If3Live.clearSel();
        If3Studio.clearHist();
        If3Studio.focusId = -1;
        If3Studio.placeType = null;
        If3Studio.stockSnap = null;
        If3Studio.propsKey = '';
        If3Studio.invalidateFrame();
        If3Studio.syncPlaceBanner();
    }

    private static clearHist(): void {
        If3Studio.undoStack = [];
        If3Studio.redoStack = [];
    }

    private static pushHist(): void {
        If3Studio.undoStack.push(JSON.stringify({
            children: If3Studio.dumpChildren(),
            selected: If3Live.selected.slice(),
            focusId: If3Studio.focusId
        }));
        if (If3Studio.undoStack.length > 120) {
            If3Studio.undoStack.shift();
        }
        If3Studio.redoStack.length = 0;
    }

    private static applySnap(state: string): void {
        const s = JSON.parse(state) as { children: ChildDump[]; selected: number[]; focusId: number };
        If3Studio.applyDump(s.children);
        If3Studio.focusId = s.focusId ?? -1;
        If3Live.selectIds(s.selected || [], If3Studio.list());
        If3Studio.propsKey = '';
        If3Studio.invalidateFrame();
        If3Studio.sync();
        requestAnimationFrame(() => If3Studio.fitGame());
    }

    private static undo(): void {
        if (!If3Studio.undoStack.length) {
            return;
        }
        If3Studio.redoStack.push(JSON.stringify({
            children: If3Studio.dumpChildren(),
            selected: If3Live.selected.slice(),
            focusId: If3Studio.focusId
        }));
        If3Studio.applySnap(If3Studio.undoStack.pop()!);
        If3Studio.setStatus('Undo');
    }

    private static redo(): void {
        if (!If3Studio.redoStack.length) {
            return;
        }
        If3Studio.undoStack.push(JSON.stringify({
            children: If3Studio.dumpChildren(),
            selected: If3Live.selected.slice(),
            focusId: If3Studio.focusId
        }));
        If3Studio.applySnap(If3Studio.redoStack.pop()!);
        If3Studio.setStatus('Redo');
    }

    private static applyDump(children: ChildDump[]): void {
        if (!IfType.list[If3Studio.widget]) {
            return;
        }
        let list = IfType.list[If3Studio.widget];
        const maxId = children.reduce((m, r) => Math.max(m, If3Studio.num(r.id as number, -1)), -1);
        if (maxId >= list.length) {
            IfType.list[If3Studio.widget] = list.concat(new Array(maxId - list.length + 1).fill(null));
            list = IfType.list[If3Studio.widget];
        }
        const seen = new Set<number>();
        for (const raw of children) {
            const id = If3Studio.num(raw.id as number, -1);
            if (id < 0) {
                continue;
            }
            seen.add(id);
            if (raw.format === 'empty') {
                (list as Array<IfType | null>)[id] = null;
                continue;
            }
            if (!list[id]) {
                const c = new IfType();
                c.parentId = id + (If3Studio.widget << 16);
                list[id] = c;
            }
            If3Studio.applyRow(list[id]!, raw);
        }
        for (let i = If3Studio.stockCount; i < list.length; i++) {
            if (!seen.has(i)) {
                (list as Array<IfType | null>)[i] = null;
            }
        }
        If3Live.redraw();
    }

    private static applyRow(c: IfType, raw: ChildDump): void {
        c.v3 = raw.format !== 'if1';
        if (typeof raw.type === 'number') {
            c.type = raw.type;
        }
        const n = (k: string, d = 0): number => If3Studio.num(raw[k] as number, d);
        if ('x' in raw) {
            c.x = n('x');
        }
        if ('y' in raw) {
            c.y = n('y');
        }
        if ('width' in raw) {
            c.width = n('width');
        }
        if ('height' in raw) {
            c.height = n('height');
        }
        if (typeof raw.hide === 'boolean') {
            c.hide = raw.hide;
        }
        if (typeof raw.text === 'string') {
            c.text = raw.text;
        }
        if ('graphic' in raw) {
            c.graphic = n('graphic', -1);
        }
        if ('colour' in raw) {
            c.colour = n('colour');
        }
        if ('font' in raw) {
            c.font = n('font', -1);
        }
        if (typeof raw.fill === 'boolean') {
            c.fill = raw.fill;
        }
        if ('trans' in raw) {
            c.trans = n('trans');
        }
        if ('rotate' in raw) {
            c.rotate = n('rotate');
        }
        if (typeof raw.tiling === 'boolean') {
            c.tiling = raw.tiling;
        }
        if (typeof raw.hflip === 'boolean') {
            c.hFlip = raw.hflip;
        }
        if (typeof raw.vflip === 'boolean') {
            c.vFlip = raw.vflip;
        }
        if ('lineheight' in raw) {
            c.lineHeight = n('lineheight');
        }
        if ('halign' in raw) {
            c.hAlign = n('halign');
        }
        if ('valign' in raw) {
            c.vAlign = n('valign');
        }
        if (typeof raw.shadow === 'boolean') {
            c.shadow = raw.shadow;
        }
        if ('outline' in raw) {
            c.outline = n('outline');
        }
        if ('shadowcolour' in raw) {
            c.shadowColour = n('shadowcolour');
        }
        if (typeof raw.orthog === 'boolean') {
            c.orthog = raw.orthog;
        }
        if ('linewidth' in raw) {
            c.lineWidth = n('linewidth');
        }
        if (typeof raw.alpha_mode === 'boolean') {
            c.field3477 = raw.alpha_mode;
        }
        if ('clientcode' in raw) {
            c.clientCode = n('clientcode');
        }
        if ('eventcode' in raw) {
            c.eventCode = n('eventcode');
        }
        if ('scrollheight' in raw) {
            c.scrollHeight = n('scrollheight');
        }
        if ('scrollwidth' in raw) {
            c.scrollWidth = n('scrollwidth');
        }
        if ('modelzoom' in raw) {
            c.modelZoom = n('modelzoom');
        }
        if ('modelxan' in raw) {
            c.modelXAn = n('modelxan');
        }
        if ('modelyan' in raw) {
            c.modelYAn = n('modelyan');
        }
        if ('modelzan' in raw) {
            c.modelZAn = n('modelzan');
        }
        if ('modelxof' in raw) {
            c.modelXOf = n('modelxof');
        }
        if ('modelyof' in raw) {
            c.modelYOf = n('modelyof');
        }
        if ('modelanim' in raw) {
            c.modelAnim = n('modelanim', -1);
            if (c.modelAnim < 0) {
                c.modelAnim = -1;
            }
        }
        if (typeof raw.model === 'number') {
            c.model1Type = 1;
            c.model1Id = raw.model;
            c.invobject = raw.model === -1 ? -1 : c.invobject;
        }
        if ('layer' in raw) {
            const v = n('layer', -1);
            c.layerId = v < 0 ? -1 : v + (If3Studio.widget << 16);
        }
        if (typeof raw.baseop === 'string') {
            c.baseOpName = raw.baseop;
        }
        if (typeof raw.targetverb === 'string') {
            c.targetVerb = raw.targetverb;
        }
        if ('dragdeadzone' in raw) {
            c.dragdeadzone = n('dragdeadzone');
        }
        if ('dragdeadtime' in raw) {
            c.dragdeadtime = n('dragdeadtime');
        }
        if (typeof raw.draggable === 'boolean') {
            c.draggablebehavior = raw.draggable;
        }
        if (Array.isArray(raw.ops)) {
            for (let i = 0; i < (raw.ops as unknown[]).length; i++) {
                c.setOpName(String((raw.ops as unknown[])[i] ?? ''), i);
            }
        }
        c.renderWidth = c.width;
        c.renderHeight = c.height;
        If3Live.dirty(c);
    }

    private static setOnSelected(fn: (c: IfType) => void): void {
        const list = If3Studio.list();
        for (const id of If3Live.selected) {
            const c = list[id];
            if (c && If3Studio.editable(c, id)) {
                fn(c);
            }
        }
    }

    private static editable(c: IfType | null, id: number): boolean {
        return !!c && !If3Live.isLocked(id);
    }

    private static isEmptySlot(id: number): boolean {
        return !If3Studio.list()[id];
    }

    private static defaultParent(): number {
        if (If3Studio.focusId >= 0) {
            return If3Studio.focusId;
        }
        const p = If3Live.com;
        if (p && p.type === 0) {
            return If3Live.child;
        }
        if (p && p.layerId !== -1) {
            return p.layerId & 0xffff;
        }
        return -1;
    }

    private static fillSlot(slot: number, type: number, gx?: number, gy?: number, w?: number, h?: number): void {
        const list = IfType.list[If3Studio.widget];
        const c = new IfType();
        c.v3 = true;
        c.type = type;
        const parent = If3Studio.defaultParent();
        const origin = parent >= 0 && list[parent] ? If3Studio.absOf(list[parent]!) : { x: 0, y: 0 };
        c.x = gx != null ? Math.round(gx - origin.x) : 8;
        c.y = gy != null ? Math.round(gy - origin.y) : 8;
        c.width = w != null ? Math.max(1, Math.round(w)) : type === 0 ? 200 : type === 4 ? 120 : 32;
        c.height = h != null ? Math.max(1, Math.round(h)) : type === 0 ? 150 : type === 4 ? 16 : 32;
        c.hide = false;
        c.model1Type = 1;
        c.model1Id = -1;
        c.modelZoom = 200;
        c.modelAnim = -1;
        c.graphic = -1;
        c.text = type === 4 ? 'New text' : '';
        c.colour = type === 4 ? 0xffffff : 0;
        c.fill = type === 3;
        c.font = 497;
        c.parentId = slot + (If3Studio.widget << 16);
        c.layerId = parent < 0 ? -1 : parent + (If3Studio.widget << 16);
        if (slot >= list.length) {
            IfType.list[If3Studio.widget] = list.concat(new Array(slot - list.length + 1).fill(null));
        }
        IfType.list[If3Studio.widget][slot] = c;
        If3Live.selectOne(c);
        If3Studio.invalidateFrame();
        If3Studio.sync();
        const past = If3Studio.stockCount && slot >= If3Studio.stockCount;
        If3Studio.setStatus('Added com_' + slot + ' ' + (TYPES[type] || type) + (past ? ' (past stock — .if3 only)' : ''));
    }

    private static startPlace(type: number): void {
        const sel = If3Live.com;
        if (sel && If3Studio.isEmptySlot(If3Live.child)) {
            If3Studio.add(type);
            return;
        }
        If3Studio.placeType = type;
        If3Studio.syncPlaceBanner();
        If3Studio.setStatus('Click the preview to place ' + (TYPES[type] || type));
        document.querySelectorAll('#if3-add [data-type]').forEach(b => {
            (b as HTMLElement).classList.toggle('on', Number((b as HTMLElement).dataset.type) === type);
        });
    }

    private static cancelPlace(): void {
        If3Studio.placeType = null;
        If3Studio.syncPlaceBanner();
        document.querySelectorAll('#if3-add [data-type]').forEach(b => b.classList.remove('on'));
    }

    private static syncPlaceBanner(): void {
        const el = document.getElementById('if3-place');
        if (!el) {
            return;
        }
        if (If3Studio.placeType == null) {
            el.classList.add('if3-hide');
            return;
        }
        el.classList.remove('if3-hide');
        el.textContent = 'Placing ' + (TYPES[If3Studio.placeType] || If3Studio.placeType) + ' — click the preview (drag to size). Esc cancels.';
    }

    private static absOf(c: IfType): { x: number; y: number } {
        let x = c.x;
        let y = c.y;
        let p = c.layerId;
        let g = 32;
        while (p >= 0 && g-- > 0) {
            const up = IfType.get(p);
            if (!up) {
                break;
            }
            x += up.x;
            y += up.y;
            p = up.layerId;
        }
        return { x, y };
    }

    private static setAbs(c: IfType, ax: number, ay: number): void {
        const p = If3Studio.absOf(c);
        c.x = Math.round(ax - (p.x - c.x));
        c.y = Math.round(ay - (p.y - c.y));
    }

    private static snapToSiblings(n: IfType, ax: number, ay: number): { x: number; y: number; guides: Array<{ axis: 'x' | 'y'; at: number }> } {
        const TH = 5;
        const w = n.width;
        const h = n.height;
        const guides: Array<{ axis: 'x' | 'y'; at: number }> = [];
        const edges: Array<{ l: number; r: number; t: number; b: number; cx: number; cy: number }> = [];
        const list = If3Studio.list();
        const skip = new Set(If3Live.selected);
        for (let i = 0; i < list.length; i++) {
            const o = list[i];
            if (!o || o.hide || skip.has(i)) {
                continue;
            }
            const a = If3Studio.absOf(o);
            edges.push({ l: a.x, r: a.x + o.width, t: a.y, b: a.y + o.height, cx: a.x + o.width / 2, cy: a.y + o.height / 2 });
        }
        let x = ax;
        let y = ay;
        let bestX = TH + 1;
        let gx: number | null = null;
        let bestY = TH + 1;
        let gy: number | null = null;
        for (const e of edges) {
            const candX = [e.l, e.r, e.l - w, e.r - w, e.cx - w / 2];
            const lineX = [e.l, e.r, e.l, e.r, e.cx];
            for (let i = 0; i < candX.length; i++) {
                const d = Math.abs(ax - candX[i]);
                if (d < bestX) {
                    bestX = d;
                    x = candX[i];
                    gx = lineX[i];
                }
            }
            const candY = [e.t, e.b, e.t - h, e.b - h, e.cy - h / 2];
            const lineY = [e.t, e.b, e.t, e.b, e.cy];
            for (let i = 0; i < candY.length; i++) {
                const d = Math.abs(ay - candY[i]);
                if (d < bestY) {
                    bestY = d;
                    y = candY[i];
                    gy = lineY[i];
                }
            }
        }
        if (bestX <= TH && gx != null) {
            guides.push({ axis: 'x', at: gx });
        } else {
            x = ax;
        }
        if (bestY <= TH && gy != null) {
            guides.push({ axis: 'y', at: gy });
        } else {
            y = ay;
        }
        return { x, y, guides };
    }

    private static rangeSel(id: number): void {
        const vis: number[] = [];
        If3Studio.treeEl?.querySelectorAll('.if3-row').forEach(el => vis.push(Number((el as HTMLElement).dataset.id)));
        const a = vis.indexOf(If3Live.selected[If3Live.selected.length - 1]);
        const b = vis.indexOf(id);
        if (a < 0 || b < 0) {
            const c = If3Studio.list()[id];
            if (c) {
                If3Live.selectOne(c);
            }
            return;
        }
        const [lo, hi] = a < b ? [a, b] : [b, a];
        If3Live.selectIds(vis.slice(lo, hi + 1), If3Studio.list());
    }

    private static invertSel(): void {
        const have = new Set(If3Live.selected);
        const ids: number[] = [];
        const list = If3Studio.list();
        for (let i = 0; i < list.length; i++) {
            if (list[i] && !have.has(i) && If3Studio.inFocus(list[i]!)) {
                ids.push(i);
            }
        }
        If3Live.selectIds(ids, list);
    }

    private static inFocus(c: IfType): boolean {
        if (If3Studio.focusId < 0) {
            return true;
        }
        const id = c.parentId & 0xffff;
        if (id === If3Studio.focusId) {
            return true;
        }
        let p = c.layerId;
        let g = 32;
        while (p >= 0 && g-- > 0) {
            const pid = p & 0xffff;
            if (pid === If3Studio.focusId) {
                return true;
            }
            const up = IfType.get(p);
            if (!up) {
                return false;
            }
            p = up.layerId;
        }
        return false;
    }

    private static enterLayer(id: number): void {
        if (id < 0) {
            return;
        }
        const c = If3Studio.list()[id];
        if (!c || c.type !== 0) {
            return;
        }
        If3Studio.focusId = id;
        If3Studio.renderCrumb();
        If3Studio.setStatus('Editing inside layer ' + id);
        If3Studio.sync();
    }

    private static leaveLayer(): void {
        if (If3Studio.focusId < 0) {
            return;
        }
        const cur = If3Studio.list()[If3Studio.focusId];
        If3Studio.focusId = cur && cur.layerId >= 0 ? cur.layerId & 0xffff : -1;
        If3Studio.renderCrumb();
        If3Studio.sync();
    }

    private static renderCrumb(): void {
        const el = document.getElementById('if3-crumb');
        if (!el) {
            return;
        }
        if (If3Studio.focusId < 0) {
            el.classList.add('if3-hide');
            el.innerHTML = '';
            return;
        }
        const chain: number[] = [];
        let p = If3Studio.focusId;
        let g = 16;
        while (p >= 0 && g-- > 0) {
            chain.unshift(p);
            const c = If3Studio.list()[p];
            p = c && c.layerId >= 0 ? c.layerId & 0xffff : -1;
        }
        el.classList.remove('if3-hide');
        el.innerHTML = '<button type="button" data-cr="-1">widget</button>' +
            chain.map(id => `<span class="sep">/</span><button type="button" data-cr="${id}" class="${id === If3Studio.focusId ? 'on' : ''}">com_${id}</button>`).join('');
        el.querySelectorAll('button').forEach(b => {
            (b as HTMLButtonElement).onclick = () => {
                const id = Number((b as HTMLElement).dataset.cr);
                If3Studio.focusId = id;
                If3Studio.renderCrumb();
                If3Studio.sync();
            };
        });
    }

    private static duplicateSel(): void {
        if (!If3Live.selected.length) {
            return;
        }
        If3Studio.pushHist();
        const created: number[] = [];
        const srcIds = If3Live.selected.slice();
        const list = If3Studio.list();
        for (const id of srcIds) {
            const src = list[id];
            if (!src) {
                continue;
            }
            const slot = If3Studio.nextSlot();
            const dump = If3Studio.dumpChildren()[id];
            If3Studio.fillSlot(slot, src.type, If3Studio.absOf(src).x + 8, If3Studio.absOf(src).y + 8, src.width, src.height);
            const c = If3Studio.list()[slot];
            if (c && dump) {
                If3Studio.applyRow(c, { ...dump, id: slot, x: src.x + 8, y: src.y + 8 });
            }
            created.push(slot);
        }
        if (created.length) {
            If3Live.selectIds(created, If3Studio.list());
        }
        If3Studio.setStatus('Duplicated ' + created.length);
    }

    private static copySel(): void {
        If3Studio.clipboard = If3Live.selected.map(id => If3Studio.dumpChildren()[id]).filter(Boolean);
        If3Studio.setStatus('copied ' + If3Studio.clipboard.length);
    }

    private static cutSel(): void {
        If3Studio.copySel();
        If3Studio.deleteSel(true);
    }

    private static pasteSel(atCursor = false): void {
        if (!If3Studio.clipboard.length) {
            return;
        }
        If3Studio.pushHist();
        const created: number[] = [];
        for (const src of If3Studio.clipboard) {
            const slot = If3Studio.nextSlot();
            const type = If3Studio.num(src.type as number, 3);
            const gx = atCursor ? If3Studio.lastMx : undefined;
            const gy = atCursor ? If3Studio.lastMy : undefined;
            If3Studio.fillSlot(slot, type, gx, gy, If3Studio.num(src.width as number, 32), If3Studio.num(src.height as number, 32));
            const c = If3Studio.list()[slot];
            if (c) {
                If3Studio.applyRow(c, { ...src, id: slot, layer: If3Studio.defaultParent() });
                if (atCursor) {
                    const origin = If3Studio.defaultParent() >= 0 && If3Studio.list()[If3Studio.defaultParent()]
                        ? If3Studio.absOf(If3Studio.list()[If3Studio.defaultParent()]!)
                        : { x: 0, y: 0 };
                    c.x = Math.round(If3Studio.lastMx - origin.x);
                    c.y = Math.round(If3Studio.lastMy - origin.y);
                }
            }
            created.push(slot);
        }
        If3Live.selectIds(created, If3Studio.list());
        If3Studio.setStatus('pasted ' + created.length);
    }

    private static deleteSel(hard: boolean): void {
        if (!If3Live.selected.length) {
            return;
        }
        If3Studio.pushHist();
        const next: number[] = [];
        const list = If3Studio.list();
        for (const id of If3Live.selected) {
            const n = list[id];
            if (!n) {
                continue;
            }
            if (!hard) {
                n.hide = true;
                If3Live.applyCom(n);
                next.push(id);
                continue;
            }
            if (!n.v3) {
                n.hide = true;
                If3Live.applyCom(n);
                If3Studio.setStatus('IF1 cannot be removed from idx3; hidden');
                next.push(id);
                continue;
            }
            if (id < If3Studio.stockCount) {
                n.hide = true;
                If3Live.applyCom(n);
                If3Studio.setStatus('Stock IF3 slot kept. Hidden — packer will overlay hide=yes.');
                next.push(id);
                continue;
            }
            list[id] = null;
        }
        If3Live.selectIds(next, list);
        If3Studio.sync();
    }

    private static revertSel(): void {
        if (!If3Studio.stockSnap || !If3Live.selected.length) {
            return;
        }
        If3Studio.pushHist();
        const list = If3Studio.list();
        for (const id of If3Live.selected) {
            const s = If3Studio.stockSnap[id];
            const n = list[id];
            if (!n || !s || s.format === 'empty') {
                continue;
            }
            If3Studio.applyRow(n, s);
        }
        If3Studio.sync();
        If3Studio.setStatus('reverted ' + If3Live.selected.length + ' to stock');
    }

    private static align(how: string): void {
        const list = If3Studio.list();
        const nodes = If3Live.selected.map(id => list[id]).filter((c, i) => If3Studio.editable(c, If3Live.selected[i])) as IfType[];
        if (!nodes.length) {
            return;
        }
        If3Studio.pushHist();
        if (nodes.length === 1) {
            const n = nodes[0];
            const p = n.layerId >= 0 ? IfType.get(n.layerId) : null;
            if (!p) {
                If3Studio.setStatus('no parent layer to align to');
                return;
            }
            if (how === 'left') {
                n.x = 0;
            }
            if (how === 'right') {
                n.x = p.width - n.width;
            }
            if (how === 'top') {
                n.y = 0;
            }
            if (how === 'bottom') {
                n.y = p.height - n.height;
            }
            if (how === 'hcenter') {
                n.x = Math.round((p.width - n.width) / 2);
            }
            if (how === 'vcenter') {
                n.y = Math.round((p.height - n.height) / 2);
            }
            If3Live.applyCom(n);
            If3Studio.sync();
            return;
        }
        const abs = nodes.map(n => ({ n, a: If3Studio.absOf(n) }));
        if (how === 'left') {
            const m = Math.min(...abs.map(x => x.a.x));
            abs.forEach(x => If3Studio.setAbs(x.n, m, x.a.y));
        }
        if (how === 'right') {
            const m = Math.max(...abs.map(x => x.a.x + x.n.width));
            abs.forEach(x => If3Studio.setAbs(x.n, m - x.n.width, x.a.y));
        }
        if (how === 'top') {
            const m = Math.min(...abs.map(x => x.a.y));
            abs.forEach(x => If3Studio.setAbs(x.n, x.a.x, m));
        }
        if (how === 'bottom') {
            const m = Math.max(...abs.map(x => x.a.y + x.n.height));
            abs.forEach(x => If3Studio.setAbs(x.n, x.a.x, m - x.n.height));
        }
        if (how === 'hcenter') {
            const m = abs.reduce((s, x) => s + x.a.x + x.n.width / 2, 0) / abs.length;
            abs.forEach(x => If3Studio.setAbs(x.n, m - x.n.width / 2, x.a.y));
        }
        if (how === 'vcenter') {
            const m = abs.reduce((s, x) => s + x.a.y + x.n.height / 2, 0) / abs.length;
            abs.forEach(x => If3Studio.setAbs(x.n, x.a.x, m - x.n.height / 2));
        }
        nodes.forEach(n => If3Live.applyCom(n));
        If3Studio.sync();
    }

    private static distribute(axis: string): void {
        const list = If3Studio.list();
        const nodes = If3Live.selected.map(id => list[id]).filter((c, i) => If3Studio.editable(c, If3Live.selected[i])) as IfType[];
        if (nodes.length < 3) {
            return;
        }
        If3Studio.pushHist();
        const items = nodes.map(n => ({ n, a: If3Studio.absOf(n) }));
        items.sort((p, q) => (axis === 'h' ? p.a.x - q.a.x : p.a.y - q.a.y));
        const first = items[0];
        const last = items[items.length - 1];
        if (axis === 'h') {
            const span = last.a.x - first.a.x;
            items.forEach((it, i) => If3Studio.setAbs(it.n, first.a.x + (span * i) / (items.length - 1), it.a.y));
        } else {
            const span = last.a.y - first.a.y;
            items.forEach((it, i) => If3Studio.setAbs(it.n, it.a.x, first.a.y + (span * i) / (items.length - 1)));
        }
        nodes.forEach(n => If3Live.applyCom(n));
        If3Studio.sync();
    }

    private static sameSize(): void {
        const n = If3Live.com;
        if (!n) {
            return;
        }
        If3Studio.pushHist();
        If3Studio.setOnSelected(c => {
            c.width = n.width;
            c.height = n.height;
            If3Live.applyCom(c);
        });
        If3Studio.sync();
    }

    private static clearModel(): void {
        If3Studio.pushHist();
        If3Studio.setOnSelected(com => {
            com.model1Type = 1;
            com.model1Id = -1;
            com.invobject = -1;
        });
        If3Live.apply(true);
        If3Studio.propsKey = '';
        If3Studio.fillProps();
    }

    private static toggleHelp(): void {
        document.getElementById('if3-help')?.classList.toggle('if3-hide');
    }

    private static closeOverlays(): boolean {
        const ctx = document.getElementById('if3-ctx');
        const help = document.getElementById('if3-help');
        const modal = document.getElementById('if3-modal');
        const more = document.getElementById('if3-more-menu');
        let closed = false;
        if (ctx && !ctx.classList.contains('if3-hide')) {
            ctx.classList.add('if3-hide');
            closed = true;
        }
        if (help && !help.classList.contains('if3-hide')) {
            help.classList.add('if3-hide');
            closed = true;
        }
        if (modal && modal.classList.contains('on')) {
            modal.classList.remove('on');
            closed = true;
        }
        if (more && more.classList.contains('open')) {
            more.classList.remove('open');
            closed = true;
        }
        return closed;
    }

    private static onKey(ev: KeyboardEvent): void {
        If3Studio.ptr.ctrl = ev.ctrlKey || ev.metaKey;
        If3Studio.ptr.shift = ev.shiftKey;
        If3Studio.ptr.alt = ev.altKey;
        If3Studio.ptr.meta = ev.metaKey;
        if (If3Studio.embed()) {
            return;
        }
        if (ev.key === 'Escape') {
            if (If3Studio.placeType != null) {
                If3Studio.cancelPlace();
                return;
            }
            if (If3Studio.closeOverlays()) {
                return;
            }
            if (If3Studio.focusId >= 0) {
                If3Studio.leaveLayer();
                return;
            }
            If3Live.clearSel();
            If3Studio.sync();
            return;
        }
        if (ev.key === '?' && !If3Studio.typingInField(ev)) {
            If3Studio.toggleHelp();
            return;
        }
        if (If3Studio.typingInField(ev)) {
            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
                ev.preventDefault();
                void If3Studio.save();
            }
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
            ev.preventDefault();
            void If3Studio.save();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
            ev.preventDefault();
            If3Studio.undo();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) {
            ev.preventDefault();
            If3Studio.redo();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'a') {
            ev.preventDefault();
            const ids: number[] = [];
            const list = If3Studio.list();
            for (let i = 0; i < list.length; i++) {
                if (list[i] && If3Studio.inFocus(list[i]!)) {
                    ids.push(i);
                }
            }
            If3Live.selectIds(ids, list);
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
            ev.preventDefault();
            If3Studio.duplicateSel();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'c') {
            ev.preventDefault();
            If3Studio.copySel();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'x') {
            ev.preventDefault();
            If3Studio.cutSel();
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'v') {
            ev.preventDefault();
            If3Studio.pasteSel();
            return;
        }
        if (ev.key === 'Enter' && If3Live.com) {
            ev.preventDefault();
            If3Studio.enterLayer(If3Live.com.type === 0 ? If3Live.child : If3Live.com.layerId >= 0 ? If3Live.com.layerId & 0xffff : -1);
            return;
        }
        if (ev.key === 'Delete' || ev.key === 'Backspace') {
            ev.preventDefault();
            If3Studio.deleteSel(ev.shiftKey);
            return;
        }
        if (!ev.ctrlKey && !ev.metaKey && PLACE_TYPES[ev.key] != null) {
            If3Studio.startPlace(PLACE_TYPES[ev.key]);
            return;
        }
        if (ev.key === 'i' || ev.key === 'I') {
            If3Studio.invertSel();
            return;
        }
        if (ev.key === 'r' || ev.key === 'R') {
            ev.preventDefault();
            If3Studio.revertSel();
            return;
        }
        if (ev.key === 'h' || ev.key === 'H') {
            ev.preventDefault();
            If3Studio.hideSel();
            return;
        }
        if (ev.key === 'l' || ev.key === 'L') {
            for (const id of If3Live.selected) {
                if (If3Live.locked.has(id)) {
                    If3Live.locked.delete(id);
                } else {
                    If3Live.locked.add(id);
                }
            }
            If3Studio.renderTree();
            return;
        }
        if (ev.key === '[') {
            If3Live.cycleHit(-1, ev.ctrlKey || ev.metaKey);
            return;
        }
        if (ev.key === ']') {
            If3Live.cycleHit(1, ev.ctrlKey || ev.metaKey);
            return;
        }
        if (!If3Live.selected.length || !ev.key.startsWith('Arrow')) {
            return;
        }
        ev.preventDefault();
        If3Studio.pushHist();
        const step = ev.ctrlKey || ev.metaKey ? 32 : ev.shiftKey ? 8 : 1;
        const list = If3Studio.list();
        for (const id of If3Live.selected) {
            const c = list[id];
            if (!If3Studio.editable(c, id)) {
                continue;
            }
            if (ev.altKey) {
                if (ev.key === 'ArrowLeft') {
                    c!.width = Math.max(0, c!.width - step);
                }
                if (ev.key === 'ArrowRight') {
                    c!.width += step;
                }
                if (ev.key === 'ArrowUp') {
                    c!.height = Math.max(0, c!.height - step);
                }
                if (ev.key === 'ArrowDown') {
                    c!.height += step;
                }
            } else {
                if (ev.key === 'ArrowLeft') {
                    c!.x -= step;
                }
                if (ev.key === 'ArrowRight') {
                    c!.x += step;
                }
                if (ev.key === 'ArrowUp') {
                    c!.y -= step;
                }
                if (ev.key === 'ArrowDown') {
                    c!.y += step;
                }
            }
            If3Live.applyCom(c!);
        }
        If3Studio.renderTree();
        If3Studio.propsKey = '';
        If3Studio.fillProps();
    }

    private static onPtr(ev: PointerEvent): void {
        If3Studio.ptr.ctrl = ev.ctrlKey || ev.metaKey;
        If3Studio.ptr.shift = ev.shiftKey;
        If3Studio.ptr.alt = ev.altKey;
        If3Studio.ptr.x = ev.clientX;
        If3Studio.ptr.y = ev.clientY;
        if (If3Studio.isMobile() && ev.button === 0) {
            clearTimeout(If3Studio.holdTimer);
            If3Studio.holdTimer = window.setTimeout(() => If3Studio.showCtx(ev.clientX, ev.clientY), 480);
        }
    }

    private static onRightClick(x: number, y: number): void {
        const hover = If3Live.pickHover();
        if (hover && !If3Live.isSelectedId(If3Live.childId(hover))) {
            If3Live.selectOne(hover);
        }
        If3Studio.showCtx(x, y);
    }

    private static showCtx(x: number, y: number): void {
        const ctx = document.getElementById('if3-ctx');
        if (!ctx) {
            return;
        }
        const n = If3Live.com;
        const multi = If3Live.selected.length > 1;
        ctx.innerHTML = `
            <button type="button" data-k="dup">Duplicate</button>
            <button type="button" data-k="copy">Copy</button>
            <button type="button" data-k="cut">Cut</button>
            <button type="button" data-k="paste">Paste</button>
            <button type="button" data-k="pastehere">Paste at cursor</button>
            <button type="button" data-k="hide">Hide / Unhide</button>
            <button type="button" data-k="del">Hide (Delete)</button>
            <button type="button" data-k="hard">Remove slot (Shift+Delete)</button>
            <div class="dim">layers</div>
            <button type="button" data-k="enter">Edit inside layer</button>
            <button type="button" data-k="leave">Leave layer</button>
            <button type="button" data-k="reparent">Reparent to layer under cursor</button>
            <div class="dim">align</div>
            ${multi ? `
            <button type="button" data-k="al">Align left</button>
            <button type="button" data-k="ar">Align right</button>
            <button type="button" data-k="at">Align top</button>
            <button type="button" data-k="ab">Align bottom</button>
            <button type="button" data-k="dh">Distribute H</button>
            <button type="button" data-k="dv">Distribute V</button>
            <button type="button" data-k="same">Same size</button>` : `<button type="button" data-k="center">Align to parent</button>`}
            <div class="dim">select</div>
            <button type="button" data-k="same-type">Select same type</button>
            <button type="button" data-k="parent">Select parent</button>
            <button type="button" data-k="inv">Invert selection</button>
            <button type="button" data-k="revert">Revert to stock</button>`;
        ctx.classList.remove('if3-hide');
        ctx.style.left = Math.max(8, Math.min(x, innerWidth - (If3Studio.isMobile() ? 260 : 200))) + 'px';
        ctx.style.top = Math.max(8, Math.min(y, innerHeight - (If3Studio.isMobile() ? 360 : 280))) + 'px';
        ctx.onclick = e => {
            const k = (e.target as HTMLElement).dataset.k;
            ctx.classList.add('if3-hide');
            if (!k) {
                return;
            }
            if (k === 'dup') {
                If3Studio.duplicateSel();
            }
            if (k === 'copy') {
                If3Studio.copySel();
            }
            if (k === 'cut') {
                If3Studio.cutSel();
            }
            if (k === 'paste') {
                If3Studio.pasteSel();
            }
            if (k === 'pastehere') {
                If3Studio.pasteSel(true);
            }
            if (k === 'hide') {
                If3Studio.hideSel();
            }
            if (k === 'del') {
                If3Studio.deleteSel(false);
            }
            if (k === 'hard') {
                If3Studio.deleteSel(true);
            }
            if (k === 'enter' && n) {
                If3Studio.enterLayer(n.type === 0 ? If3Live.child : n.layerId >= 0 ? n.layerId & 0xffff : -1);
            }
            if (k === 'leave') {
                If3Studio.leaveLayer();
            }
            if (k === 'reparent') {
                const layer = If3Live.hitsUnder().find(h => h.com.type === 0 && If3Live.childId(h.com) !== If3Live.child);
                if (layer) {
                    If3Studio.pushHist();
                    const dest = If3Live.childId(layer.com);
                    If3Studio.setOnSelected(c => {
                        const a = If3Studio.absOf(c);
                        c.layerId = dest + (If3Studio.widget << 16);
                        If3Studio.setAbs(c, a.x, a.y);
                        If3Live.applyCom(c);
                    });
                    If3Studio.sync();
                    If3Studio.setStatus('reparented into com_' + dest);
                }
            }
            if (k === 'center') {
                If3Studio.align('hcenter');
                If3Studio.align('vcenter');
            }
            if (k === 'al') {
                If3Studio.align('left');
            }
            if (k === 'ar') {
                If3Studio.align('right');
            }
            if (k === 'at') {
                If3Studio.align('top');
            }
            if (k === 'ab') {
                If3Studio.align('bottom');
            }
            if (k === 'dh') {
                If3Studio.distribute('h');
            }
            if (k === 'dv') {
                If3Studio.distribute('v');
            }
            if (k === 'same') {
                If3Studio.sameSize();
            }
            if (k === 'same-type' && n) {
                const ids: number[] = [];
                const list = If3Studio.list();
                for (let i = 0; i < list.length; i++) {
                    if (list[i] && list[i]!.type === n.type) {
                        ids.push(i);
                    }
                }
                If3Live.selectIds(ids, list);
            }
            if (k === 'parent' && n && n.layerId >= 0) {
                const p = IfType.get(n.layerId);
                if (p) {
                    If3Live.selectOne(p);
                }
            }
            if (k === 'inv') {
                If3Studio.invertSel();
            }
            if (k === 'revert') {
                If3Studio.revertSel();
            }
        };
    }

    private static tickEdit(mx: number, my: number): void {
        const click = ClientMouseListener.mouseClickButton;
        const btn = ClientMouseListener.mouseButton;
        If3Live.pickHover();
        If3Studio.renderHits();
        if (click === 2) {
            ClientMouseListener.mouseClickButton = 0;
            If3Studio.onRightClick(If3Studio.ptr.x, If3Studio.ptr.y);
            return;
        }
        if (click === 1) {
            ClientMouseListener.mouseClickButton = 0;
            If3Studio.beginDrag(mx, my);
        }
        if (btn === 0) {
            if (If3Studio.drag) {
                If3Studio.endDrag(mx, my);
            }
            If3Studio.dragging = false;
            If3Live.marquee = null;
            If3Live.guides = [];
            clearTimeout(If3Studio.holdTimer);
        } else if (If3Studio.drag) {
            If3Studio.moveDrag(mx, my);
        }
    }

    private static beginDrag(mx: number, my: number): void {
        const ctrl = If3Studio.ptr.ctrl;
        const shift = If3Studio.ptr.shift;
        const alt = If3Studio.ptr.alt;
        if (If3Studio.placeType != null) {
            If3Studio.drag = { mode: 'place', gx: mx, gy: my, type: If3Studio.placeType };
            If3Studio.dragging = true;
            return;
        }
        const handle = If3Live.handleAt(mx, my, If3Studio.isMobile());
        if (handle && If3Live.com && If3Studio.editable(If3Live.com, If3Live.child)) {
            const a = If3Studio.absOf(If3Live.com);
            If3Studio.drag = {
                mode: 'resize',
                handle,
                id: If3Live.child,
                ox: If3Live.com.x,
                oy: If3Live.com.y,
                ow: If3Live.com.width,
                oh: If3Live.com.height,
                ax: a.x,
                ay: a.y,
                mx,
                my,
                hist: false
            };
            If3Studio.dragging = true;
            return;
        }
        let hover = alt ? If3Live.pickLayerHover() : If3Live.pickHover();
        if (!hover) {
            if (shift) {
                If3Studio.drag = { mode: 'marquee', gx: mx, gy: my, add: ctrl || shift };
                If3Studio.dragging = true;
                if (!ctrl) {
                    If3Live.clearSel();
                    If3Studio.sync();
                }
            } else {
                If3Live.clearSel();
                If3Studio.sync();
            }
            return;
        }
        const now = performance.now();
        const hid = If3Live.childId(hover);
        if (now - If3Studio.lastClickAt < 350 && If3Studio.lastClickId === hid && hover.type === 0) {
            If3Studio.enterLayer(hid);
            If3Studio.lastClickAt = 0;
            return;
        }
        If3Studio.lastClickAt = now;
        If3Studio.lastClickId = hid;
        if (ctrl) {
            If3Live.toggleSel(hover);
        } else if (!If3Live.isSelectedId(hid)) {
            If3Live.selectOne(hover);
        }
        const list = If3Studio.list();
        const ids = If3Live.selected.filter(id => If3Studio.editable(list[id], id));
        if (ids.length) {
            If3Studio.drag = {
                mode: 'move',
                ids,
                mx,
                my,
                hist: false,
                armed: !If3Studio.isMobile(),
                hx: If3Studio.ptr.x,
                hy: If3Studio.ptr.y,
                origin: ids.map(id => ({ id, x: list[id]!.x, y: list[id]!.y }))
            };
            If3Studio.dragging = true;
        }
    }

    private static moveDrag(mx: number, my: number): void {
        const drag = If3Studio.drag;
        if (!drag) {
            return;
        }
        if (drag.mode === 'marquee' || drag.mode === 'place') {
            const x = Math.min(drag.gx, mx);
            const y = Math.min(drag.gy, my);
            If3Live.marquee = { x, y, w: Math.abs(mx - drag.gx), h: Math.abs(my - drag.gy) };
            return;
        }
        if (drag.mode === 'move') {
            const dx0 = mx - drag.mx;
            const dy0 = my - drag.my;
            if (!drag.armed) {
                if (Math.hypot(dx0, dy0) < 6) {
                    return;
                }
                drag.armed = true;
                clearTimeout(If3Studio.holdTimer);
            }
            if (!drag.hist) {
                If3Studio.pushHist();
                drag.hist = true;
            }
            const list = If3Studio.list();
            const pri = list[drag.origin[0]?.id];
            let gx = mx - drag.mx;
            let gy = my - drag.my;
            if (pri) {
                const a0 = If3Studio.absOf(Object.assign(Object.create(Object.getPrototypeOf(pri)), pri, { x: drag.origin[0].x, y: drag.origin[0].y }));
                const snapped = If3Studio.ptr.alt ? { x: a0.x + gx, y: a0.y + gy, guides: [] } : If3Studio.snapToSiblings(pri, a0.x + gx, a0.y + gy);
                gx = snapped.x - a0.x;
                gy = snapped.y - a0.y;
                If3Live.guides = snapped.guides;
            }
            for (const o of drag.origin) {
                const n = list[o.id];
                if (!n) {
                    continue;
                }
                n.x = o.x + gx;
                n.y = o.y + gy;
                If3Live.applyCom(n);
            }
            return;
        }
        if (drag.mode === 'resize') {
            if (!drag.hist) {
                If3Studio.pushHist();
                drag.hist = true;
            }
            const n = If3Studio.list()[drag.id];
            if (!n) {
                return;
            }
            let ax = drag.ax;
            let ay = drag.ay;
            let w = drag.ow;
            let h = drag.oh;
            const dx = mx - drag.mx;
            const dy = my - drag.my;
            const hdl = drag.handle;
            if (hdl.includes('e')) {
                w = drag.ow + dx;
            }
            if (hdl.includes('s')) {
                h = drag.oh + dy;
            }
            if (hdl.includes('w')) {
                w = drag.ow - dx;
                ax = drag.ax + (drag.ow - w);
            }
            if (hdl.includes('n')) {
                h = drag.oh - dy;
                ay = drag.ay + (drag.oh - h);
            }
            n.width = Math.max(0, Math.round(w));
            n.height = Math.max(0, Math.round(h));
            If3Studio.setAbs(n, ax, ay);
            If3Live.applyCom(n);
        }
    }

    private static endDrag(mx: number, my: number): void {
        const drag = If3Studio.drag;
        If3Studio.drag = null;
        If3Live.marquee = null;
        If3Live.guides = [];
        if (!drag) {
            return;
        }
        if (drag.mode === 'place') {
            const x0 = Math.min(drag.gx, mx);
            const y0 = Math.min(drag.gy, my);
            const w = Math.abs(mx - drag.gx);
            const h = Math.abs(my - drag.gy);
            If3Studio.cancelPlace();
            if (w > 3 || h > 3) {
                If3Studio.add(drag.type, x0, y0, w, h);
            } else {
                If3Studio.add(drag.type, drag.gx, drag.gy);
            }
            If3Studio.invalidateFrame();
            requestAnimationFrame(() => If3Studio.fitGame());
            return;
        }
        if (drag.mode === 'marquee') {
            const x0 = Math.min(drag.gx, mx);
            const y0 = Math.min(drag.gy, my);
            const x1 = Math.max(drag.gx, mx);
            const y1 = Math.max(drag.gy, my);
            if (x1 - x0 > 2 || y1 - y0 > 2) {
                const ids: number[] = [];
                const list = If3Studio.list();
                for (let i = 0; i < list.length; i++) {
                    const n = list[i];
                    if (!n || !If3Studio.inFocus(n)) {
                        continue;
                    }
                    const a = If3Studio.absOf(n);
                    if (a.x + n.width >= x0 && a.x <= x1 && a.y + n.height >= y0 && a.y <= y1) {
                        ids.push(i);
                    }
                }
                If3Live.selectIds(drag.add ? [...new Set(If3Live.selected.concat(ids))] : ids, list);
            }
            return;
        }
        if (drag.mode === 'move' && If3Studio.ptr.ctrl) {
            const layer = If3Live.hitsUnder().find(h => h.com.type === 0 && !drag.ids.includes(If3Live.childId(h.com)));
            if (layer) {
                const dest = If3Live.childId(layer.com);
                If3Studio.setOnSelected(c => {
                    const a = If3Studio.absOf(c);
                    c.layerId = dest + (If3Studio.widget << 16);
                    If3Studio.setAbs(c, a.x, a.y);
                    If3Live.applyCom(c);
                });
                If3Studio.setStatus('reparented into com_' + dest);
            }
        }
        If3Studio.invalidateFrame();
        If3Studio.propsKey = '';
        If3Studio.sync();
        requestAnimationFrame(() => If3Studio.fitGame());
    }

    private static renderHits(): void {
        const el = document.getElementById('if3-hits');
        if (!el) {
            return;
        }
        const hits = If3Live.hitsUnder();
        const key = hits.map(h => If3Live.childId(h.com)).join(',');
        if (el.dataset.key === key) {
            return;
        }
        el.dataset.key = key;
        el.innerHTML = hits.map(h => {
            const id = If3Live.childId(h.com);
            return `<button type="button" class="chip ${If3Live.isSelectedId(id) ? 'on' : ''}" data-id="${id}">com_${id} ${TYPES[h.com.type] || h.com.type}</button>`;
        }).join('');
        el.querySelectorAll('.chip').forEach(b => {
            (b as HTMLButtonElement).onpointerdown = e => {
                e.preventDefault();
                e.stopPropagation();
                const id = Number((b as HTMLElement).dataset.id);
                const c = If3Studio.list()[id];
                if (c) {
                    If3Live.selectOne(c);
                }
            };
        });
    }

    private static layerOptions(c: IfType): string {
        const cur = c.layerId === -1 ? -1 : c.layerId & 0xffff;
        const opts = ['<option value="-1">(root)</option>'];
        If3Studio.list().forEach((x, i) => {
            if (x && x.type === 0 && i !== (c.parentId & 0xffff)) {
                opts.push(`<option value="${i}"${cur === i ? ' selected' : ''}>com_${i} LAYER ${x.width}x${x.height}</option>`);
            }
        });
        return opts.join('');
    }

    private static sliderRow(id: string, label: string, value: number | '', min: number, max: number, opt?: { note?: (v: number) => string }): string {
        const v = value === '' ? min : If3Studio.num(value, min);
        const lo = Math.min(min, v);
        const hi = Math.max(max, v);
        const note = opt?.note ? `<span class="slide-note">${opt.note(v)}</span>` : '';
        const shown = value === '' ? '' : String(v);
        return `<div class="slide" data-slide="${id}">
            <span class="slide-lab">${label}</span>
            <button type="button" class="nudge" data-slide="${id}" data-sign="-1" title="−1 · Shift −8 · Alt −32">−</button>
            <input type="range" data-slide="${id}" min="${lo}" max="${hi}" step="1" value="${v}">
            <button type="button" class="nudge" data-slide="${id}" data-sign="1" title="+1 · Shift +8 · Alt +32">+</button>
            <input type="text" class="slide-val" data-slide-val="${id}" value="${shown}" inputmode="numeric" spellcheck="false">
            ${note}
        </div>`;
    }

    private static seg(id: string, value: number, opts: Array<[number, string]>): string {
        return `<div class="seg" data-seg="${id}">${opts.map(([v, lab]) => `<button type="button" data-v="${v}" class="${Number(value) === v ? 'on' : ''}">${lab}</button>`).join('')}</div>`;
    }

    private static colourField(colour: number): string {
        const hex = If3Studio.colourHex(colour);
        return `<label class="f">colour <span class="colour-row"><input type="color" data-k="colourhex" value="${hex}"><input type="text" data-k="colourhex2" value="${hex}" spellcheck="false"></span></label>
            <div class="palette">${PALETTE.map(c => `<button type="button" data-col="${c}" style="background:${If3Studio.colourHex(c)}" title="${If3Studio.colourHex(c)}"></button>`).join('')}</div>`;
    }

    private static degNote(v: number): string {
        return Math.round((Number(v) || 0) * 360 / 2048) + '°';
    }

    private static pctNote(v: number): string {
        return Math.round(100 - (Number(v) || 0) * 100 / 255) + '%';
    }

    private static bindSlider(id: string, apply: (v: number) => void, opt?: { min?: number; max?: number; note?: (v: number) => string }): void {
        const box = If3Studio.fieldsEl;
        if (!box) {
            return;
        }
        const el = box.querySelector(`input[type=range][data-slide="${id}"]`) as HTMLInputElement | null;
        const val = box.querySelector(`[data-slide-val="${id}"]`) as HTMLInputElement | null;
        const row = el?.closest('.slide') as HTMLElement | null;
        if (!el) {
            return;
        }
        const set = (raw: string | number): void => {
            let v = If3Studio.num(raw, 0);
            if (opt?.min != null) {
                v = Math.max(opt.min, v);
            }
            if (opt?.max != null) {
                v = Math.min(opt.max, v);
            }
            if (v < Number(el.min)) {
                el.min = String(v);
            }
            if (v > Number(el.max)) {
                el.max = String(v);
            }
            el.value = String(v);
            if (val) {
                val.value = String(v);
            }
            const note = row?.querySelector('.slide-note');
            if (note && opt?.note) {
                note.textContent = opt.note(v);
            }
            apply(v);
        };
        const start = (): void => {
            if (!If3Studio.slideHist) {
                If3Studio.pushHist();
                If3Studio.slideHist = true;
            }
        };
        el.addEventListener('pointerdown', start);
        el.oninput = () => {
            start();
            set(el.value);
        };
        if (val) {
            val.addEventListener('keydown', ev => ev.stopPropagation());
            val.oninput = () => {
                if (val.value === '' || val.value === '-' || val.value === '+') {
                    return;
                }
                start();
                set(val.value);
            };
            val.onchange = () => {
                If3Studio.slideHist = false;
                if (val.value !== '') {
                    set(val.value);
                }
            };
        }
        el.addEventListener('change', () => {
            If3Studio.slideHist = false;
        });
        row?.querySelectorAll('.nudge').forEach(btn => {
            (btn as HTMLButtonElement).onclick = e => {
                If3Studio.pushHist();
                const mag = e.altKey ? 32 : e.shiftKey ? 8 : 1;
                set(If3Studio.num(el.value, 0) + mag * Number((btn as HTMLElement).dataset.sign || 1));
            };
        });
    }

    private static parentBox(c: IfType): { w: number; h: number } {
        const p = c.layerId >= 0 ? IfType.get(c.layerId) : null;
        if (p) {
            return { w: Math.max(8, p.width), h: Math.max(8, p.height) };
        }
        return { w: 512, h: 334 };
    }

    private static multiPropsHtml(): string {
        const list = If3Studio.list();
        const nodes = If3Live.selected.map(id => list[id]).filter(Boolean) as IfType[];
        const mixed = (get: (c: IfType) => number): number | '' => {
            const v = get(nodes[0]);
            return nodes.every(c => get(c) === v) ? v : '';
        };
        const box = If3Studio.parentBox(nodes[0]);
        const mx = mixed(c => c.x);
        const my = mixed(c => c.y);
        const mw = mixed(c => c.width);
        const mh = mixed(c => c.height);
        return `<div class="multi">${If3Live.selected.length} selected</div>
            <label class="chk"><input type="checkbox" data-k="hide"> Hide all</label>
            ${If3Studio.sliderRow('m-x', 'x', mx, -box.w, box.w * 2)}
            ${If3Studio.sliderRow('m-y', 'y', my, -box.h, box.h * 2)}
            ${If3Studio.sliderRow('m-w', 'w', mw === '' ? 32 : mw, 0, Math.max(box.w, 512))}
            ${If3Studio.sliderRow('m-h', 'h', mh === '' ? 32 : mh, 0, Math.max(box.h, 334))}
            <div class="hint">Sliders set every selected IF3 live. Shift −/+ = 8, Alt = 32.</div>`;
    }

    private static bindMultiProps(): void {
        const box = If3Studio.fieldsEl;
        if (!box) {
            return;
        }
        const list = If3Studio.list();
        const nodes = If3Live.selected.map(id => list[id]).filter(Boolean) as IfType[];
        const hide = box.querySelector('[data-k="hide"]') as HTMLInputElement | null;
        if (hide) {
            hide.checked = nodes.every(c => c.hide);
            hide.onchange = () => {
                If3Studio.pushHist();
                for (const c of nodes) {
                    if (c.v3) {
                        c.hide = hide.checked;
                        If3Live.applyCom(c);
                    }
                }
                If3Studio.renderTree();
            };
        }
        const liveSet = (id: string, dest: 'x' | 'y' | 'width' | 'height'): void => {
            If3Studio.bindSlider(id, v => {
                for (const c of nodes) {
                    if (If3Studio.editable(c, c.parentId & 0xffff)) {
                        c[dest] = v;
                        If3Live.applyCom(c);
                    }
                }
                If3Studio.renderTree();
            });
        };
        liveSet('m-x', 'x');
        liveSet('m-y', 'y');
        liveSet('m-w', 'width');
        liveSet('m-h', 'height');
    }

    private static singlePropsHtml(c: IfType): string {
        const t = c.type;
        const if1 = !c.v3;
        const empty = false;
        const beyond = If3Studio.stockCount && If3Live.child >= If3Studio.stockCount;
        const box = If3Studio.parentBox(c);
        let html = `<div><b>com_${If3Live.child}</b> · ${if1 ? 'if1' : 'if3'} · ${TYPES[t] || t}${If3Live.locked.has(If3Live.child) ? ' · locked' : ''}</div>`;
        if (if1) {
            html += `<div class="hint warn">IF1 stock blob. Geometry is preview-only and will not pack.</div>`;
        }
        if (beyond) {
            html += `<div class="hint warn">Id ${If3Live.child} is past stock child count ${If3Studio.stockCount}. Saved in the .if3, skipped by the packer.</div>`;
        }
        html += `<label class="chk"><input type="checkbox" data-k="hide" ${c.hide ? 'checked' : ''}> Hidden</label>`;
        html += `<label class="chk"><input type="checkbox" data-k="lock" ${If3Live.locked.has(If3Live.child) ? 'checked' : ''}> Lock (editor)</label>`;
        html += `<div class="sec">Geometry</div><div class="sec-body">`;
        html += If3Studio.sliderRow('p-x', 'x', c.x, -box.w, Math.max(box.w, c.x));
        html += If3Studio.sliderRow('p-y', 'y', c.y, -box.h, Math.max(box.h, c.y));
        html += If3Studio.sliderRow('p-w', 'w', c.width, 0, Math.max(box.w, c.width, 64));
        html += If3Studio.sliderRow('p-h', 'h', c.height, 0, Math.max(box.h, c.height, 64));
        html += `<label class="f">layer <select data-k="layer">${If3Studio.layerOptions(c)}</select></label>`;
        if (t === 0 && c.v3) {
            html += `<div class="actions"><button type="button" data-act="enter">Edit inside this layer</button></div>`;
        }
        html += `<label class="f">clientcode <input type="text" inputmode="numeric" data-k="clientcode" value="${c.clientCode}"></label>`;
        html += `</div>`;
        if (t === 0) {
            html += `<div class="sec">Layer</div><div class="sec-body">`;
            html += If3Studio.sliderRow('p-scrollwidth', 'scroll w', c.scrollWidth, 0, Math.max(c.width * 4, 512, c.scrollWidth));
            html += If3Studio.sliderRow('p-scrollheight', 'scroll h', c.scrollHeight, 0, Math.max(c.height * 4, 512, c.scrollHeight));
            html += `</div>`;
        }
        if (t === 5) {
            const g = c.graphic;
            html += `<div class="sec">Graphic</div><div class="sec-body">`;
            html += `<div class="pick-row"><img class="thumb" src="${If3Studio.editorUrl}/api/sprite/${g < 0 ? 0 : g}.png" alt="">
                <button type="button" data-pick="spr">Sprite ${g < 0 ? '(none)' : g}…</button>
                <button type="button" data-pick="spr-none">None</button></div>`;
            html += If3Studio.sliderRow('p-rotate', 'rotate', c.rotate, 0, 2047, { note: If3Studio.degNote });
            html += If3Studio.sliderRow('p-trans', 'trans', c.trans, 0, 255, { note: If3Studio.pctNote });
            html += `<label class="chk"><input type="checkbox" data-k="tiling" ${c.tiling ? 'checked' : ''}> tile</label>`;
            html += `<label class="chk"><input type="checkbox" data-k="vflip" ${c.vFlip ? 'checked' : ''}> vflip</label>`;
            html += `<label class="chk"><input type="checkbox" data-k="hflip" ${c.hFlip ? 'checked' : ''}> hflip</label>`;
            html += If3Studio.colourField(c.colour);
            html += `</div>`;
        }
        if (t === 4) {
            html += `<div class="sec">Text</div><div class="sec-body">`;
            html += `<label class="f">text <textarea data-k="text" rows="3">${If3Studio.esc(c.text || '')}</textarea></label>`;
            const fonts = FONTS.some(([id]) => id === c.font) ? FONTS : ([[c.font, 'current'], ...FONTS] as Array<[number, string]>);
            html += `<label class="f">font <select data-k="font">${fonts.map(([id, name]) => `<option value="${id}" ${c.font === id ? 'selected' : ''}>${id} ${name}</option>`).join('')}</select></label>`;
            html += If3Studio.sliderRow('p-lineheight', 'lineh', c.lineHeight, 0, 40);
            html += `<label class="f">halign ${If3Studio.seg('p-halign', c.hAlign, [[0, 'Left'], [1, 'Centre'], [2, 'Right']])}</label>`;
            html += `<label class="f">valign ${If3Studio.seg('p-valign', c.vAlign, [[0, 'Top'], [1, 'Middle'], [2, 'Bottom']])}</label>`;
            html += `<label class="chk"><input type="checkbox" data-k="shadow" ${c.shadow ? 'checked' : ''}> shadow</label>`;
            html += If3Studio.colourField(c.colour);
            html += `</div>`;
        }
        if (t === 3) {
            html += `<div class="sec">RECT</div><div class="sec-body">`;
            html += If3Studio.colourField(c.colour);
            html += `<label class="chk"><input type="checkbox" data-k="fill" ${c.fill ? 'checked' : ''}> fill</label>`;
            html += If3Studio.sliderRow('p-trans', 'trans', c.trans, 0, 255, { note: If3Studio.pctNote });
            html += `</div>`;
        }
        if (t === 6) {
            const mid = c.model1Id;
            const anim = c.modelAnim;
            html += `<div class="sec">Model</div><div class="sec-body">`;
            html += `<div class="pick-row">
                <button type="button" data-pick="model">Model ${mid < 0 ? '(none)' : mid}…</button>
                <button type="button" data-pick="npc">NPC…</button>
                <button type="button" data-pick="obj">OBJ…</button>
                <button type="button" data-pick="seq">Seq ${anim < 0 ? '(none)' : anim}…</button>
                <button type="button" data-pick="clear">Clear (none)</button></div>`;
            html += `<div class="orbit" id="if3-orbit" title="drag to orbit — yaw / pitch"><div class="orbit-cross"></div><div class="orbit-knob" id="if3-orbit-knob"></div></div>`;
            html += If3Studio.sliderRow('p-modelxof', 'xof', c.modelXOf, -200, 200);
            html += If3Studio.sliderRow('p-modelyof', 'yof', c.modelYOf, -200, 200);
            html += If3Studio.sliderRow('p-modelxan', 'pitch', c.modelXAn, 0, 2047, { note: If3Studio.degNote });
            html += If3Studio.sliderRow('p-modelyan', 'yaw', c.modelYAn, 0, 2047, { note: If3Studio.degNote });
            html += If3Studio.sliderRow('p-modelzan', 'roll', c.modelZAn, 0, 2047, { note: If3Studio.degNote });
            html += If3Studio.sliderRow('p-modelzoom', 'zoom', c.modelZoom || 100, 1, 4000);
            html += `<label class="chk"><input type="checkbox" data-k="orthog" ${c.orthog ? 'checked' : ''}> orthog</label>`;
            html += `<div class="hint">model=-1 is filled at runtime (if_setnpchead / if_setobject). NPC/OBJ here is live preview; Clear writes model=-1. clientcode 1412 spin/fit is draw-time only.</div>`;
            html += `</div>`;
        }
        if (!if1 && !empty) {
            html += `<div class="sec" data-tog="interact">Interact</div><div class="sec-body if3-hide" data-body="interact">`;
            html += `<div class="bits" data-bits="event">${EVENT_OPS.map(b => `<button type="button" data-bit="${b.bit}" class="${(c.eventCode >>> 0) & (1 << b.bit) ? 'on' : ''}">${b.lab}</button>`).join('')}</div>`;
            html += If3Studio.sliderRow('p-targetmask', 'target', (c.eventCode >> 11) & 63, 0, 63);
            html += If3Studio.sliderRow('p-dragdepth', 'drag d', (c.eventCode >> 17) & 7, 0, 7);
            html += `<label class="f">baseop <input type="text" data-k="baseop" value="${If3Studio.esc(c.baseOpName || '')}"></label>`;
            for (let i = 0; i < 5; i++) {
                html += `<label class="f">op${i + 1} <input type="text" data-k="op${i}" value="${If3Studio.esc((c.opNames && c.opNames[i]) || '')}"></label>`;
            }
            html += `</div>`;
        }
        html += If3Studio.scriptHint(c);
        return html;
    }

    private static bindSingleProps(c: IfType): void {
        const box = If3Studio.fieldsEl;
        if (!box) {
            return;
        }
        const commit = (fn: () => void, hist = true): void => {
            if (hist) {
                If3Studio.pushHist();
            }
            fn();
            If3Live.apply();
            If3Studio.renderTree();
        };
        box.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('keydown', ev => ev.stopPropagation()));
        const hide = box.querySelector('[data-k="hide"]') as HTMLInputElement | null;
        if (hide) {
            hide.onchange = () => commit(() => {
                c.hide = hide.checked;
            });
        }
        const lock = box.querySelector('[data-k="lock"]') as HTMLInputElement | null;
        if (lock) {
            lock.onchange = () => {
                if (lock.checked) {
                    If3Live.locked.add(If3Live.child);
                } else {
                    If3Live.locked.delete(If3Live.child);
                }
                If3Studio.renderTree();
            };
        }
        If3Studio.bindSlider('p-x', v => {
            c.x = v;
            If3Live.apply();
        });
        If3Studio.bindSlider('p-y', v => {
            c.y = v;
            If3Live.apply();
        });
        If3Studio.bindSlider('p-w', v => {
            c.width = v;
            If3Live.apply();
        }, { min: 0 });
        If3Studio.bindSlider('p-h', v => {
            c.height = v;
            If3Live.apply();
        }, { min: 0 });
        If3Studio.bindSlider('p-scrollwidth', v => {
            c.scrollWidth = v;
            If3Live.apply();
        }, { min: 0 });
        If3Studio.bindSlider('p-scrollheight', v => {
            c.scrollHeight = v;
            If3Live.apply();
        }, { min: 0 });
        If3Studio.bindSlider('p-rotate', v => {
            c.rotate = v;
            If3Live.apply();
        }, { note: If3Studio.degNote });
        If3Studio.bindSlider('p-trans', v => {
            c.trans = v;
            If3Live.apply();
        }, { note: If3Studio.pctNote });
        If3Studio.bindSlider('p-lineheight', v => {
            c.lineHeight = v;
            If3Live.apply();
        });
        If3Studio.bindSlider('p-modelxof', v => {
            c.modelXOf = v;
            If3Live.apply();
        });
        If3Studio.bindSlider('p-modelyof', v => {
            c.modelYOf = v;
            If3Live.apply();
        });
        If3Studio.bindSlider('p-modelxan', v => {
            c.modelXAn = v;
            If3Live.apply();
            If3Studio.placeOrbitKnob(c);
        }, { note: If3Studio.degNote });
        If3Studio.bindSlider('p-modelyan', v => {
            c.modelYAn = v;
            If3Live.apply();
            If3Studio.placeOrbitKnob(c);
        }, { note: If3Studio.degNote });
        If3Studio.bindSlider('p-modelzan', v => {
            c.modelZAn = v;
            If3Live.apply();
        }, { note: If3Studio.degNote });
        If3Studio.bindSlider('p-modelzoom', v => {
            c.modelZoom = v;
            If3Live.apply();
        }, { min: 1, max: 4000 });
        If3Studio.bindSlider('p-targetmask', v => {
            c.eventCode = (c.eventCode & ~(63 << 11)) | ((v & 63) << 11);
            If3Live.apply();
        });
        If3Studio.bindSlider('p-dragdepth', v => {
            c.eventCode = (c.eventCode & ~(7 << 17)) | ((v & 7) << 17);
            If3Live.apply();
        });
        const layer = box.querySelector('[data-k="layer"]') as HTMLSelectElement | null;
        if (layer) {
            layer.onchange = () => commit(() => {
                const v = If3Studio.num(layer.value, -1);
                c.layerId = v < 0 ? -1 : v + (If3Studio.widget << 16);
                If3Studio.invalidateFrame();
                requestAnimationFrame(() => If3Studio.fitGame());
            });
        }
        const clientcode = box.querySelector('[data-k="clientcode"]') as HTMLInputElement | null;
        if (clientcode) {
            clientcode.onchange = () => commit(() => {
                c.clientCode = If3Studio.num(clientcode.value, 0);
            });
        }
        const text = box.querySelector('[data-k="text"]') as HTMLTextAreaElement | null;
        if (text) {
            text.oninput = () => {
                if (!If3Studio.slideHist) {
                    If3Studio.pushHist();
                    If3Studio.slideHist = true;
                }
                c.text = text.value;
                If3Live.apply();
                If3Studio.renderTree();
            };
            text.onchange = () => {
                If3Studio.slideHist = false;
            };
        }
        const font = box.querySelector('[data-k="font"]') as HTMLSelectElement | null;
        if (font) {
            font.onchange = () => commit(() => {
                c.font = If3Studio.num(font.value, 497);
            });
        }
        box.querySelectorAll('[data-k="tiling"],[data-k="vflip"],[data-k="hflip"],[data-k="shadow"],[data-k="fill"],[data-k="orthog"]').forEach(el => {
            const inp = el as HTMLInputElement;
            inp.onchange = () => commit(() => {
                const k = inp.dataset.k;
                if (k === 'tiling') {
                    c.tiling = inp.checked;
                }
                if (k === 'vflip') {
                    c.vFlip = inp.checked;
                }
                if (k === 'hflip') {
                    c.hFlip = inp.checked;
                }
                if (k === 'shadow') {
                    c.shadow = inp.checked;
                }
                if (k === 'fill') {
                    c.fill = inp.checked;
                }
                if (k === 'orthog') {
                    c.orthog = inp.checked;
                }
            });
        });
        const hx = box.querySelector('[data-k="colourhex"]') as HTMLInputElement | null;
        const hx2 = box.querySelector('[data-k="colourhex2"]') as HTMLInputElement | null;
        const setCol = (v: number): void => {
            c.colour = v;
            if (hx) {
                hx.value = If3Studio.colourHex(v);
            }
            if (hx2) {
                hx2.value = If3Studio.colourHex(v);
            }
            If3Live.apply();
        };
        if (hx) {
            hx.oninput = () => {
                if (!If3Studio.slideHist) {
                    If3Studio.pushHist();
                    If3Studio.slideHist = true;
                }
                setCol(If3Studio.hexToColour(hx.value));
            };
            hx.onchange = () => {
                If3Studio.slideHist = false;
            };
        }
        if (hx2) {
            hx2.onchange = () => commit(() => setCol(If3Studio.hexToColour(hx2.value)), true);
        }
        box.querySelectorAll('[data-col]').forEach(b => {
            (b as HTMLButtonElement).onclick = () => commit(() => setCol(Number((b as HTMLElement).dataset.col)));
        });
        box.querySelectorAll('[data-seg] button').forEach(b => {
            (b as HTMLButtonElement).onclick = () => {
                const seg = (b as HTMLElement).parentElement?.getAttribute('data-seg');
                const v = Number((b as HTMLElement).dataset.v);
                commit(() => {
                    if (seg === 'p-halign') {
                        c.hAlign = v;
                    }
                    if (seg === 'p-valign') {
                        c.vAlign = v;
                    }
                });
                If3Studio.propsKey = '';
                If3Studio.fillProps();
            };
        });
        box.querySelectorAll('[data-bits] button').forEach(b => {
            (b as HTMLButtonElement).onclick = () => {
                const bit = Number((b as HTMLElement).dataset.bit);
                commit(() => {
                    c.eventCode ^= 1 << bit;
                });
                If3Studio.propsKey = '';
                If3Studio.fillProps();
            };
        });
        const baseop = box.querySelector('[data-k="baseop"]') as HTMLInputElement | null;
        if (baseop) {
            baseop.onchange = () => commit(() => {
                c.baseOpName = baseop.value;
            });
        }
        for (let i = 0; i < 5; i++) {
            const op = box.querySelector(`[data-k="op${i}"]`) as HTMLInputElement | null;
            if (op) {
                const idx = i;
                op.onchange = () => commit(() => c.setOpName(op.value, idx));
            }
        }
        box.querySelector('[data-tog="interact"]')?.addEventListener('click', () => {
            box.querySelector('[data-body="interact"]')?.classList.toggle('if3-hide');
        });
        (box.querySelector('[data-act="enter"]') as HTMLButtonElement | null)?.addEventListener('click', () => If3Studio.enterLayer(If3Live.child));
        box.querySelectorAll('button[data-pick]').forEach(btn => {
            const kind = (btn as HTMLElement).dataset.pick;
            (btn as HTMLButtonElement).onclick = () => {
                if (kind === 'spr') {
                    If3Studio.openSpritePicker();
                } else if (kind === 'spr-none') {
                    If3Studio.pushHist();
                    c.graphic = -1;
                    If3Live.apply();
                    If3Studio.propsKey = '';
                    If3Studio.fillProps();
                } else if (kind === 'npc' || kind === 'obj') {
                    If3Studio.openEntityPicker(kind);
                } else if (kind === 'seq') {
                    If3Studio.openNamedPicker('seq');
                } else if (kind === 'model') {
                    If3Studio.openNamedPicker('model');
                } else if (kind === 'clear') {
                    If3Studio.clearModel();
                }
            };
        });
        If3Studio.bindOrbit(c);
    }

    private static placeOrbitKnob(c: IfType): void {
        const knob = document.getElementById('if3-orbit-knob');
        if (!knob) {
            return;
        }
        knob.style.left = (((c.modelYAn || 0) / 2047) * 100) + '%';
        knob.style.top = (((c.modelXAn || 0) / 2047) * 100) + '%';
    }

    private static bindOrbit(c: IfType): void {
        const pad = document.getElementById('if3-orbit');
        if (!pad) {
            return;
        }
        If3Studio.placeOrbitKnob(c);
        const at = (ev: PointerEvent): void => {
            const r = pad.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
            const y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
            c.modelYAn = Math.round(x * 2047);
            c.modelXAn = Math.round(y * 2047);
            If3Studio.placeOrbitKnob(c);
            If3Live.apply();
        };
        pad.onpointerdown = ev => {
            ev.preventDefault();
            If3Studio.pushHist();
            try {
                pad.setPointerCapture(ev.pointerId);
            } catch {
                /* */
            }
            at(ev);
        };
        pad.onpointermove = ev => {
            if (ev.buttons) {
                at(ev);
            }
        };
    }

    private static chromeCss(): string {
        return `
            body.if3-studio { margin:0; padding:0; overflow:hidden; height:100vh; display:flex; flex-direction:column;
                background:#1e1a16; color:#e6dcc6; font:12px/1.4 Arial,Helvetica,sans-serif; }
            body.if3-studio:not(.if3-studio-ready) #if3-app { display:none; }
            body.if3-studio-ready > center { display:none !important; }
            #if3-app { display:flex; flex-direction:column; height:100vh; min-height:0; }
            #if3-top { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 10px;
                background:linear-gradient(#2a2521,#1e1a16); border-bottom:1px solid #3b332a; }
            #if3-top b { color:#f0d9a0; letter-spacing:.12em; margin-right:6px; }
            #if3-top input, #if3-top select, #if3-top button, #if3-dock button, #if3-more-menu button, #if3-ctx button,
            #if3-fields button, #if3-fields select, #if3-fields input, #if3-fields textarea, #if3-crumb button, #if3-hits button {
                -webkit-appearance:none; appearance:none; font:12px Arial,Helvetica,sans-serif; color:#e6dcc6;
                background:#241f1a; border:1px solid #3d352c; border-radius:4px; padding:4px 8px; }
            #if3-fields input[type=number]::-webkit-inner-spin-button, #if3-fields input[type=number]::-webkit-outer-spin-button { display:none; }
            #if3-top button.primary { background:#3a5f8a; border-color:#2a4566; color:#f2f6fb; }
            #if3-top button.on, .seg button.on { background:#3a5f8a; border-color:#4a74a4; color:#fff; }
            #if3-top .sep, #if3-crumb .sep { width:1px; height:16px; background:#3d352c; }
            #if3-status { margin-left:auto; color:#8a7d68; max-width:28%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            #if3-main { display:flex; flex:1; min-height:0; }
            #if3-tree, #if3-props { background:#2a2521; overflow:auto; display:flex; flex-direction:column; }
            #if3-tree { width:250px; }
            #if3-props { width:340px; }
            #if3-stage { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#17130f; min-width:0; position:relative; }
            #if3-tree h2, #if3-props h2 { margin:0; padding:8px 10px; background:#241f1a; font-size:11px; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid #3b332a; color:#f0d9a0; }
            #if3-rows { flex:1; overflow:auto; }
            .if3-row { display:flex; gap:6px; padding:3px 8px; cursor:pointer; white-space:nowrap; align-items:center; border-left:2px solid transparent; }
            .if3-row:hover { background:#332c25; }
            .if3-row.on { background:#264f78; border-left-color:#f0d9a0; }
            .if3-row.on2 { background:#203e5c; }
            .if3-row.hid { opacity:.42; }
            .if3-row.lock .lab { text-decoration:line-through; }
            .if3-row.focus-root { background:#1a3048; }
            .if3-row .typ { min-width:54px; font-size:9px; font-weight:700; letter-spacing:.04em; text-align:center; padding:1px 5px; border-radius:3px; background:#0005; color:#7eb6ea; }
            .if3-row .lab { flex:1; overflow:hidden; text-overflow:ellipsis; }
            .if3-row .id { margin-left:auto; color:#8a7d68; font:11px ui-monospace,Consolas,monospace; }
            .badge { font-size:9px; padding:0 4px; border-radius:3px; margin-left:4px; }
            .badge.if1 { background:#5a3a18; color:#e0a05a; }
            #if3-fields { padding:8px 10px 16px; display:flex; flex-direction:column; gap:4px; }
            #if3-fields .f { display:flex; justify-content:space-between; gap:8px; align-items:center; }
            #if3-fields .chk { display:flex; gap:8px; align-items:center; }
            #if3-fields textarea { width:100%; min-height:56px; background:#1a1510; color:#e6dcc6; border:1px solid #3d352c; padding:6px; }
            #if3-fields input[type=text], #if3-fields select { background:#1a1510; color:#e6dcc6; border:1px solid #3d352c; padding:4px 6px; }
            .sec { color:#f0d9a0; font-size:11px; letter-spacing:.08em; text-transform:uppercase; margin:10px 0 4px; padding-top:8px; border-top:1px solid #3b332a; cursor:pointer; }
            .sec-body { display:flex; flex-direction:column; gap:2px; }
            .hint { color:#8a7d68; font-size:11px; margin:6px 0; }
            .hint.warn { color:#e07070; }
            .script-hint { color:#d4b45a; margin:4px 0 8px; }
            .multi { color:#f0d9a0; font-weight:700; margin-bottom:8px; }
            .slide { display:grid; grid-template-columns:48px 22px minmax(0,1fr) 22px 52px auto; gap:4px; align-items:center; margin:5px 0; }
            .slide input[type=range] { padding:0; background:transparent; border:0; height:18px; accent-color:#d8bf82; }
            .slide .nudge { padding:2px 0; min-width:22px; line-height:1; }
            .slide-lab { color:#f0d9a0; font-size:11px; }
            .slide-val { width:52px; text-align:right; font:11px ui-monospace,Consolas,monospace; padding:3px 4px; }
            .slide-note { color:#8a7d68; font-size:10px; min-width:28px; }
            .seg { display:flex; gap:0; }
            .seg button { border-radius:0; padding:4px 8px; }
            .seg button:first-child { border-radius:4px 0 0 4px; }
            .seg button:last-child { border-radius:0 4px 4px 0; }
            .seg .k { color:#8a7d68; font-size:10px; margin-left:4px; }
            .bits { display:flex; flex-wrap:wrap; gap:4px; margin:6px 0; }
            .bits button.on { background:#264f78; border-color:#4a74a4; }
            .colour-row, .pick-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
            .colour-row input[type=color] { width:32px; height:24px; padding:0; border:1px solid #3d352c; }
            .palette { display:flex; flex-wrap:wrap; gap:4px; margin:6px 0 10px; }
            .palette button { width:16px; height:16px; padding:0; border:1px solid #111; border-radius:3px; }
            .thumb { width:32px; height:32px; image-rendering:pixelated; background:#1a1510; border:1px solid #3d352c; object-fit:contain; }
            .orbit { width:132px; height:132px; background:radial-gradient(circle at 50% 45%, #3a3428 0%, #1a1612 70%);
                border:1px solid #444; border-radius:50%; position:relative; cursor:grab; margin:8px auto; box-shadow:inset 0 8px 16px #0008; }
            .orbit:active { cursor:grabbing; }
            .orbit-cross { position:absolute; inset:0; pointer-events:none;
                background:linear-gradient(#0000 49.5%, #ffffff22 49.5%, #ffffff22 50.5%, #0000 50.5%),
                           linear-gradient(90deg, #0000 49.5%, #ffffff22 49.5%, #ffffff22 50.5%, #0000 50.5%); }
            .orbit-knob { position:absolute; width:12px; height:12px; margin:-6px 0 0 -6px; background:#f0d9a0; border-radius:50%; box-shadow:0 0 0 1px #000,0 2px 6px #000a; pointer-events:none; }
            .actions { display:flex; gap:4px; flex-wrap:wrap; margin-top:8px; }
            #if3-frame-tag { position:absolute; left:8px; bottom:36px; z-index:5; cursor:pointer;
                background:#000a; color:#cbbfa6; border:1px solid #3d352c; border-radius:8px; padding:4px 8px; font:11px Arial,sans-serif; letter-spacing:.04em; }
            #if3-frame-tag.locked { color:#f0d9a0; border-color:#6a5a30; }
            body.if3-embed #if3-frame-tag, body.if3-embed #if3-hits, body.if3-embed #if3-crumb, body.if3-embed #if3-place { display:none !important; }
            body.if3-studio #glcanvas { display:none !important; }
            #if3-modal { display:none; position:fixed; inset:0; z-index:50; background:#0008; align-items:flex-start; justify-content:center; padding:40px 12px; }
            #if3-modal.on { display:flex; }
            #if3-modal .sheet { width:min(420px,100%); max-height:80vh; overflow:auto; background:#2a2521; border:1px solid #3b332a; padding:10px; }
            #if3-modal header { display:flex; justify-content:space-between; margin-bottom:8px; }
            #if3-modal-hits button { display:block; width:100%; text-align:left; background:transparent; border:0; color:#e6dcc6; padding:4px 6px; cursor:pointer; }
            #if3-modal-hits button:hover { background:#264f78; }
            #if3-modal-hits img { width:20px; height:20px; image-rendering:pixelated; vertical-align:middle; margin-right:6px; }
            body.if3-studio #game { display:inline-block; line-height:0; }
            body.if3-embed { height:100vh !important; }
            body.if3-embed #if3-top, body.if3-embed #if3-tree, body.if3-embed #if3-props { display:none !important; }
            body.if3-embed #if3-app, body.if3-embed #if3-main, body.if3-embed #if3-stage { width:100%; height:100%; min-height:100vh; }
            body.if3-embed #if3-stage { background:#202020; display:flex; align-items:center; justify-content:center; }
            body.if3-embed #game { display:inline-block !important; }
            body.if3-embed > center { display:block !important; }
            body.if3-embed-ready > center { display:none !important; }
            .if3-hide { display:none !important; }
            .if3-more-wrap { position:relative; }
            #if3-more-menu { display:none; position:absolute; z-index:80; right:0; top:calc(100% + 4px);
                background:#2a2521; border:1px solid #3b332a; min-width:220px; max-height:70vh; overflow:auto; padding:8px; box-shadow:0 12px 32px #000c; }
            #if3-more-menu.open { display:block; }
            #if3-dock, #if3-drawer-back { display:none; }
            #if3-hits { display:flex; flex-wrap:wrap; gap:4px; padding:4px 8px; background:#241f1a; border-top:1px solid #3b332a; min-height:28px; }
            #if3-hits .chip { font-size:11px; }
            #if3-hits .chip.on { background:#3a5f8a; }
            #if3-crumb { display:flex; align-items:center; gap:4px; padding:4px 8px; width:100%; background:#241f1a; border-bottom:1px solid #3b332a; flex-shrink:0; }
            #if3-place { width:100%; background:#3a2a10; color:#f0d080; padding:6px 12px; font-weight:600; flex-shrink:0; }
            #if3-ctx { position:fixed; z-index:5000; min-width:200px; background:#2a2521; border:1px solid #3b332a; box-shadow:0 12px 32px #000c; padding:6px 0; }
            #if3-ctx button { display:block; width:100%; text-align:left; border:0; background:transparent; border-radius:0; padding:6px 12px; }
            #if3-ctx button:hover { background:#264f78; }
            #if3-ctx .dim { color:#8a7d68; font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:8px 12px 4px; }
            #if3-help { position:fixed; inset:0; z-index:60; background:#000a; display:flex; align-items:center; justify-content:center; }
            #if3-help .sheet { background:#2a2521; border:1px solid #3b332a; max-width:720px; max-height:86vh; overflow:auto; padding:0; }
            #if3-help header { display:flex; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #3b332a; }
            .help-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:12px 16px; }
            .help-grid h3 { color:#f0d9a0; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
            .help-grid p { margin:4px 0; color:#cbbfa6; }
            kbd { background:#1a1510; border:1px solid #3d352c; border-bottom-width:2px; padding:0 5px; border-radius:3px; font:11px ui-monospace,Consolas,monospace; }
            body.if3-studio:not(.if3-mobile) #if3-more-btn, body.if3-studio:not(.if3-mobile) #if3-adv-btn { display:none; }
            body.if3-studio:not(.if3-mobile) #if3-extras, body.if3-studio:not(.if3-mobile) .if3-add-grid,
            body.if3-studio:not(.if3-mobile) .if3-toggles, body.if3-studio:not(.if3-mobile) .if3-adv { display:contents; }
            body.if3-studio.if3-mobile { height:100dvh; padding:0; }
            body.if3-mobile #if3-app { height:100%; }
            body.if3-mobile #if3-top { flex-wrap:nowrap; gap:6px; padding:6px 8px 6px max(8px, env(safe-area-inset-left));
                padding-right:max(8px, env(safe-area-inset-right)); padding-top:max(6px, env(safe-area-inset-top)); }
            body.if3-mobile #if3-top b { display:none; }
            body.if3-mobile #if3-search, body.if3-mobile #if3-status, body.if3-mobile button[data-act="open"] { display:none !important; }
            body.if3-mobile #if3-top select, body.if3-mobile #if3-top button { font-size:15px; min-height:40px; padding:6px 10px; }
            body.if3-mobile #if3-file { min-width:0; flex:1; max-width:none; }
            body.if3-mobile #if3-tree, body.if3-mobile #if3-props {
                position:fixed; top:0; bottom:calc(52px + env(safe-area-inset-bottom)); z-index:40; width:min(250px, 42vw);
                box-shadow:0 0 40px #000c; padding-top:env(safe-area-inset-top); }
            body.if3-mobile #if3-tree { left:0; transform:translateX(-105%); }
            body.if3-mobile #if3-props { right:0; left:auto; width:min(340px, 52vw); transform:translateX(105%); }
            body.if3-mobile.panel-tree #if3-tree, body.if3-mobile.panel-props #if3-props { transform:none; }
            body.if3-mobile #if3-stage { overflow:hidden; display:flex; align-items:center; justify-content:center; background:#17130f; min-height:0; }
            #if3-fit { overflow:hidden; line-height:0; flex-shrink:0; touch-action:none; }
            body.if3-mobile #if3-frame-tag { left:10px; bottom:44px; min-height:32px; padding:6px 10px; font-size:12px; }
            body.if3-mobile #if3-dock { display:flex; flex-shrink:0; gap:8px; padding:6px 8px calc(8px + env(safe-area-inset-bottom));
                background:#241f1a; border-top:1px solid #3b332a; }
            body.if3-mobile #if3-dock button { flex:1; min-height:44px; font-size:15px; font-weight:600; border-radius:10px; letter-spacing:.04em; }
            body.if3-mobile #if3-dock button.on { background:#3a5f8a; border-color:#4a74a4; color:#fff; }
            body.if3-mobile #if3-drawer-back { display:block; position:fixed; inset:0; background:#0008; z-index:35; }
            body.if3-mobile #if3-drawer-back.if3-hide { display:none !important; }
            body.if3-mobile #if3-more-menu { position:fixed; left:8px; right:8px; top:auto; z-index:90;
                bottom:calc(56px + env(safe-area-inset-bottom)); max-height:62dvh; display:none; flex-direction:column; gap:10px; overflow:hidden;
                border-radius:14px 14px 8px 8px; padding:12px; background:#2a2521; border:1px solid #3d352c; }
            body.if3-mobile #if3-more-menu.open { display:flex; }
            body.if3-mobile #if3-extras { display:flex; flex-direction:column; gap:10px; min-height:0; }
            body.if3-mobile .if3-add-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; flex-shrink:0; }
            body.if3-mobile .if3-add-grid button { min-height:44px; font-size:14px; font-weight:600; border-radius:10px; }
            body.if3-mobile .if3-toggles { display:flex; gap:8px; flex-shrink:0; }
            body.if3-mobile .if3-toggles label { flex:1; display:flex; min-height:40px; align-items:center; justify-content:center;
                gap:8px; font-size:14px; background:#241f1a; border:1px solid #3d352c; border-radius:10px; padding:0 8px; }
            body.if3-mobile #if3-adv-btn { min-height:40px; width:100%; }
            body.if3-mobile .if3-adv { display:none; flex-direction:column; gap:8px; overflow:auto; padding-top:8px; border-top:1px solid #3d352c; }
            body.if3-mobile .if3-adv.open { display:flex; }
            body.if3-mobile .if3-row { min-height:40px; padding:6px 10px; align-items:center; }
            body.if3-mobile #if3-fields input, body.if3-mobile #if3-fields select, body.if3-mobile .slide .nudge { font-size:16px; min-height:36px; }
            body.if3-mobile .slide .nudge { min-width:44px; min-height:44px; }
            body.if3-mobile input[type=checkbox] { -webkit-appearance:none; appearance:none; width:22px; height:22px; margin:0;
                border:1px solid #666; border-radius:4px; background:#1a1510; flex-shrink:0; }
            body.if3-mobile input[type=checkbox]:checked { background:#3a5f8a; border-color:#4a74a4; }
            body.if3-mobile #if3-modal .sheet, body.if3-mobile #if3-help .sheet { width:calc(100vw - 16px); max-height:88dvh; }
            body.if3-mobile .help-grid { grid-template-columns:1fr; }
            body.if3-mobile .orbit { width:160px; height:160px; }
            body.if3-standalone { overscroll-behavior:none; }
        `;
    }

    private static helpHtml(): string {
        return `<div class="sheet"><header><b>Shortcuts</b><button type="button" id="if3-help-x">×</button></header>
            <div class="help-grid">
                <div>
                    <h3>Select</h3>
                    <p><kbd>Click</kbd> smallest hit · <kbd>Ctrl+Click</kbd> toggle</p>
                    <p><kbd>Shift+Click</kbd> tree range · <kbd>Alt+Click</kbd> LAYER under cursor</p>
                    <p><kbd>Shift+Drag</kbd> marquee · <kbd>Ctrl+A</kbd> all in layer focus</p>
                    <p><kbd>I</kbd> invert · <kbd>Esc</kbd> close / leave layer / clear</p>
                    <p><kbd>[</kbd> <kbd>]</kbd> cycle overlap · hit chips under the preview</p>
                    <p><kbd>Enter</kbd> edit inside selected LAYER</p>
                    <h3>Place / edit</h3>
                    <p><kbd>1</kbd>–<kbd>6</kbd> arm type, then click preview (drag to size)</p>
                    <p>1 LAYER · 2 INV · 3 RECT · 4 TEXT · 5 GRAPHIC · 6 MODEL</p>
                    <p><kbd>Drag</kbd> move · handles resize · slider −/+ (Shift 8, Alt 32)</p>
                    <p><kbd>Arrows</kbd> 1px · <kbd>Shift</kbd> 8 · <kbd>Ctrl</kbd> 32 · <kbd>Alt+Arrows</kbd> resize</p>
                </div>
                <div>
                    <h3>Clipboard / hide</h3>
                    <p><kbd>Ctrl+D</kbd> duplicate · <kbd>Ctrl+C</kbd> <kbd>X</kbd> <kbd>V</kbd> copy cut paste</p>
                    <p><kbd>Delete</kbd> hide · <kbd>Shift+Delete</kbd> empty authored slots</p>
                    <p>Stock IF3 cannot be removed. IF1 is preview-only.</p>
                    <p><kbd>H</kbd> hide · <kbd>L</kbd> lock (editor) · <kbd>R</kbd> revert stock</p>
                    <h3>Undo / file</h3>
                    <p><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo (120)</p>
                    <p><kbd>Ctrl+S</kbd> Save (.if3 + pack idx3). Never writes server/cache/.</p>
                    <p><kbd>?</kbd> this help. Keys ignored while typing in a field.</p>
                    <h3>Models</h3>
                    <p>Pickers + sliders + orbit. <b>Clear</b> writes <code>model=-1</code>. NPC/OBJ None is first-class. 1412 spin/fit is draw-time only.</p>
                </div>
            </div></div>`;
    }
}
