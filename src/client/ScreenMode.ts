import GameShell from '#/client/GameShell.js';
import GlRenderer from '#/dash3d/GlRenderer.js';
import Pix2D from '#/graphics/Pix2D.js';
import PixMap from '#/graphics/PixMap.js';

// Type-only, so it is erased at compile time and adds no module edge - this file still imports
// nothing it can be tangled with. MobileLayout owns the shape because it is the thing that
// consumes it; ScreenMode only measures.
import type { SafeInsets } from '#/client/MobileLayout.js';

/** Sentinel for "no safe area applies here" — identity-compared, so it must be one object. */
const NO_SAFE: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// ScreenMode - what size the frame is drawn at and how it is presented, plus the 3D render scale.
//
// TWO display modes, chosen in the settings panel and persisted:
//
//   FIXED (desktop default). The engine renders the frame the cache was authored for - 765x503,
//   with the 512x334 viewport pane 548 puts it in - and the BROWSER scales that frame to fit the
//   window, preserving aspect. A pure CSS scale of the backing store, so it costs the engine
//   nothing.
//
//   RESIZABLE (touch default). The backing store is sized to the WINDOW, so the frame has the
//   window's aspect and the 3D scene can fill it. `MobileLayout` supplies the other half by
//   re-anchoring pane 548's HUD around the bigger frame. This file owns the surface and knows
//   nothing about interfaces; MobileLayout owns the layout and knows nothing about canvases.
//
// Pointer coordinates need no work in either mode: ClientMouseListener divides by the canvas'
// bounding rect, which is the presented rect by definition.
//
// An earlier attempt at resizable mode lived here and was removed. It re-stamped pane 548's child
// geometry by hand every frame, and it is worth knowing why this one does not: the engine already
// contains a relative-anchoring layout pass, dormant for want of cache data, and MobileLayout
// drives that instead. `focalFor` and `renderScale` are the two pieces of the old work that
// survived, both because they are still the right answer.
//
// This file deliberately imports nothing from Client: the settings panel drives it, and Client
// registers `onSurfaceChange` and publishes `gameFrame`. That keeps ControlBar free to import it
// without a module cycle.
export default class ScreenMode {
    /** Cache-baseline client dimensions (the 548 layout is authored for these). */
    static readonly FIXED_W: number = 765;
    static readonly FIXED_H: number = 503;

    /**
     * THE SMALLEST FRAME THE RESIZABLE HUD FITS IN — and the single number that decides how big
     * everything looks on a phone.
     *
     * `tick` divides the window by these, so they set the presentation scale: at 765x503 an iPhone
     * in landscape resolves to about 0.74, which is why every glyph, item icon, scrollbar and menu
     * row was drawn at roughly three quarters of a CSS pixel. Nothing scales the HUD art; the frame
     * being oversized IS the shrink.
     *
     * WIDTH was 765 — chat-mode bar 496 plus lower tab row 269, meeting exactly along the bottom.
     * The chat cluster now lives at the TOP left and the tabs are a 68-wide strip at the bottom
     * right, so nothing shares a row any more. What is left is the widest single row: the chat
     * cluster's 496 beside the minimap's 172, i.e. 668. 680 with a little air.
     *
     * HEIGHT was 503, the cache's right-hand column: minimap 156 + upper tabs 45 + PANEL 261 +
     * lower tabs 37, from y=4. `MobileLayout` no longer stacks it that way — the two tab rows sit
     * together at the bottom and the side panel floats above them over the world — so the column
     * only has to hold what is permanently on screen. What is left binding:
     *
     *   panel 261 (the tab strip is BESIDE it now, not under it)
     *   modal slot 334 at y=4          = 338   (a bank or shop must not be clipped)
     *
     * 350 clears both with a little air. The minimap and an OPEN panel may now overlap on a short
     * frame, which is the deliberate trade: you close the panel to see the map, and in exchange the
     * HUD is drawn near 1:1 instead of at 74%.
     */
    static readonly MIN_W: number = 680;
    static readonly MIN_H: number = 350;

    /**
     * THE ZOOM DIAL. `tick` divides by this, so it is how large the HUD is drawn — and, because
     * the side panel floats, also how much of the minimap an open panel covers.
     *
     * The two ends are both real numbers rather than tastes:
     *
     *   350  the floor (see MIN_H). Largest HUD — near 1:1 on a phone — and an open panel reaches
     *        149 rows up into the minimap.
     *   499  minimap 156 + panel 261 + tab rows 82. The exact height at which the panel's top
     *        meets the minimap's bottom, so nothing overlaps at all, at ~0.79 scale on a phone.
     *
     * Anything between trades one for the other linearly: overlap is `499 - frameH` rows. There is
     * no arrangement that avoids it at 393 — 156 + 261 is 417 and the frame is 393 — so this is a
     * dial, not a bug to fix. Sitting the panel beside the tab block dodges the minimap and hits
     * the chat-mode bar and two chat lines instead; the anchor verifier caught that.
     */
    static minHeight: number = ScreenMode.MIN_H;

    /** The height at which an open panel exactly stops touching the minimap. */
    static readonly FIT_H: number = 420;

    static setMinHeight(value: number): void {
        if (ScreenMode.minHeight === value) {
            return;
        }
        ScreenMode.minHeight = value;
        // Same invalidation as setResizable: the scale, the backing store and the CSS all have to
        // be re-resolved, and the memo is keyed on things that have not changed.
        ScreenMode.appliedCss = '';
        ScreenMode.insetsRead = false;
        ScreenMode.pendingW = 0;
        ScreenMode.onChange?.();
    }

    /**
     * Vertical strip kept clear under the frame for the settings button (its height plus the
     * body's bottom padding). Must stay in step with #controlbar's margin in public/index.html.
     * Fitting to the full window height instead makes the page taller than the window, and then
     * the whole thing scrolls - which is what you feel while playing.
     */
    static readonly BUTTON_STRIP: number = 48;

    /**
     * The same idea for touch: the mobile button bar (Keyboard / Fullscreen) plus the settings
     * button sit under the frame. Smaller than BUTTON_STRIP because on a phone the frame is
     * width-limited in portrait anyway, so height spent here is usually free.
     */
    static readonly MOBILE_STRIP: number = 40;

    /**
     * RESIZABLE MODE — the frame grows to the window and the HUD anchors to its corners.
     *
     * Off: the frame is the cache baseline 765x503 and the browser CSS-scales it to fit,
     * preserving aspect. That is the authentic fixed layout and it is the default everywhere.
     *
     * On: the backing store is sized to the window (see `tick`), the 3D viewport fills the whole
     * frame instead of the 512x334 hole pane 548 puts it in, and `MobileLayout` re-anchors 548's
     * HUD around it. Those two halves are separate on purpose — this file owns the SURFACE and
     * knows nothing about interfaces; MobileLayout owns the LAYOUT and knows nothing about
     * canvases. Turning the flag on without MobileLayout gives a bigger viewport under a HUD
     * still nailed to cache coordinates, which is what the earlier "Big view" button did and why
     * it read as broken.
     */
    static resizable: boolean = false;

    /**
     * Whether the game frame (pane 548) is the thing on screen right now. Written by Client once
     * per frame; see the note at its assignment in `mainredraw`.
     *
     * The resizable surface requires BOTH this and `resizable`. The title and login screens are
     * drawn by code that hardcodes the 765-pixel stride, so they must keep the fixed frame however
     * the setting is left — which is also why this is a separate flag rather than folded into
     * `resizable`: the preference persists, this does not.
     */
    static gameFrame: boolean = false;

    /** The baseline viewport pane 548 carries, and what the projection focal is baked for. */
    static readonly BASE_VIEW_W: number = 512;
    static readonly BASE_VIEW_H: number = 334;

    static setResizable(value: boolean): void {
        if (ScreenMode.resizable === value) {
            return;
        }
        ScreenMode.resizable = value;
        // Force the surface, the CSS and the safe area to all be re-resolved on the next frame.
        // The CSS lands at once; the backing store follows one settle interval later, which reads
        // as the frame easing into its new size rather than snapping.
        ScreenMode.appliedCss = '';
        ScreenMode.insetsRead = false;
        ScreenMode.pendingW = 0;
        ScreenMode.onChange?.();
    }

    /**
     * Focal for a viewport of this height, holding VERTICAL field of view constant.
     *
     * Pix3D.focal is baked against the 512x334 viewport (focal 512). Widen the rect at a fixed
     * focal and the horizontal FOV grows with it — the fisheye that made the previous attempt
     * at this look wrong. Scaling focal with HEIGHT keeps the vertical view identical to fixed
     * mode and lets the extra width show more of the world, which is what a wider screen should
     * do. Height is the right axis because that is the one a taller window should not distort.
     */
    static focalFor(viewportHeight: number): number {
        if (!ScreenMode.resizable || viewportHeight <= 0) {
            return 512;
        }
        return Math.max(1, Math.round((512 * viewportHeight) / ScreenMode.BASE_VIEW_H));
    }

    /**
     * 3D render scale: 2 = the scene renders at half resolution and 2x-upscales. Raster cost is
     * pixel count, so this is the one real performance lever. HUD and overlays always draw
     * full-res.
     *
     * Software: the scene rasters into a half-size scratch buffer (bindSceneBuffer) which is
     * nearest-neighbour upscaled into the frame (blitSceneBuffer). GPU: the glcanvas BACKING STORE
     * is divided instead (GlRenderer.scale) while the layer keeps presenting at the frame's CSS
     * size, so the vertices handed to GL stay full-res and nothing in that path has to know.
     */
    static renderScale: number = 1;

    /** Called after the drawing surfaces change, so Client can flag every component dirty. */
    static onSurfaceChange: (() => void) | null = null;
    /** Called when a display change lands, so the settings panel can persist + re-render. */
    static onChange: (() => void) | null = null;

    private static listenersBound: boolean = false;

    // ---- queries -----------------------------------------------------------

    /** The scale the scene pass should render at this frame. */
    static activeScale(): number {
        return ScreenMode.renderScale;
    }

    // ---- requests (settings panel) -----------------------------------------

    static setRenderScale(scale: number): void {
        ScreenMode.renderScale = scale;
        // The GPU path renders at this scale by shrinking the glcanvas BACKING STORE, so the layer
        // has to be re-made the moment it changes.
        GlRenderer.scale = scale;
        GlRenderer.resize(GameShell.sWid, GameShell.sHei);
        // A new backing store presents at its own pixel size until it is told otherwise, so the
        // GPU layer has to be re-stamped or it stops lining up with the 2D frame. Copying the 2D
        // canvas' current CSS size is mode-agnostic and exact - it is by definition whichever
        // presentation is live. The memo is cleared too so the next tick re-resolves cleanly.
        const canvas = GameShell.canvas;
        if (canvas) {
            GlRenderer.setCssSize(canvas.style.width, canvas.style.height);
        }
        ScreenMode.appliedCss = '';
        ScreenMode.onChange?.();
    }

    // ---- per-frame driver --------------------------------------------------

    /** Presented CSS pixels per frame pixel. 1 in fixed mode at 1:1; < 1 whenever we downscale. */
    static frameScale: number = 1;

    /**
     * Called at the top of every frame, before anything has drawn.
     *
     * THE SIZING RULE. Pick ONE uniform scale `s`, then the frame is simply the window divided by
     * it: `w = winW / s`, `h = winH / s`. Deriving both axes from a single `s` is what keeps the
     * present undistorted — the frame's aspect equals the window's by construction, so there is
     * never a letterbox and never a squash.
     *
     *     s = min(1, (winW - insetH) / MIN_W, (winH - insetV) / MIN_H)
     *
     * The two minimums are the HUD's own footprint, not sentiment about the cache — see MIN_W /
     * MIN_H, which is also where the reason the HUD used to look tiny on a phone is written down.
     * Under either the HUD would start overlapping itself, so the frame stops shrinking there and
     * `s` drops below 1 to make up the difference — i.e. the browser downscales the presentation
     * the rest of the way.
     *
     * The safe-area insets come out of the window BEFORE that division, and this is load-bearing
     * rather than tidy. The HUD needs 503 rows of ground it is allowed to draw on; if 21pt at the
     * bottom belong to the home indicator then the frame has to be taller than 503 for 503 of it to
     * be usable. Fitting to the raw window instead packs the right-hand column into exactly 503
     * rows and then pushes the bottom-anchored part of it up by the inset — straight into the
     * top-anchored minimap, which does not move. The frame itself is still the whole window: the
     * scene is meant to reach the glass. Only the HUD is held inside the safe box.
     *
     * The `1` cap is what stops the frame ever being SMALLER than the window on a big desktop:
     * without it a 1920x1080 window would render a 765x503 frame blown up 2.5x.
     *
     *   Desktop 1920x1080          s = 1      -> 1920x1080, a true 1:1 frame, no scaling at all.
     *   iPhone 15 landscape 852x393, 59pt notch inset and a 21pt home indicator:
     *                              s = 734/765 = 0.96 -> 888x410. WIDTH binds now, not height, and
     *                                           the HUD is drawn at 96% of a CSS pixel instead of
     *                                           the 74% it got while the column had to be 503 tall.
     *   Same phone in portrait 393x852 s = 0.514 -> 765x1658. Correct, just very tall: the minimap
     *                                           and the tab rows end up a long way apart. Playable,
     *                                           which is why portrait gets a hint and not a block.
     */
    static tick(): void {
        ScreenMode.bindListeners();
        if (!ScreenMode.resizable || !ScreenMode.gameFrame) {
            // Fixed: the cache baseline, letterboxed. This is also where the title and login
            // screens live even with the resizable preference on - see `gameFrame`.
            ScreenMode.applySize(ScreenMode.FIXED_W, ScreenMode.FIXED_H);
            ScreenMode.applyCssFit();
            return;
        }
        const winW: number = Math.max(1, (globalThis.innerWidth ?? ScreenMode.FIXED_W) | 0);
        const winH: number = Math.max(1, (globalThis.innerHeight ?? ScreenMode.FIXED_H) | 0);
        ScreenMode.readInsets();
        const inset: SafeInsets = ScreenMode.cssInsets;
        const safeW: number = Math.max(1, winW - inset.left - inset.right);
        const safeH: number = Math.max(1, winH - inset.top - inset.bottom);
        let scale: number = Math.min(1, safeW / ScreenMode.MIN_W, safeH / ScreenMode.minHeight);
        // Raster cost is pixel count, and this is a software rasterizer by default. Past the cap
        // the frame stops growing and the browser upscales the presentation instead, which costs
        // the engine nothing - otherwise a 4K monitor would ask it to shade four times the pixels
        // of a 1080p one. Scaling by sqrt of the overshoot lands exactly on the cap.
        const pixels: number = (winW / scale) * (winH / scale);
        if (pixels > ScreenMode.MAX_FRAME_PIXELS) {
            scale *= Math.sqrt(pixels / ScreenMode.MAX_FRAME_PIXELS);
        }
        ScreenMode.frameScale = scale;
        ScreenMode.applySizeSettled(Math.round(winW / scale), Math.round(winH / scale));
        ScreenMode.applyCssFill(winW, winH);
    }

    /** Frame-buffer ceiling for resizable mode: 1920x1080 worth of pixels. */
    private static readonly MAX_FRAME_PIXELS: number = 1920 * 1080;

    private static bindListeners(): void {
        if (ScreenMode.listenersBound || typeof document === 'undefined') {
            return;
        }
        ScreenMode.listenersBound = true;
        const invalidate = (): void => {
            ScreenMode.appliedCss = '';
            ScreenMode.insetsRead = false;
        };
        // A window resize changes what "fit" means, so re-resolve on the next frame.
        globalThis.addEventListener?.('resize', invalidate);
        globalThis.addEventListener?.('orientationchange', invalidate);
        // The soft keyboard does NOT change innerHeight on iOS and fires no resize - only the
        // visual viewport reflects it. Without these the frame keeps sizing itself to a window
        // that is half covered by a keyboard.
        globalThis.visualViewport?.addEventListener('resize', invalidate);
    }

    // ---- resize settling ----------------------------------------------------

    /**
     * A rotation, or a dragged desktop window edge, emits a burst of intermediate sizes, and every
     * distinct one would reallocate the master PixMap (a megabytes-large Int32Array). So the
     * BACKING STORE only follows once a size has held still briefly; the CSS presentation follows
     * immediately, which means the interim is a momentarily stretched frame rather than a black
     * one. Pointer mapping is unaffected either way — it divides by the canvas' bounding rect, so
     * it stays correct while the two disagree.
     */
    private static readonly RESIZE_SETTLE_MS: number = 150;
    private static pendingW: number = 0;
    private static pendingH: number = 0;
    private static pendingAt: number = 0;

    private static applySizeSettled(w: number, h: number): void {
        if (GameShell.sWid === w && GameShell.sHei === h) {
            ScreenMode.pendingW = 0;
            return;
        }
        const now: number = performance.now();
        if (w !== ScreenMode.pendingW || h !== ScreenMode.pendingH) {
            ScreenMode.pendingW = w;
            ScreenMode.pendingH = h;
            ScreenMode.pendingAt = now;
            return;
        }
        if (now - ScreenMode.pendingAt < ScreenMode.RESIZE_SETTLE_MS) {
            return;
        }
        ScreenMode.pendingW = 0;
        ScreenMode.applySize(w, h);
        // A new backing store presents at its own pixel size until told otherwise.
        ScreenMode.appliedCss = '';
    }

    // ---- safe area ----------------------------------------------------------

    private static probe: HTMLElement | null = null;
    private static insetsRead: boolean = false;
    private static cssInsets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

    /**
     * The device's safe-area insets, in FRAME pixels, for MobileLayout to pad the HUD with.
     *
     * Worth knowing which edges these actually are: on a notched iPhone held sideways — the only
     * way this client is playable — the insets are the SIDES (44-62pt on the notch side) plus 21pt
     * at the bottom for the home indicator. Top is ~0. So this is what keeps the minimap out from
     * under the Dynamic Island and keeps the tab row out of the strip where an upward flick sends
     * iOS to the home screen instead of dragging your item.
     *
     * Zero in fixed mode, where the frame is letterboxed and nothing reaches the glass anyway; and
     * zero on desktop, where `env()` resolves to 0 and this costs one cached style read.
     */
    static frameInsets(): SafeInsets {
        const i: SafeInsets = ScreenMode.safeInsets();
        if (i === NO_SAFE) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }
        const s: number = ScreenMode.frameScale > 0 ? ScreenMode.frameScale : 1;
        return {
            top: Math.round(i.top / s),
            right: Math.round(i.right / s),
            bottom: Math.round(i.bottom / s),
            left: Math.round(i.left / s)
        };
    }

    /**
     * How much of the SIDE safe area the HUD actually keeps, 0..1.
     *
     * iOS reports a horizontal inset on a notched phone in landscape, and this client honoured all
     * of it — which on a Pro Max is ~60pt held back on each side, a visible band of dead screen
     * between the HUD and the glass on both edges. Whether that band is really unusable depends on
     * something no API tells us: which side the notch is on. Both insets come back non-zero, and
     * guessing wrong does not cost a margin, it puts the minimap under the notch.
     *
     * So it is a dial rather than a decision. Full is the safe default and what iOS asks for; None
     * reclaims the lot and is correct on a device with no notch or with the cutout on the other
     * side; Half is the compromise. You can see the answer on your own screen in one tap, which is
     * more than this code can do.
     *
     * The BOTTOM inset is never scaled. That one is the home indicator, and a control under it is
     * not merely close to the edge — an upward flick there sends iOS home instead of pressing it.
     */
    static edgeMargin: number = 1;

    static setEdgeMargin(value: number): void {
        ScreenMode.edgeMargin = Math.min(1, Math.max(0, value));
        ScreenMode.appliedCss = '';
        ScreenMode.insetsRead = false;
    }

    /** The measured insets in CSS pixels, with the side dial applied. `NO_SAFE` when there is no safe area to honour. */
    static safeInsets(): SafeInsets {
        if (!ScreenMode.resizable || !ScreenMode.gameFrame) {
            return NO_SAFE;
        }
        ScreenMode.readInsets();
        const i: SafeInsets = ScreenMode.cssInsets;
        const m: number = ScreenMode.edgeMargin;
        return {
            top: i.top,
            right: Math.round(i.right * m),
            bottom: i.bottom,
            left: Math.round(i.left * m)
        };
    }

    /**
     * `env(safe-area-inset-*)` cannot be read from script directly. The standard way round it is a
     * throwaway element whose PADDING is set from the env vars, read back through
     * getComputedStyle. It has to be laid out for that to resolve, so it is `visibility:hidden`
     * and zero-sized rather than `display:none`.
     *
     * Cached, and invalidated on resize/orientationchange, because getComputedStyle forces layout
     * and this is on the per-frame path. Re-read rather than measured once: shipping iOS builds
     * have reported these wrong in both directions across versions, so they are not a constant.
     */
    private static readInsets(): void {
        if (ScreenMode.insetsRead || typeof document === 'undefined' || !document.body) {
            return;
        }
        ScreenMode.insetsRead = true;
        let probe: HTMLElement | null = ScreenMode.probe;
        if (probe === null) {
            probe = document.createElement('div');
            probe.style.cssText =
                'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) ' + 'env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
            document.body.appendChild(probe);
            ScreenMode.probe = probe;
        }
        const style: CSSStyleDeclaration = getComputedStyle(probe);
        // Clamped: a bad reading that pushed the whole HUD off the frame would be unrecoverable
        // from inside the game, and these have been reported wrong on shipping iOS builds.
        const clamp = (value: string): number => Math.min(80, Math.max(0, parseFloat(value) || 0));
        ScreenMode.cssInsets = {
            top: clamp(style.paddingTop),
            right: clamp(style.paddingRight),
            bottom: clamp(style.paddingBottom),
            left: clamp(style.paddingLeft)
        };
    }

    /** Resize the drawing surfaces: the canvas backing store and the master PixMap. */
    private static applySize(w: number, h: number): void {
        if (GameShell.sWid === w && GameShell.sHei === h) {
            return;
        }
        GameShell.sWid = w;
        GameShell.sHei = h;
        GameShell.canvas.width = w;
        GameShell.canvas.height = h;
        GlRenderer.resize(w, h);
        // A fresh PixMap re-points Pix2D at the new pixel array (its ctor binds).
        GameShell.drawArea = new PixMap(h, w, GameShell.ctx);
        GameShell.fullredraw = true;
        ScreenMode.onSurfaceChange?.();
        ScreenMode.onChange?.();
    }

    // ---- CSS presentation --------------------------------------------------

    private static appliedCss: string = '';

    /**
     * Resizable mode fills the window edge to edge. The backing store is already sized for it, so
     * this is a 1:1 present on desktop and a small uniform downscale on a phone (a 1091x503 frame
     * presented at 852x393), never a letterbox.
     */
    private static applyCssFill(winW: number, winH: number): void {
        const canvas = GameShell.canvas;
        if (!canvas) {
            return;
        }
        // Keyed on the backing store too: the store settles a beat after the window (see
        // applySizeSettled), and the scale - hence the smoothing decision - changes when it does.
        const key = 'fill' + winW + 'x' + winH + '@' + GameShell.sWid + 'x' + GameShell.sHei;
        if (key === ScreenMode.appliedCss) {
            return;
        }
        ScreenMode.appliedCss = key;
        const cssW = winW + 'px';
        const cssH = winH + 'px';
        canvas.style.width = cssW;
        canvas.style.height = cssH;
        GlRenderer.setCssSize(cssW, cssH);
        ScreenMode.applyPresentation(GameShell.sWid > 0 ? winW / GameShell.sWid : 1, true);
    }

    /**
     * Fixed mode: scale the 765x503 backing store to fit the window, preserving aspect. A pure
     * browser scale, which is why it costs the engine nothing.
     */
    private static applyCssFit(): void {
        const canvas = GameShell.canvas;
        if (!canvas) {
            return;
        }
        // tick() runs this every frame; writing the same style back would thrash layout, so the
        // resolved values are memoised and only written on a real change.
        const key = 'fit' + (globalThis.innerWidth ?? 0) + 'x' + (globalThis.innerHeight ?? 0);
        if (key === ScreenMode.appliedCss) {
            return;
        }
        ScreenMode.appliedCss = key;
        // The 16px side margin and the button strip are desktop allowances: room for the page
        // gutter and the settings button below the frame. On a phone both are expensive — 16px
        // is 4% of a 393px-wide viewport — and the mobile buttons live in their own bar that
        // the flex layout already accounts for. So touch devices fit to the raw viewport.
        const touch = 'ontouchstart' in globalThis || (globalThis.navigator?.maxTouchPoints ?? 0) > 0;
        const availW = (globalThis.innerWidth ?? ScreenMode.FIXED_W) - (touch ? 0 : 16);
        const availH = (globalThis.innerHeight ?? ScreenMode.FIXED_H) - (touch ? ScreenMode.MOBILE_STRIP : ScreenMode.BUTTON_STRIP);
        let scale = Math.min(availW / ScreenMode.FIXED_W, availH / ScreenMode.FIXED_H);
        if (!Number.isFinite(scale) || scale <= 0) {
            scale = 1;
        }
        ScreenMode.frameScale = scale;
        const cssW = Math.round(ScreenMode.FIXED_W * scale) + 'px';
        const cssH = Math.round(ScreenMode.FIXED_H * scale) + 'px';
        canvas.style.width = cssW;
        canvas.style.height = cssH;
        // The GPU scene layer must scale with the frame, or it drifts out from under the HUD.
        GlRenderer.setCssSize(cssW, cssH);
        ScreenMode.applyPresentation(scale, false);
    }

    /**
     * `image-rendering: pixelated` is nearest-neighbour. That is exactly right when the frame is
     * being blown UP — it is what keeps the 2006 art crisp instead of blurry — and it is
     * destructive when the frame is being SHRUNK, because nearest-neighbour downscaling does not
     * average, it deletes. Presenting 765x503 on an iPhone means a 0.7 scale, i.e. throwing away
     * roughly three rows in ten of every glyph in a 12px font. Ask the browser to resample
     * instead whenever the presentation is a downscale.
     *
     * Written as a body attribute rather than an inline style so one write covers both the 2D
     * frame and the GPU scene layer under it (see the rule in public/index.html).
     */
    private static applyPresentation(scale: number, fill: boolean): void {
        if (typeof document === 'undefined' || !document.body) {
            return;
        }
        document.body.setAttribute('data-smooth', scale < 0.999 ? 'on' : 'off');
        // Presented CSS pixels per FRAME pixel, for CSS that has to line up with something drawn
        // inside the canvas. The DOM chrome needs it: "just left of the tab row" is 269 frame
        // pixels in from the right, and only this turns that into a CSS length. Written on the
        // same memoised path as the attributes above, so it costs nothing per frame.
        // `ScreenMode.frameScale` is the same number for code inside the canvas that has to line up
        // with this chrome — the hotkey column uses it. It is already set on both sizing paths, so
        // it is deliberately NOT written here: one value, two writers, and this would be a third.
        document.body.style.setProperty('--frame-scale', String(scale));
        // The page around the frame has to change shape too: fitted mode letterboxes a centred
        // frame and parks the DOM chrome in the strip below it, while filled mode gives the canvas
        // the whole window and leaves nothing under it - so the chrome has to become an overlay.
        // That is a CSS decision, so it is published as an attribute rather than made here (see
        // the [data-layout] rules in public/index.html).
        //
        // `fill` is which path actually RAN, not `ScreenMode.resizable`. Those differ whenever the
        // preference is on but the title screen is up, and reading the preference there stripped
        // the page's centring and floated the chrome over a frame that was still letterboxed.
        document.body.setAttribute('data-layout', fill ? 'fill' : 'fit');
    }

    // ---- half-res scene scratch -------------------------------------------

    private static sceneBuffer: Int32Array | null = null;
    private static sceneBufferW: number = 0;
    private static sceneBufferH: number = 0;

    /** Point Pix2D at the half-res scene scratch (clip = the whole scratch). */
    static bindSceneBuffer(w: number, h: number): void {
        if (ScreenMode.sceneBuffer === null || ScreenMode.sceneBufferW !== w || ScreenMode.sceneBufferH !== h) {
            ScreenMode.sceneBuffer = new Int32Array(w * h + 1);
            ScreenMode.sceneBufferW = w;
            ScreenMode.sceneBufferH = h;
        }
        Pix2D.setPixels(ScreenMode.sceneBuffer, w, h);
    }

    /**
     * Nearest-neighbour upscale of the scene scratch into the frame rect at (x, y). Row-doubling
     * keeps the second row of each pair a straight memory copy.
     */
    static blitSceneBuffer(frame: Int32Array, frameWidth: number, x: number, y: number, scale: number): void {
        const src = ScreenMode.sceneBuffer;
        if (src === null) {
            return;
        }
        const sw = ScreenMode.sceneBufferW;
        const sh = ScreenMode.sceneBufferH;
        for (let row = 0; row < sh; row++) {
            let si = row * sw;
            let di = (y + row * scale) * frameWidth + x;
            for (let col = 0; col < sw; col++) {
                const p = src[si++];
                for (let k = 0; k < scale; k++) {
                    frame[di + k] = p;
                }
                di += scale;
            }
            for (let k = 1; k < scale; k++) {
                frame.copyWithin(di - sw * scale + frameWidth * k, di - sw * scale, di);
            }
        }
    }
}
