/**
 * The five on-screen action hotkeys, bottom-left — Mobile UI 2.0's replacement for the desktop
 * F-keys.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY ACTIONS AND NOT TABS
 * ---------------------------------------------------------------------------------------------
 *
 * 2.0's hotkeys mostly open side panels, because on OSRS mobile the side stones collapse and a
 * panel is otherwise two taps away. Here all thirteen tabs are permanently on screen and bound to
 * the number row besides, so a slot that opened a tab would be a second button for something
 * already one tap away. Every slot below therefore does something the tab strip cannot: it toggles
 * a mode, or fires a control buried inside a panel you would otherwise have to open first.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SLOTS ARE REGISTERED BY `Client`, NOT DEFINED HERE
 * ---------------------------------------------------------------------------------------------
 *
 * Each slot is a label, an `on()` and a `fire()`, and all three of those need client state — the
 * run varp, the menu, the settings. This module imports nothing but `HudSkin`, the same discipline
 * `ControlBar` and `ScreenMode` follow, so `Client` hands it closures at boot instead. What lives
 * here is the geometry, the hit test and the order.
 */

import HudSkin from '#/client/HudSkin.js';
import * as HudStrip from '#/client/HudStrip.js';

export type HotkeySlot = {
    /** Three or four characters. There is no art for these yet — see the note in `label`. */
    label: string;
    /** Longer form, for the settings panel and the tooltip. */
    title: string;
    /** Is the mode on / the toggle set? Drives the lit cell. */
    on: () => boolean;
    /** Do the thing. */
    fire: () => void;
};

export default class HotkeyBar {
    /**
     * EVERY MEASUREMENT HERE IS IN CSS PIXELS, AND THAT IS THE POINT.
     *
     * The column shares the bottom-left corner with the DOM button stack, and the two are placed
     * in different coordinate spaces: the buttons in CSS pixels by the stylesheet, the column in
     * FRAME pixels by the draw. Those spaces only agree when the frame is presented 1:1, which on
     * a desktop it is and on a phone it is not — an 852pt screen showing a 1152-wide frame is at
     * 0.74, so a column placed 60 FRAME pixels from the edge lands 44 CSS pixels from it, directly
     * underneath a 44pt button that starts at 8. Which is exactly what it did.
     *
     * So the column is specified in the same space the buttons are and converted at draw time.
     * That also fixes the quieter half of the problem: a 44-frame-pixel cell is a 33pt target on
     * that same phone, when 44pt is the guideline the DOM buttons already meet.
     *
     * ---------------------------------------------------------------------------------------
     *
     * THE CELL IS NOT THIS MODULE'S TO CHOOSE. It comes from `HudStrip`, which sizes the tab strip
     * and this column TOGETHER against whichever of them the frame squeezes hardest — because two
     * grids of different-sized buttons facing each other across the screen is the first thing you
     * see on a phone, and it is what a fixed 44 here produced. Pushed in by `Client` beside
     * `scale`, and defaulted so the offline preview tool has something to draw.
     */
    static metrics: HudStrip.Strip = HudStrip.geometry(765, 503, { top: 0, right: 0, bottom: 0, left: 0 }, 1);

    /**
     * Presented CSS pixels per frame pixel, pushed in by `Client` each frame.
     *
     * `ScreenMode.frameScale` is the source, but it is not imported: `ScreenMode` reaches
     * `GameShell` and through it the audio shim, which wants a DOM at import time — and this
     * module is imported by the offline preview tool, which has none. Pushing one number in keeps
     * that tool able to render the column, and keeps this file's dependency list at one.
     */
    static scale: number = 1;

    /**
     * The safe-area insets, in FRAME pixels, pushed in by `Client` beside `scale`.
     *
     * THIS IS THE SECOND HALF OF THE SAME BUG THE CSS-PIXEL NOTE ABOVE FIXES, and it took a phone
     * to show it because it is invisible wherever the insets are zero.
     *
     * The DOM button stack is placed at `calc(env(safe-area-inset-left, 0px) + 8px)` — it starts
     * from the edge of the SAFE box. The canvas underneath it does not: in fill mode the frame
     * spans the whole window, under the notch included, so frame x=0 is the physical edge of the
     * glass. On a desktop the two origins coincide and a column at 60 clears a 44-wide stack at 8
     * exactly as intended. On an iPhone held sideways the notch side is a 59pt inset, so the stack
     * moves to 67..111 and the column stays at 60..104 — one directly on top of the other, which
     * is what the screenshot showed.
     *
     * So the column takes the same origin the stack does. Nothing else needs to change: the 60 and
     * the 52 keep meaning what they meant, measured from the same corner as the buttons they were
     * chosen to clear.
     */
    static inset: { left: number; bottom: number } = { left: 0, bottom: 0 };

    /** Those, in frame pixels, at the presentation the frame is being shown at right now. */
    private static frame(css: number): number {
        return Math.round(css / Math.max(0.05, HotkeyBar.scale));
    }

    static get SIZE(): number {
        return HotkeyBar.metrics.cell;
    }

    static get GAP(): number {
        return HotkeyBar.metrics.gap;
    }
    /**
     * A SECOND left-edge column, beside the DOM button stack rather than along the bottom.
     *
     * `HudStrip.HOTKEY_X_CSS` = 60 clears that stack (44 wide at x=8) and the multiway-combat icon
     * the layout puts at frame (15,15) from this corner. Vertical rather than horizontal because
     * the left edge is where this HUD already keeps its controls, and a row along the bottom
     * crossed the world in the one direction the eye follows a fight.
     *
     * It grows UPWARD from the bottom, so the slot nearest the thumb is slot 0 and a short frame
     * loses the top of the column rather than the bottom. It no longer reaches the chat cluster on
     * a short frame — that is constraint (b) in `HudStrip.geometry`, added after a phone drew LOOT
     * across the chatbox.
     */
    static get X(): number {
        return HotkeyBar.frame(HudStrip.HOTKEY_X_CSS) + HotkeyBar.inset.left;
    }

    static get BOTTOM(): number {
        return HotkeyBar.frame(HudStrip.HOTKEY_BOTTOM_CSS) + HotkeyBar.inset.bottom;
    }

    static slots: HotkeySlot[] = [];

    /** Registered once, at boot, by Client. */
    static register(slots: HotkeySlot[]): void {
        HotkeyBar.slots = slots;
    }

    /** One slot's box in absolute frame coordinates, given the frame's size. */
    static rect(index: number, frameW: number, frameH: number): { x: number; y: number; w: number; h: number } {
        void frameW;
        return {
            x: HotkeyBar.X,
            y: frameH - HotkeyBar.BOTTOM - HotkeyBar.SIZE - index * (HotkeyBar.SIZE + HotkeyBar.GAP),
            w: HotkeyBar.SIZE,
            h: HotkeyBar.SIZE
        };
    }

    /** The whole column, for the HUD hit test — a tap here must not also walk the player. */
    static bounds(frameW: number, frameH: number): { x: number; y: number; w: number; h: number } | null {
        if (HotkeyBar.slots.length === 0) {
            return null;
        }
        const first = HotkeyBar.rect(0, frameW, frameH);
        const last = HotkeyBar.rect(HotkeyBar.slots.length - 1, frameW, frameH);
        return { x: first.x, y: last.y, w: first.w, h: first.y + first.h - last.y };
    }

    /** Which slot is at this absolute frame point, or -1. */
    static at(x: number, y: number, frameW: number, frameH: number): number {
        for (let i = 0; i < HotkeyBar.slots.length; i++) {
            const r = HotkeyBar.rect(i, frameW, frameH);
            if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
                return i;
            }
        }
        return -1;
    }

    /**
     * The label colour for a slot's state.
     *
     * The cell already says on-or-off by being lit, so this is reinforcement rather than the only
     * signal — which matters because the lit cell is red, and red reads as "stop" to about as many
     * people as it reads as "active".
     */
    static labelColour(on: boolean): number {
        return on ? HudSkin.TEXT_LIT : HudSkin.TEXT;
    }
}
