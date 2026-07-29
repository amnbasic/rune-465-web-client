import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';

// Plain-DOM control bar that sits underneath the 765x503 canvas (see public/index.html), in the
// spirit of the 2004scape webclient's text controls. It owns the client-side user preferences
// (WASD camera on/off + the side-tab hotkey bindings), persists them to localStorage and renders
// a small text row of controls.
//
// It deliberately imports nothing from Client: Client imports ControlBar, reads
// ControlBar.settings on boot and registers `onWasdChange`, so there is no module cycle.
//
// Adding a control later (OpenGL renderer, ::fs fullscreen, ...) is one ControlBar.register()
// call - the row is rendered from the registry, not hardcoded.

export type Control = {
    id: string;
    label: string;
    // 'toggle' renders "<label> on|off", 'action' renders "label", 'keybind' renders "KEY:label"
    // and rebinds on click
    kind: 'toggle' | 'action' | 'keybind';
    // optional heading printed once in front of a run of controls that share it
    group?: string;
    get?: () => boolean;
    set?: (value: boolean) => void;
    run?: () => void;
    // 'keybind' only: the side-tab index this control binds a key to
    tab?: number;
    // optional dimmed explanatory text rendered immediately after the control
    hint?: string;
};

type Settings = {
    wasd: boolean;
    // client keycode -> tab index
    keys: Record<string, number>;
};

const STORAGE_KEY: string = 'rune465.controlbar.v1';

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
// key from the bar. Values are the client's internal keycodes (see
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
    static settings: Settings = { wasd: true, keys: { ...DEFAULT_KEYS } };

    // set by Client so a bar toggle drives Client.wasdMode
    static onWasdChange: ((value: boolean) => void) | null = null;

    static readonly controls: Control[] = [];

    private static root: HTMLElement | null = null;
    // tab currently being rebound, -1 = none
    private static capturing: number = -1;
    // document-level key listeners attached; kept until the key is released so the keypress
    // char of the bound key can't slip through to the canvas
    private static armed: boolean = false;
    private static keyToTab: Map<number, number> = new Map();

    // ---- state -------------------------------------------------------------

    static load(): void {
        let stored: unknown = null;
        try {
            const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
            stored = raw === null || raw === undefined ? null : JSON.parse(raw);
        } catch {
            stored = null;
        }
        // Anything unexpected falls back to defaults - a bad parse here must never be able to
        // break keyboard input.
        const settings: Settings = { wasd: true, keys: { ...DEFAULT_KEYS } };
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

    static isCapturing(): boolean {
        return ControlBar.armed;
    }

    static register(control: Control): void {
        ControlBar.controls.push(control);
        ControlBar.render();
    }

    // ---- dom ---------------------------------------------------------------

    static init(): void {
        ControlBar.load();

        ControlBar.controls.push({
            id: 'wasd',
            label: 'WASD camera',
            kind: 'toggle',
            hint: '(press Enter to switch between typing and WASD)',
            get: (): boolean => ControlBar.settings.wasd,
            set: (value: boolean): void => {
                ControlBar.settings.wasd = value;
                ControlBar.save();
                ControlBar.onWasdChange?.(value);
            }
        });
        for (let i = 0; i < TABS.length; i++) {
            ControlBar.controls.push({ id: 'tab' + i, label: TABS[i].label, kind: 'keybind', group: 'Tabs', tab: i });
        }
        ControlBar.controls.push({
            id: 'defaults',
            // shares the Tabs group so it renders inside that section rather than opening a new one
            group: 'Tabs',
            label: 'reset to defaults',
            kind: 'action',
            run: (): void => {
                ControlBar.settings.keys = { ...DEFAULT_KEYS };
                ControlBar.reindex();
                ControlBar.save();
            }
        });

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

    private static button(label: string, title: string, onClick: () => void, className: string = 'cb-btn'): HTMLButtonElement {
        const el = document.createElement('button');
        el.className = className;
        el.type = 'button';
        el.textContent = label;
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

    static render(): void {
        const root = ControlBar.container();
        if (root === null) {
            return;
        }
        root.textContent = '';

        // Rendered straight from the registry: consecutive controls sharing a `group` become one
        // titled section. Sections are flex rows that wrap, so the strip never overflows 765px.
        let span: HTMLElement | null = null;
        let groupName: string | undefined;
        let first: boolean = true;
        for (const control of ControlBar.controls) {
            if (span === null || control.group !== groupName) {
                const section = document.createElement('div');
                section.className = 'cb-section';
                groupName = control.group;
                if (!first) {
                    section.classList.add('cb-section-ruled');
                }
                first = false;
                const title = document.createElement('span');
                title.className = 'cb-title';
                title.textContent = groupName ?? 'Camera';
                section.append(title);

                span = document.createElement('span');
                span.className = 'cb-items';
                section.append(span);
                root.append(section);
            }
            if (control.kind === 'toggle') {
                const on = control.get?.() === true;
                const label = document.createElement('span');
                label.className = 'cb-label';
                label.textContent = control.label;
                span.append(label);
                span.append(
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
            } else if (control.kind === 'keybind') {
                const tab = control.tab ?? -1;
                const capturing = ControlBar.capturing === tab;
                const bound = capturing ? '?' : ControlBar.keyLabelForTab(tab);
                span.append(
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
            } else if (control.kind === 'action') {
                span.append(
                    ControlBar.button(
                        control.label,
                        control.label,
                        () => {
                            control.run?.();
                            ControlBar.render();
                            ControlBar.focusGame();
                        },
                        'cb-action'
                    )
                );
            }
            if (control.hint !== undefined) {
                const hint = document.createElement('span');
                hint.className = 'cb-hint';
                hint.textContent = ' ' + control.hint;
                span.append(hint);
            }
        }
    }

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

    // Clicking anywhere outside the bar (the canvas, typically) abandons a pending rebind, so a
    // half-finished capture can never sit there eating every keystroke.
    private static readonly cancelHandler = (event: MouseEvent): void => {
        if (ControlBar.root !== null && event.target instanceof Node && ControlBar.root.contains(event.target)) {
            return;
        }
        ControlBar.capturing = -1;
        ControlBar.disarm();
    };

    private static beginCapture(tab: number): void {
        ControlBar.capturing = tab;
        if (!ControlBar.armed) {
            ControlBar.armed = true;
            document.addEventListener('keydown', ControlBar.captureHandler, true);
            document.addEventListener('keyup', ControlBar.captureHandler, true);
            document.addEventListener('keypress', ControlBar.captureHandler, true);
            document.addEventListener('mousedown', ControlBar.cancelHandler, true);
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
        document.removeEventListener('mousedown', ControlBar.cancelHandler, true);
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
}
