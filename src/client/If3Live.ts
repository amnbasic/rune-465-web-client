import ClientMouseListener from '#/client/ClientMouseListener.js';
import IfType from '#/config/IfType.js';
import Pix2D from '#/graphics/Pix2D.js';

const TYPES: string[] = ['LAYER', 'U1', 'INV', 'RECT', 'TEXT', 'GRAPHIC', 'MODEL', 'U7', 'U8', 'LINE'];
const HANDLE_NAMES: string[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export type If3Hit = { com: IfType; x: number; y: number; w: number; h: number; area: number };
export type If3Guide = { axis: 'x' | 'y'; at: number };

/**
 * In-game IF3 overlay. Mutates the live IfType the client is already drawing, then POSTs a
 * field patch to `bun tools/if3-editor.ts` which writes `data/interfaces/*.if3`. Never writes
 * server/cache/. Toggle with F8 or Settings → Display → IF3 live editor.
 *
 * Studio (`If3Studio`) owns multi-select, undo and the property sheet; this class is the
 * pick / highlight / mutate layer over drawLayer.
 *
 * Does not import Client (Client imports this). Hooks are filled in Client.init.
 */
export default class If3Live {
    static dirty: (c: IfType) => void = () => {
        /* Client.componentUpdated */
    };
    static redraw: () => void = () => {
        /* Client.redrawAllComponents */
    };
    static openWidgets: () => number[] = () => [];

    static active: boolean = false;
    static studioMode: boolean = false;
    static picking: boolean = false;
    static alwaysPick: boolean = false;
    static onSelect: ((com: IfType | null) => void) | null = null;
    static editorUrl: string = (() => {
        try {
            const loc = globalThis.location;
            if (loc.port === '8799') {
                return loc.origin;
            }
            return loc.origin + '/if3';
        } catch {
            return 'http://127.0.0.1:8799';
        }
    })();
    static widget: number = -1;
    static child: number = -1;
    static com: IfType | null = null;
    /** Child ids; primary is last. Studio mutates the set. */
    static selected: number[] = [];
    static locked: Set<number> = new Set();
    static screenX: number = 0;
    static screenY: number = 0;
    static screenW: number = 0;
    static screenH: number = 0;
    static hover: IfType | null = null;
    static hoverX: number = 0;
    static hoverY: number = 0;
    static hoverW: number = 0;
    static hoverH: number = 0;
    static hitCycle: number = 0;
    static marquee: { x: number; y: number; w: number; h: number } | null = null;
    static guides: If3Guide[] = [];
    static lastMx: number = 0;
    static lastMy: number = 0;

    private static hits: If3Hit[] = [];
    private static selScreen: Map<number, { x: number; y: number; w: number; h: number }> = new Map();

    private static root: HTMLElement | null = null;
    private static statusEl: HTMLElement | null = null;

    static init(): void {
        if (typeof document === 'undefined' || If3Live.root || If3Live.studioMode) {
            return;
        }
        const root = document.createElement('div');
        root.id = 'if3live';
        root.style.cssText =
            'display:none;position:fixed;top:8px;right:8px;z-index:40;width:276px;' +
            'max-height:calc(100vh - 16px);overflow:auto;padding:8px 10px 10px;' +
            'background:linear-gradient(#2a2521,#1e1a16);border:1px solid #3b332a;border-radius:4px;' +
            'box-shadow:inset 0 1px 0 #40382e,0 4px 12px rgba(0,0,0,.6);' +
            'font:11px/1.45 Arial,Helvetica,sans-serif;color:#cbbfa6;user-select:none;';
        root.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <b style="color:#f0d9a0;letter-spacing:.06em">IF3 LIVE</b>
                <span>
                    <button type="button" data-act="pick" title="Click a component in the game">Pick</button>
                    <button type="button" data-act="close">×</button>
                </span>
            </div>
            <div class="row">widget <input id="if3-w" type="number" min="0" style="width:72px">
                <button type="button" data-act="scan" title="Use the currently open interfaces">scan</button></div>
            <div class="row">child <input id="if3-c" type="number" min="0" style="width:72px">
                <span id="if3-type" style="color:#8a7d68"></span></div>
            <div class="row">x <input id="if3-x" type="number" style="width:56px">
                y <input id="if3-y" type="number" style="width:56px"></div>
            <div class="row">w <input id="if3-wd" type="number" style="width:56px">
                h <input id="if3-ht" type="number" style="width:56px"></div>
            <div class="row"><label><input id="if3-hide" type="checkbox"> hide</label></div>
            <div class="row">text <input id="if3-text" type="text" style="width:168px"></div>
            <div class="row">graphic <input id="if3-graphic" type="number" style="width:72px"></div>
            <div class="row">colour <input id="if3-colour" type="number" style="width:88px"></div>
            <div class="row">model <input id="if3-model" type="number" style="width:72px"></div>
            <div class="row">zoom <input id="if3-zoom" type="number" style="width:56px">
                xan <input id="if3-xan" type="number" style="width:56px"></div>
            <div class="row">yan <input id="if3-yan" type="number" style="width:56px">
                zan <input id="if3-zan" type="number" style="width:56px"></div>
            <div class="row">xof <input id="if3-xof" type="number" style="width:56px">
                yof <input id="if3-yof" type="number" style="width:56px"></div>
            <div class="row" style="margin-top:4px">
                <button type="button" data-act="apply">Apply</button>
                <button type="button" data-act="save">Save .if3</button>
                <button type="button" data-act="pack">Save+pack</button>
            </div>
            <div class="row">editor <input id="if3-url" type="text" style="width:180px" value="http://127.0.0.1:8799"></div>
            <div id="if3-status" style="color:#8a7d68;margin-top:4px;word-break:break-word">F8 toggle. ::iface N to open a widget, then Pick.</div>
        `;
        const style = document.createElement('style');
        style.textContent =
            '#if3live .row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:3px 0}' +
            '#if3live input[type=number],#if3live input[type=text]{background:#1a1510;color:#e6dcc6;border:1px solid #3d352c;padding:2px 4px}' +
            '#if3live button{background:#241f1a;color:#cbbfa6;border:1px solid #3d352c;border-radius:3px;padding:2px 8px;cursor:pointer}' +
            '#if3live button:hover{color:#ffe6a8;border-color:#6b5c46}' +
            '#if3live.picking{outline:2px solid #c9a227}';
        document.head.appendChild(style);
        document.body.appendChild(root);
        If3Live.root = root;
        If3Live.statusEl = root.querySelector('#if3-status');

        root.querySelectorAll('button[data-act]').forEach(btn => {
            btn.addEventListener('click', ev => {
                ev.preventDefault();
                const act = (btn as HTMLElement).dataset.act;
                if (act === 'close') {
                    If3Live.setActive(false);
                } else if (act === 'pick') {
                    If3Live.picking = true;
                    root.classList.add('picking');
                    If3Live.setStatus('Click a component in the game');
                } else if (act === 'scan') {
                    If3Live.scan();
                } else if (act === 'apply') {
                    If3Live.readForm();
                    If3Live.apply(true);
                } else if (act === 'save') {
                    If3Live.save(false);
                } else if (act === 'pack') {
                    If3Live.save(true);
                }
            });
        });
        root.querySelectorAll('input').forEach(el => {
            el.addEventListener('change', () => {
                If3Live.readForm();
                If3Live.apply();
            });
            el.addEventListener('keydown', ev => ev.stopPropagation());
        });
        window.addEventListener('keydown', ev => {
            if (ev.key === 'F8') {
                ev.preventDefault();
                If3Live.toggle();
            }
            if (!If3Live.active || If3Live.studioMode || If3Live.com == null) {
                return;
            }
            const t = ev.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
                return;
            }
            if (ev.key.startsWith('Arrow') && !ev.ctrlKey && !ev.metaKey) {
                ev.preventDefault();
                const step = ev.shiftKey ? 8 : 1;
                if (ev.altKey) {
                    if (ev.key === 'ArrowLeft') {
                        If3Live.com.width = Math.max(0, If3Live.com.width - step);
                    }
                    if (ev.key === 'ArrowRight') {
                        If3Live.com.width += step;
                    }
                    if (ev.key === 'ArrowUp') {
                        If3Live.com.height = Math.max(0, If3Live.com.height - step);
                    }
                    if (ev.key === 'ArrowDown') {
                        If3Live.com.height += step;
                    }
                } else {
                    if (ev.key === 'ArrowLeft') {
                        If3Live.com.x -= step;
                    }
                    if (ev.key === 'ArrowRight') {
                        If3Live.com.x += step;
                    }
                    if (ev.key === 'ArrowUp') {
                        If3Live.com.y -= step;
                    }
                    if (ev.key === 'ArrowDown') {
                        If3Live.com.y += step;
                    }
                }
                If3Live.syncFromCom();
                If3Live.apply();
            }
        });
    }

    static toggle(): void {
        If3Live.setActive(!If3Live.active);
    }

    static setActive(on: boolean): void {
        If3Live.active = on;
        If3Live.picking = false;
        if (If3Live.root) {
            If3Live.root.style.display = on ? 'block' : 'none';
            If3Live.root.classList.remove('picking');
        }
        if (on) {
            If3Live.scan();
        }
    }

    static childId(com: IfType): number {
        return com.parentId & 0xffff;
    }

    static isLocked(id: number): boolean {
        return If3Live.locked.has(id);
    }

    static isSelectedId(id: number): boolean {
        return If3Live.selected.includes(id);
    }

    static beginFrame(): void {
        If3Live.hover = null;
        If3Live.hoverW = 0;
        If3Live.hits = [];
        If3Live.selScreen.clear();
    }

    static noteDraw(com: IfType, x: number, y: number, w: number, h: number): void {
        const id = If3Live.childId(com);
        if (If3Live.com === com || If3Live.selected.includes(id)) {
            If3Live.selScreen.set(id, { x, y, w, h });
        }
        if (If3Live.com === com) {
            If3Live.screenX = x;
            If3Live.screenY = y;
            If3Live.screenW = w;
            If3Live.screenH = h;
        }
        if (!If3Live.active) {
            return;
        }
        const hw = Math.max(1, w);
        const hh = Math.max(1, h);
        const mx = ClientMouseListener.mouseX;
        const my = ClientMouseListener.mouseY;
        if (mx < x || my < y || mx >= x + hw || my >= y + hh) {
            return;
        }
        If3Live.hits.push({ com, x, y, w: hw, h: hh, area: hw * hh });
    }

    static hitsUnder(): If3Hit[] {
        const hits = If3Live.hits.slice();
        hits.sort((a, b) => a.area - b.area);
        return hits;
    }

    static pickHover(): IfType | null {
        const hits = If3Live.hitsUnder();
        if (!hits.length) {
            If3Live.hover = null;
            If3Live.hoverW = 0;
            return null;
        }
        const nonLayer = hits.filter(h => h.com.type !== 0);
        const list = nonLayer.length ? nonLayer : hits;
        const i = ((If3Live.hitCycle % list.length) + list.length) % list.length;
        const h = list[i];
        If3Live.hover = h.com;
        If3Live.hoverX = h.x;
        If3Live.hoverY = h.y;
        If3Live.hoverW = h.w;
        If3Live.hoverH = h.h;
        return h.com;
    }

    static pickLayerHover(): IfType | null {
        const hits = If3Live.hitsUnder();
        const layer = hits.find(h => h.com.type === 0);
        if (layer) {
            If3Live.hover = layer.com;
            If3Live.hoverX = layer.x;
            If3Live.hoverY = layer.y;
            If3Live.hoverW = layer.w;
            If3Live.hoverH = layer.h;
            return layer.com;
        }
        return If3Live.pickHover();
    }

    static cycleHit(dir: number, add = false): void {
        If3Live.hitCycle += dir;
        const com = If3Live.pickHover();
        if (com) {
            if (add) {
                If3Live.toggleSel(com);
            } else {
                If3Live.selectOne(com);
            }
        }
    }

    static consumeClick(button: number): boolean {
        if (If3Live.studioMode) {
            return false;
        }
        if (!If3Live.active || button === 0) {
            return false;
        }
        if (!If3Live.picking && !If3Live.alwaysPick) {
            return false;
        }
        If3Live.pickHover();
        if (button === 2) {
            If3Live.hitCycle++;
            If3Live.pickHover();
        }
        if (If3Live.hover) {
            if (!If3Live.alwaysPick) {
                If3Live.picking = false;
                If3Live.root?.classList.remove('picking');
            }
            If3Live.selectOne(If3Live.hover);
        } else if (!If3Live.alwaysPick) {
            If3Live.setStatus('Nothing under the cursor — click a drawn component');
        }
        return true;
    }

    static handleAt(gx: number, gy: number, coarse: boolean): string | null {
        const com = If3Live.com;
        if (!com || If3Live.screenW <= 0 || If3Live.isLocked(If3Live.child)) {
            return null;
        }
        const x = If3Live.screenX;
        const y = If3Live.screenY;
        const w = Math.max(1, If3Live.screenW);
        const h = Math.max(1, If3Live.screenH);
        const pts: Array<[number, number]> = [
            [x, y],
            [x + w / 2, y],
            [x + w, y],
            [x + w, y + h / 2],
            [x + w, y + h],
            [x + w / 2, y + h],
            [x, y + h],
            [x, y + h / 2]
        ];
        const tol = coarse ? 14 : 6;
        for (let i = 0; i < pts.length; i++) {
            if (Math.abs(gx - pts[i][0]) <= tol && Math.abs(gy - pts[i][1]) <= tol) {
                return HANDLE_NAMES[i];
            }
        }
        return null;
    }

    static drawHighlight(): void {
        if (!If3Live.active) {
            return;
        }
        If3Live.pickHover();
        if ((If3Live.picking || If3Live.alwaysPick) && If3Live.hoverW > 0 && If3Live.hover !== If3Live.com) {
            Pix2D.drawRect(If3Live.hoverX, If3Live.hoverY, If3Live.hoverW, If3Live.hoverH, 0x55ddff);
        }
        for (const [id, r] of If3Live.selScreen) {
            const primary = id === If3Live.child;
            Pix2D.drawRect(r.x, r.y, Math.max(1, r.w), Math.max(1, r.h), primary ? 0xffff00 : 0x55aacc);
        }
        if (If3Live.com != null && If3Live.screenW > 0 && !If3Live.selScreen.has(If3Live.child)) {
            Pix2D.drawRect(If3Live.screenX, If3Live.screenY, Math.max(1, If3Live.screenW), Math.max(1, If3Live.screenH), 0xffff00);
        }
        if (If3Live.studioMode && If3Live.com && If3Live.screenW > 0 && !If3Live.isLocked(If3Live.child)) {
            const x = If3Live.screenX;
            const y = If3Live.screenY;
            const w = Math.max(1, If3Live.screenW);
            const h = Math.max(1, If3Live.screenH);
            const pts: Array<[number, number]> = [
                [x, y],
                [x + w / 2, y],
                [x + w, y],
                [x + w, y + h / 2],
                [x + w, y + h],
                [x + w / 2, y + h],
                [x, y + h],
                [x, y + h / 2]
            ];
            for (const [px, py] of pts) {
                Pix2D.fillRect(px - 3, py - 3, 6, 6, 0xf0d9a0);
            }
        }
        if (If3Live.marquee) {
            const m = If3Live.marquee;
            Pix2D.drawRect(m.x, m.y, Math.max(1, m.w), Math.max(1, m.h), 0x7eb6ea);
        }
        for (const g of If3Live.guides) {
            if (g.axis === 'x') {
                Pix2D.vline(g.at, 0, 503, 0xff66aa);
            } else {
                Pix2D.hline(0, g.at, 765, 0xff66aa);
            }
        }
    }

    static select(com: IfType): void {
        If3Live.selectOne(com);
    }

    static selectOne(com: IfType): void {
        If3Live.selected = [If3Live.childId(com)];
        If3Live.setPrimary(com);
    }

    static toggleSel(com: IfType): void {
        const id = If3Live.childId(com);
        const i = If3Live.selected.indexOf(id);
        if (i >= 0) {
            If3Live.selected.splice(i, 1);
        } else {
            If3Live.selected.push(id);
        }
        If3Live.syncPrimary();
    }

    static selectIds(ids: number[], list: Array<IfType | null>): void {
        If3Live.selected = ids.slice();
        If3Live.syncPrimaryFromList(list);
    }

    static clearSel(): void {
        If3Live.selected = [];
        If3Live.com = null;
        If3Live.child = -1;
        If3Live.screenW = 0;
        If3Live.onSelect?.(null);
        If3Live.redraw();
    }

    private static syncPrimaryFromList(list: Array<IfType | null>): void {
        if (!If3Live.selected.length) {
            If3Live.com = null;
            If3Live.child = -1;
            If3Live.screenW = 0;
            If3Live.onSelect?.(null);
            If3Live.redraw();
            return;
        }
        const id = If3Live.selected[If3Live.selected.length - 1];
        const com = list[id];
        if (com) {
            If3Live.setPrimary(com);
        }
    }

    private static syncPrimary(): void {
        if (!If3Live.selected.length) {
            If3Live.com = null;
            If3Live.child = -1;
            If3Live.screenW = 0;
            If3Live.onSelect?.(null);
            If3Live.redraw();
            return;
        }
        const id = If3Live.selected[If3Live.selected.length - 1];
        const packed = If3Live.widget >= 0 ? (If3Live.widget << 16) | id : id;
        const com = IfType.get(If3Live.com ? (If3Live.com.parentId & 0xffff0000) | id : packed);
        if (com) {
            If3Live.setPrimary(com);
        }
    }

    private static setPrimary(com: IfType): void {
        If3Live.com = com;
        If3Live.widget = (com.parentId >> 16) & 0xffff;
        If3Live.child = com.parentId & 0xffff;
        if (!If3Live.selected.includes(If3Live.child)) {
            If3Live.selected = [If3Live.child];
        }
        If3Live.syncFromCom();
        const extra = If3Live.selected.length > 1 ? '  +' + (If3Live.selected.length - 1) : '';
        If3Live.setStatus(`com_${If3Live.child} ${TYPES[com.type] || com.type}  ${com.width}x${com.height}${extra}`);
        If3Live.onSelect?.(com);
        If3Live.redraw();
    }

    private static scan(): void {
        const ids = If3Live.openWidgets();
        if (!ids.length) {
            If3Live.setStatus('No interface open. ::iface 521 then Pick.');
            return;
        }
        const wEl = document.getElementById('if3-w') as HTMLInputElement | null;
        if (wEl && If3Live.widget < 0) {
            const prefer = ids.find(id => id !== 548 && id !== 549) ?? ids[0];
            wEl.value = String(prefer);
            If3Live.widget = prefer;
        }
        If3Live.setStatus('open: ' + ids.join(', '));
    }

    private static readForm(): void {
        const num = (id: string): number => {
            const n = Number((document.getElementById(id) as HTMLInputElement | null)?.value);
            return Number.isFinite(n) ? n : 0;
        };
        const str = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const chk = (id: string): boolean => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;
        If3Live.widget = num('if3-w');
        If3Live.child = num('if3-c');
        If3Live.editorUrl = str('if3-url').replace(/\/+$/, '') || 'http://127.0.0.1:8799';
        if (!If3Live.com) {
            If3Live.com = IfType.get((If3Live.widget << 16) | If3Live.child);
        }
        if (!If3Live.com) {
            return;
        }
        If3Live.com.x = num('if3-x');
        If3Live.com.y = num('if3-y');
        If3Live.com.width = num('if3-wd');
        If3Live.com.height = num('if3-ht');
        If3Live.com.hide = chk('if3-hide');
        If3Live.com.text = str('if3-text');
        If3Live.com.graphic = num('if3-graphic');
        If3Live.com.colour = num('if3-colour');
        If3Live.com.model1Type = 1;
        If3Live.com.model1Id = num('if3-model');
        If3Live.com.modelZoom = num('if3-zoom');
        If3Live.com.modelXAn = num('if3-xan');
        If3Live.com.modelYAn = num('if3-yan');
        If3Live.com.modelZAn = num('if3-zan');
        If3Live.com.modelXOf = num('if3-xof');
        If3Live.com.modelYOf = num('if3-yof');
    }

    private static syncFromCom(): void {
        const com = If3Live.com;
        if (!com || !If3Live.root) {
            return;
        }
        const set = (id: string, v: string | number | boolean): void => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (!el) {
                return;
            }
            if (typeof v === 'boolean') {
                el.checked = v;
            } else {
                el.value = String(v);
            }
        };
        set('if3-w', If3Live.widget);
        set('if3-c', If3Live.child);
        set('if3-x', com.x);
        set('if3-y', com.y);
        set('if3-wd', com.width);
        set('if3-ht', com.height);
        set('if3-hide', com.hide);
        set('if3-text', com.text || '');
        set('if3-graphic', com.graphic);
        set('if3-colour', com.colour);
        set('if3-model', com.model1Id);
        set('if3-zoom', com.modelZoom);
        set('if3-xan', com.modelXAn);
        set('if3-yan', com.modelYAn);
        set('if3-zan', com.modelZAn);
        set('if3-xof', com.modelXOf);
        set('if3-yof', com.modelYOf);
        const t = document.getElementById('if3-type');
        if (t) {
            t.textContent = TYPES[com.type] || String(com.type);
        }
    }

    static apply(resetMesh = false): void {
        const com = If3Live.com;
        if (!com) {
            If3Live.setStatus('No component selected');
            return;
        }
        If3Live.applyCom(com, resetMesh);
        for (const id of If3Live.selected) {
            if (id === If3Live.child) {
                continue;
            }
            const packed = (If3Live.widget << 16) | id;
            const other = IfType.get(packed);
            if (other) {
                other.renderWidth = other.width;
                other.renderHeight = other.height;
                If3Live.dirty(other);
            }
        }
        If3Live.redraw();
    }

    static applyCom(com: IfType, resetMesh = false): void {
        com.renderWidth = com.width;
        com.renderHeight = com.height;
        if (resetMesh) {
            IfType.modelCache.clear();
        }
        If3Live.dirty(com);
        If3Live.redraw();
    }

    static fieldsOf(com: IfType): Record<string, unknown> {
        return {
            x: com.x,
            y: com.y,
            width: com.width,
            height: com.height,
            hide: com.hide,
            text: com.text || '',
            graphic: com.graphic,
            colour: com.colour,
            model: com.model1Id,
            modelzoom: com.modelZoom,
            modelxan: com.modelXAn,
            modelyan: com.modelYAn,
            modelzan: com.modelZAn,
            modelxof: com.modelXOf,
            modelyof: com.modelYOf
        };
    }

    private static async save(pack: boolean): Promise<void> {
        If3Live.readForm();
        const com = If3Live.com;
        if (!com) {
            If3Live.setStatus('No component selected');
            return;
        }
        const body = {
            widget: If3Live.widget,
            child: If3Live.child,
            pack,
            fields: If3Live.fieldsOf(com)
        };
        If3Live.setStatus(pack ? 'Packing…' : 'Saving…');
        try {
            const r = await fetch(If3Live.editorUrl + '/api/live-patch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const j = (await r.json()) as { ok?: boolean; saved?: string; error?: string; packed?: boolean };
            if (!r.ok || !j.ok) {
                If3Live.setStatus(j.error || 'save failed (is if3-editor running on :8799?)');
                return;
            }
            If3Live.setStatus((pack ? 'Packed ' : 'Saved ') + (j.saved || '').split(/[/\\]/).pop());
        } catch (e) {
            If3Live.setStatus('Cannot reach ' + If3Live.editorUrl + ' — ' + (e instanceof Error ? e.message : String(e)));
        }
    }

    private static setStatus(msg: string): void {
        if (If3Live.statusEl) {
            If3Live.statusEl.textContent = msg;
        }
    }
}
