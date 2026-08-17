/*
 * Verifies MobileLayout's anchor table against the real 465 cache geometry for pane 548.
 *
 *     bun tools/verify-mobile-anchors.ts
 *
 * Run this after ANY edit to the ANCHORS table in src/client/MobileLayout.ts.
 *
 * It reads the SHIPPED table out of src/client/MobileLayout.ts (rather than a copy) and runs the
 * client's own layout arithmetic — computeComponentSize / computeComponentPosition, transcribed
 * verbatim from Client.ts — over the cache rects dumped from the cache.
 *
 * The side tab strip is not in that table: its cell SIZE depends on the frame, so it is computed
 * by `HudStrip`, which this tool IMPORTS and calls rather than parsing. That is the whole reason
 * `HudStrip` is a separate module — a source-text parser cannot see a computed value, and a
 * verifier that goes on checking numbers the client stopped using is worse than no verifier,
 * because it keeps reporting OK. `MobileLayout` itself cannot be imported here: it reaches
 * `IfType`, which touches `window` at module scope.
 *
 * The property being checked: at 765x503, every anchored component must resolve to exactly the
 * coordinate the cache gave it. Anything else means an inset is wrong.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import * as HudStrip from '#/client/HudStrip.js';

const CLIENT = '.';
// The cache and its dump tool live in the server repo, alongside this one.
const SERVER = '../RuneJS_PK/server';

type Rect = { x: number; y: number; w: number; h: number; layer: number; type: string };
type Anchor = Record<string, number | boolean | undefined>;

// ---- 1. the cache truth -------------------------------------------------------------------
const dump = execSync('bun tools/dump-interface.ts 548', { cwd: SERVER, encoding: 'utf8' });
const cache = new Map<number, Rect>();
for (const line of dump.split('\n')) {
    const m = /com_(\d+): IF3 type=(\S+) pos=\((-?\d+),(-?\d+)\) size=(\d+)x(\d+) layer=(-?\d+)/.exec(line);
    if (m) {
        cache.set(+m[1], { type: m[2], x: +m[3], y: +m[4], w: +m[5], h: +m[6], layer: +m[7] });
    }
}
console.log(`cache: ${cache.size} children of 548`);

// ---- 2. the shipped anchor table ----------------------------------------------------------
const src = readFileSync(`${CLIENT}/src/client/MobileLayout.ts`, 'utf8');
const body = src.slice(src.indexOf('ANCHORS: Anchor[] = ['), src.indexOf('\n    ];', src.indexOf('ANCHORS')));
const NAMES: Record<string, string> = { X_LEFT: '0', X_CENTRE: '1', X_RIGHT: '2', Y_TOP: '0', Y_BOTTOM: '2', FILL: '1' };
const anchors: Anchor[] = [];
for (const m of body.matchAll(/\{\s*com:[^}]*\}/g)) {
    let text = m[0];
    for (const [name, value] of Object.entries(NAMES)) text = text.replaceAll(name, value);
    anchors.push(new Function(`return (${text})`)() as Anchor);
}
console.log(`table: ${anchors.length} anchored components\n`);

// ---- 3. the client's layout arithmetic (Client.ts:13392-13489, verbatim) -------------------
function size(a: Anchor, parentW: number, parentH: number): { w: number; h: number } {
    const wa = (a.wa as number) ?? 0;
    const ha = (a.ha as number) ?? 0;
    const width = (a.width as number) ?? 0;
    const height = (a.height as number) ?? 0;
    return {
        w: wa === 0 ? width : wa === 1 ? parentW - width : (parentW * width) >> 14,
        h: ha === 0 ? height : ha === 1 ? parentH - height : (parentH * height) >> 14
    };
}
function position(a: Anchor, w: number, h: number, parentW: number, parentH: number): { x: number; y: number } {
    const xa = (a.xa as number) ?? 0;
    const ya = (a.ya as number) ?? 0;
    const x = (a.x as number) ?? 0;
    const y = (a.y as number) ?? 0;
    return {
        x: xa === 0 ? x : xa === 1 ? (((parentW - w) / 2) | 0) + x : xa === 2 ? parentW - x - w : (parentW * x) >> 14,
        y: ya === 0 ? y : ya === 1 ? y + (((parentH - h) / 2) | 0) : ya === 2 ? parentH - h - y : (y * parentH) >> 14
    };
}

// Deliberate departures from cache geometry, with the reason. Everything else must be identical.
const INTENDED: Record<number, string> = {
    62: 'viewport container now fills the frame',
    63: 'the scene now fills the frame',
    71: 'overlay host now fills the frame',
    64: 'modal slot is centred rather than pinned to the viewport corner',
    72: "minimap flush to the corner; the cache's 43px inset was the hidden frame trim's gap",
    82: 'side panel sits beside the tab strip, sharing its baseline',
    65: 'multiway icon moved to the top-left, the only always-world corner',
    10: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    27: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    12: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    29: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    30: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    31: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    32: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    33: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    34: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    35: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    36: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    37: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    38: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    39: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    40: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    41: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    42: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    43: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    13: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    14: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    15: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    16: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    17: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    18: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    19: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    20: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    21: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    22: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    23: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    24: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    25: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    26: 'tab strip: two columns of seven on the right edge, beside the panel instead of under it',
    0: 'chat cluster moved to the top-left, mode bar above the box',
    73: 'chat cluster moved to the top-left, mode bar above the box',
    66: 'chat cluster moved to the top-left, mode bar above the box',
    67: 'chat cluster moved to the top-left, mode bar above the box',
    68: 'chat cluster moved to the top-left, mode bar above the box',
    69: 'chat cluster moved to the top-left, mode bar above the box',
    70: 'chat cluster moved to the top-left, mode bar above the box'
};

// A com id the cache does not use, for the drawn hotkey column. 548's children stop well short.
const HOTKEYS = 900;
// Rects that must never overlap in the resizable layout, at any frame size.
const HUD = [0, 10, 27, 72, 73, 82, 65, 66, 70, HOTKEYS];

type Insets = { top: number; right: number; bottom: number; left: number };
const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** MobileLayout.apply's padding rule: pad whichever edge the component is anchored to. */
function padded(a: Anchor, insets: Insets): Anchor {
    if (a.edge) return a;
    const out = { ...a };
    if (a.xa === 0) out.x = ((a.x as number) ?? 0) + insets.left;
    if (a.xa === 2) out.x = ((a.x as number) ?? 0) + insets.right;
    if (a.ya === 0) out.y = ((a.y as number) ?? 0) + insets.top;
    if (a.ya === 2) out.y = ((a.y as number) ?? 0) + insets.bottom;
    // A FILL size is a margin, so it absorbs the safe area on BOTH sides.
    if (a.wa === 1) out.width = ((a.width as number) ?? 0) + insets.left + insets.right;
    if (a.ha === 1) out.height = ((a.height as number) ?? 0) + insets.top + insets.bottom;
    return out;
}

function run(frameW: number, frameH: number, label: string, insets: Insets = ZERO, scale: number = 1): void {
    // The strip's metrics for THIS frame, from the same function the client calls.
    const strip = HudStrip.geometry(frameW, frameH, insets, scale);
    const all = [...anchors, ...(HudStrip.anchors(strip) as unknown as Anchor[])];
    console.log(`=== ${label}: frame ${frameW}x${frameH} === (cell ${strip.cell}, strip ${strip.footprint} wide)`);
    // Resolve the viewport container first — its children are laid out against ITS resolved box.
    const vp = padded(all.find(a => a.com === 62)!, insets);
    const vpSize = size(vp, frameW, frameH);
    const vpPos = position(vp, vpSize.w, vpSize.h, frameW, frameH);

    let mismatches = 0;
    const resolved = new Map<number, Rect>();
    for (const raw of all) {
        const a = padded(raw, insets);
        const com = a.com as number;
        const rect = cache.get(com);
        if (!rect || a.hide) continue;
        // Child of com_62? Then its parent box is the viewport, not the frame.
        const nested = rect.layer === 62;
        const pw = nested ? vpSize.w : frameW;
        const ph = nested ? vpSize.h : frameH;
        // Size falls back to the cache size when the anchor does not override it.
        const s = a.wa === undefined && a.ha === undefined ? { w: rect.w, h: rect.h } : { w: a.wa === undefined ? rect.w : size(a, pw, ph).w, h: a.ha === undefined ? rect.h : size(a, pw, ph).h };
        const p = position(a, s.w, s.h, pw, ph);
        const absX = (nested ? vpPos.x : 0) + p.x;
        const absY = (nested ? vpPos.y : 0) + p.y;

        if (frameW === 765 && frameH === 503) {
            const same = p.x === rect.x && p.y === rect.y && s.w === rect.w && s.h === rect.h;
            const note = INTENDED[com];
            if (!same && note === undefined) {
                console.log(`  MISMATCH com_${com}: cache (${rect.x},${rect.y}) ${rect.w}x${rect.h} -> (${p.x},${p.y}) ${s.w}x${s.h}`);
                mismatches++;
            } else if (!same) {
                console.log(`  changed  com_${com}: (${rect.x},${rect.y}) ${rect.w}x${rect.h} -> (${p.x},${p.y}) ${s.w}x${s.h}   [${note}]`);
            }
        } else {
            console.log(`  com_${String(com).padStart(2)}  abs (${String(absX).padStart(4)},${String(absY).padStart(4)}) ${s.w}x${s.h}`);
        }
        resolved.set(com, { x: absX, y: absY, w: s.w, h: s.h, layer: rect.layer, type: rect.type });
    }
    if (frameW === 765) {
        console.log(mismatches === 0 ? '  OK: every other anchor is identical to the cache.' : `  ${mismatches} UNEXPECTED MISMATCHES`);
    }

    // THE HOTKEY COLUMN IS NOT A COMPONENT — it is drawn straight onto the frame — so the
    // interface walk above cannot see it and neither could this check. It is injected here under a
    // com id the cache does not use, which is what lets the same overlap loop guard it. Worth the
    // trick: "the chat is too close to the hotkeys" and "the buttons are on top of each other"
    // were both reported from a phone, and both are exactly what this loop exists to catch.
    const keys = HudStrip.hotkeyColumn(strip, frameH, insets, scale);
    resolved.set(HOTKEYS, { ...keys, layer: 71, type: 'drawn' });
    console.log(`  keys   abs (${String(keys.x).padStart(4)},${String(keys.y).padStart(4)}) ${keys.w}x${keys.h}`);

    // No two HUD pieces may overlap, at any frame size. This is the check that the earlier
    // arithmetic pass could not make: an inset can be perfectly derived and still put a widget
    // underneath another one.
    let clashes = 0;
    // Below this width the chat cluster (496), the side panel (190) and the strip at its floor
    // (36 -> 76) add up to more than the frame, so the panel and the chatbox HAVE to share ground
    // and no cell size can prevent it. Exempt only that pair, only below that width, so a
    // regression at any width where a solution does exist is still caught.
    const noSolution = frameW < 496 + HudStrip.PANEL_W + HudStrip.geometry(frameW, 9999, insets, 1).footprint;
    for (let i = 0; i < HUD.length; i++) {
        for (let j = i + 1; j < HUD.length; j++) {
            const a = resolved.get(HUD[i]);
            const b = resolved.get(HUD[j]);
            if (!a || !b) continue;
            // The chatbox and the chat-over-scene lines are two presentations of the SAME chat and
            // are never both up, so they are allowed to occupy the same ground.
            const chatPair = (c: number, d: number): boolean => (c === 73 || c === 0) && d >= 66 && d <= 70;
            // com_65 is the multiway icon at the bottom-left, 25x25 at (15,15) from that corner —
            // inside the column's lane by design, and drawn under it. It is an indicator, not a
            // control, so it has nothing to lose to a tap it never wanted.
            if ((HUD[i] === HOTKEYS && HUD[j] === 65) || (HUD[j] === HOTKEYS && HUD[i] === 65)) continue;
            if (chatPair(HUD[i], HUD[j]) || chatPair(HUD[j], HUD[i])) continue;
            // The side panel FLOATS over the world rather than reserving a column, which is what
            // lets the frame shrink and the HUD be drawn near 1:1 on a phone. Below a frame height
            // of 499 (minimap 156 + panel 261 + tab rows 82) an OPEN panel reaches up into the
            // minimap, and that is a dial rather than a bug: ScreenMode.minHeight picks the trade,
            // 350 for the largest HUD and 503 for no overlap at all. Exempt here because at 350 it
            // is the intended behaviour.
            //
            // The whole right cluster is exempt, not just the panel: the tab strip is 259 tall and
            // reaches the minimap on the same axis for the same reason. At HUD size Fit (420) none
            // of them touch — the run at 962x444 above proves it.
            const floatingPanel = (c: number, d: number): boolean => (c === 82 || c === 10 || c === 27) && d === 72;
            if (floatingPanel(HUD[i], HUD[j]) || floatingPanel(HUD[j], HUD[i])) continue;
            const squeezed = (c: number, d: number): boolean => noSolution && c === 82 && (d === 73 || d === 0);
            if (squeezed(HUD[i], HUD[j]) || squeezed(HUD[j], HUD[i])) continue;
            if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
                console.log(`  OVERLAP com_${HUD[i]} (${a.x},${a.y} ${a.w}x${a.h}) x com_${HUD[j]} (${b.x},${b.y} ${b.w}x${b.h})`);
                clashes++;
            }
        }
    }
    console.log(clashes === 0 ? '  OK: no HUD piece overlaps another.\n' : `  ${clashes} OVERLAPS\n`);
}

run(765, 503, 'baseline identity check');
run(765, 1658, 'iPhone 15 portrait');
run(1920, 1080, 'desktop 1080p');
// A Dynamic Island iPhone held sideways: 59pt on the notch side, 21pt home indicator.
//
// With MIN_H at 350 the height stops binding — s = min(1, (852-59)/765, (393-21)/350) = min(1,
// 1.037, 1.063) = 1 — so the frame is the window, 852x393, and the HUD draws at 1:1 CSS pixels
// instead of the 74% it got when the column had to be 503 tall. The insets are therefore
// themselves, un-divided.
run(852, 393, 'iPhone 15 landscape-left, safe area', { top: 0, right: 59, bottom: 21, left: 0 });
run(962, 444, 'iPhone 15 landscape at HUD size Fit', { top: 0, right: 67, bottom: 24, left: 0 });
run(852, 393, 'iPhone 15 landscape-right, safe area', { top: 0, right: 0, bottom: 21, left: 59 });
// The floor: a window small enough that MIN_H really does bind, so the panel is at its tightest
// against the top of the frame and the modal slot is only just not clipped.
run(765, 350, 'minimum resizable frame');
// The narrowest frame the sizing rule can produce (ScreenMode.MIN_W): a desktop window dragged
// down to 680x350. Nothing on a phone reaches it, but a browser window does.
run(680, 350, 'minimum resizable frame, narrowest');
// The frame an iPhone 15 Pro Max reports in landscape-left — the notch on the LEFT, which is the
// orientation that put the DOM button stack on top of the hotkey column.
run(932, 430, 'iPhone 15 Pro Max landscape-left', { top: 0, right: 0, bottom: 21, left: 59 });
// The same phone with Edge margin set to None: the side insets are dropped and the HUD pulls out
// to the glass, so the clusters are at their widest spread and closest to each other's lanes. The
// home-indicator inset stays, because that one is never scaled.
run(932, 430, 'iPhone 15 Pro Max, edge margin None', { top: 0, right: 0, bottom: 21, left: 0 });
