import { Client } from '#/client/Client.js';
import HudSkin from '#/client/HudSkin.js';
import MobileKeyboard from '#/client/MobileKeyboard.js';
import MobileLayout from '#/client/MobileLayout.js';

/**
 * Touch gestures for mobile: drag to turn the camera, long-press for the right-click menu,
 * pinch to zoom, and whatever fullscreen this platform is willing to give us.
 *
 * NOTHING HERE REIMPLEMENTS GAME INPUT. The client already knows how to rotate the camera
 * from a middle-button drag (ClientMouseListener.middleDown), how to open the menu from a
 * right press (mousePressed treats button 2 as the menu button) and how to zoom from a wheel
 * (ClientMouseWheelListener). All of them already handle fullscreen coordinate mapping. So a
 * gesture is translated into the event that already means that thing and dispatched at the
 * canvas — one implementation of each behaviour, not two.
 *
 * TAP VERSUS DRAG VERSUS HOLD. Mobile browsers already synthesise mousedown/move/up/click
 * from one finger, which is why tap-to-walk works with no code. That path is left alone for
 * taps. A finger that travels past DRAG_SLOP becomes a camera turn; a finger that stays put
 * for LONG_PRESS_MS becomes the menu. Both cancel the browser's synthetic click so a turn or
 * a menu cannot also walk you somewhere.
 */
export default class MobileTouch {
    /** Pixels a finger must travel before a tap becomes a camera drag. */
    private static readonly DRAG_SLOP = 10;
    /** Hold this long without moving and it is a right-click instead of a tap. */
    private static readonly LONG_PRESS_MS = 450;
    /** Pixels of pinch travel per wheel notch. */
    private static readonly PINCH_STEP = 40;
    /** Pixels of finger travel per scroll notch when dragging an interface. */
    private static readonly SCROLL_STEP = 18;

    private static canvas: HTMLCanvasElement | null = null;
    private static dragging: boolean = false;
    private static longPressed: boolean = false;
    private static longPressTimer: number = 0;
    private static startX: number = 0;
    private static startY: number = 0;
    private static pinchDistance: number = 0;
    private static pinching: boolean = false;
    /** map_clock-ish deadline: browser compatibility mouse events are swallowed until this. */
    private static swallowUntil: number = 0;
    /**
     * The class a toggle button carries while the thing it toggles is on screen.
     *
     * A CLASS, not an inline background, which is the whole reason this is one line. The buttons
     * in the stack are built in two different files and the same button is styled differently in
     * the two layouts, so an inline fill — which beats every stylesheet rule — would have forced
     * both files to know about both layouts. See `#mobile-bar button` in public/index.html.
     */
    private static readonly LIT_CLASS: string = 'hud-on';

    /**
     * The stack icons.
     *
     * Chat and Fullscreen are the hand-authored pixel glyphs, baked into `HudArtData` and used as
     * `data:` URIs. They are drawn to the same 24px box and the same 1px outline rule as the tab
     * icons — the art tool imports that rule rather than restating it — so the drawn HUD and the
     * DOM chrome now share an icon language as well as a palette.
     *
     * Add-to-Home keeps an inline SVG: no glyph was authored for it, and it only ever appears on
     * platforms with no Fullscreen API. `glyphUri` returns an empty string for art that was never
     * baked, so a missing glyph degrades to an empty button rather than a broken-image icon.
     */
    private static glyphImg(name: string, size: number): string {
        const uri: string = HudSkin.glyphUri(name);
        return uri === '' ? '' : `<img src="${uri}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
    }

    private static readonly ICON_INSTALL: string =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>';

    private static scrollDrag: boolean = false;
    private static scrollAnchorY: number = 0;

    static isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /** Already launched from the home screen — there is no browser chrome left to hide. */
    static isStandalone(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    }

    private static canFullscreen(): boolean {
        return typeof document.documentElement.requestFullscreen === 'function';
    }

    static init(canvas: HTMLCanvasElement, host: HTMLElement): void {
        if (!MobileTouch.isTouchDevice() || MobileTouch.canvas) {
            return;
        }
        MobileTouch.canvas = canvas;
        // Widens the context-menu hit targets — see the touch-assist block in Client.mouseLoop.
        Client.touchInput = true;

        // touch-action:none tells the browser these gestures are ours. Without it Safari claims
        // the pinch for page zoom before a touchmove handler sees it, and scrolling steals
        // vertical drags. The callout/select rules stop iOS popping its own text-selection
        // magnifier on a long press, which would fight the menu.
        canvas.style.touchAction = 'none';
        canvas.style.webkitUserSelect = 'none';
        canvas.style.userSelect = 'none';
        canvas.style.setProperty('-webkit-touch-callout', 'none');

        // Non-passive: these must be cancellable or preventDefault is a no-op.
        canvas.addEventListener('touchstart', MobileTouch.onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', MobileTouch.onTouchMove, { passive: false });
        canvas.addEventListener('touchend', MobileTouch.onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', MobileTouch.onTouchEnd, { passive: false });

        // CAPTURE on document, so this runs before the canvas' own onmousedown/onclick property
        // handlers and can stop them ever seeing the event. See swallowSynthetic.
        document.addEventListener('mousedown', MobileTouch.swallowSynthetic, true);
        document.addEventListener('mouseup', MobileTouch.swallowSynthetic, true);
        document.addEventListener('click', MobileTouch.swallowSynthetic, true);

        // Safari's own pinch (the one that zooms the PAGE) arrives as `gesture*`, which is not
        // covered by touch-action and fires even with user-scalable=no. Without this both zooms
        // happen at once: the camera pulls back and the whole browser scales with it.
        for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
            document.addEventListener(type, (event: Event): void => event.preventDefault(), { passive: false });
        }

        MobileTouch.addButtons(host);
        MobileTouch.keepAwake();
        MobileTouch.maybePromptInstall();
    }

    // -----------------------------------------------------------------------------------
    // Staying awake
    // -----------------------------------------------------------------------------------

    private static wakeLock: { release: () => Promise<void> } | null = null;

    /**
     * Hold a screen wake lock so the phone does not dim mid-fight.
     *
     * Feature-detected, never version-compared: the API's availability differs between Safari the
     * browser and a home-screen web app, and has moved more than once. `'wakeLock' in navigator`
     * is the only check that stays true.
     *
     * Re-acquired on `visibilitychange` because the lock is released automatically whenever the
     * page is hidden — without the re-acquire it only works until the first time you switch apps.
     * The request must also follow a user gesture on some builds, so it is retried on first touch
     * as well as at boot.
     */
    private static keepAwake(): void {
        const nav = navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
        if (!nav.wakeLock) {
            return;
        }
        const acquire = (): void => {
            if (MobileTouch.wakeLock || document.visibilityState !== 'visible') {
                return;
            }
            nav.wakeLock
                ?.request('screen')
                .then((lock): void => {
                    MobileTouch.wakeLock = lock;
                })
                .catch((): void => {
                    /* refused (not visible, low battery, no gesture yet) - retried on the next one */
                });
        };
        document.addEventListener('visibilitychange', (): void => {
            MobileTouch.wakeLock = null;
            acquire();
        });
        document.addEventListener('touchend', acquire, { passive: true });
        acquire();
    }

    // -----------------------------------------------------------------------------------
    // Install nudge
    // -----------------------------------------------------------------------------------

    private static readonly INSTALL_SEEN = 'rune465.installPrompted';

    /**
     * On first run, tell the player how to install — once, and only where it is the ONLY route to
     * a chromeless game.
     *
     * The condition is a capability test rather than a UA sniff, and it is exactly right: if we
     * are not already standalone AND the platform has no Fullscreen API, then Add to Home Screen
     * is the only thing left. That is true on iPhone Safari and false on Android Chrome, without
     * either being named.
     *
     * It is not polish. iOS has no install prompt of its own and Safari shows no banner, so every
     * benefit of the home-screen app — no browser chrome, the wake lock, and settings that are not
     * deleted after a week of ITP storage eviction — is gated behind a four-tap Share-sheet flow
     * the player has no reason to guess at.
     */
    private static maybePromptInstall(): void {
        if (MobileTouch.isStandalone() || MobileTouch.canFullscreen()) {
            return;
        }
        try {
            if (globalThis.localStorage?.getItem(MobileTouch.INSTALL_SEEN) === '1') {
                return;
            }
            globalThis.localStorage?.setItem(MobileTouch.INSTALL_SEEN, '1');
        } catch {
            // private mode: show it, every time, rather than not at all
        }
        MobileTouch.showHomeScreenHelp();
    }

    // -----------------------------------------------------------------------------------
    // Gestures
    // -----------------------------------------------------------------------------------

    private static readonly onTouchStart = (event: TouchEvent): void => {
        // >= 2, not === 2. A third finger landing used to match neither branch, so `pinching`
        // stayed latched with the distance measured between the ORIGINAL two - and dropping back
        // to two fingers then emitted a burst of zoom notches for travel that never happened.
        // Re-seeding on every extra finger makes the gesture restart cleanly instead.
        if (event.touches.length >= 2) {
            MobileTouch.cancelLongPress();
            MobileTouch.endDrag(event.touches[0]);
            MobileTouch.pinching = true;
            MobileTouch.pinchDistance = MobileTouch.distance(event.touches[0], event.touches[1]);
            event.preventDefault();
            return;
        }
        if (event.touches.length === 1) {
            MobileTouch.startX = event.touches[0].clientX;
            MobileTouch.startY = event.touches[0].clientY;
            MobileTouch.dragging = false;
            MobileTouch.longPressed = false;
            MobileTouch.longPressTimer = window.setTimeout(MobileTouch.onLongPress, MobileTouch.LONG_PRESS_MS);
            // Point the mouse at the finger NOW, not when the long press fires.
            //
            // The menu is built from Client.menuNumEntries, which the HOVER pass fills using
            // mouseX/mouseY — and those only advance in ClientMouseListener.cycle(), once per
            // client tick. Moving and pressing in the same turn meant the press was handled
            // against hover data gathered at the PREVIOUS position, so the menu offered whatever
            // was under the last place you touched — in practice just "Walk here".
            //
            // Sent here, the pick pass has the whole LONG_PRESS_MS (about seven ticks) to run at
            // this position, so by the time the press lands the entries describe what is
            // actually under the finger. It also makes the top-left hint track your finger while
            // you hold, which is the feedback that tells you what you are about to get.
            MobileTouch.dispatchMouse('mousemove', MobileTouch.startX, MobileTouch.startY, 0);
            // Deliberately NOT prevented: this may still be a tap, and the browser's synthetic
            // click is what makes tap-to-walk work.
        }
    };

    /**
     * Held still long enough — open the menu. Dispatched as a right press, which is what
     * mousePressed reads (`event.button === 2` sets nextMouseButton = 2, the menu button).
     *
     * The move first is not optional: mousePressed uses the coordinates it computes from THIS
     * event, but the menu opens at the tracked mouse position, so the position has to be
     * current before the press lands.
     */
    private static readonly onLongPress = (): void => {
        MobileTouch.longPressTimer = 0;
        MobileTouch.longPressed = true;
        MobileTouch.dispatchMouse('mousemove', MobileTouch.startX, MobileTouch.startY, 0);
        MobileTouch.dispatchMouse('mousedown', MobileTouch.startX, MobileTouch.startY, 2);
        MobileTouch.dispatchMouse('mouseup', MobileTouch.startX, MobileTouch.startY, 2);
    };

    private static cancelLongPress(): void {
        if (MobileTouch.longPressTimer) {
            clearTimeout(MobileTouch.longPressTimer);
            MobileTouch.longPressTimer = 0;
        }
    }

    private static readonly onTouchMove = (event: TouchEvent): void => {
        if (MobileTouch.pinching && event.touches.length === 2) {
            const distance = MobileTouch.distance(event.touches[0], event.touches[1]);
            const delta = distance - MobileTouch.pinchDistance;
            if (Math.abs(delta) >= MobileTouch.PINCH_STEP) {
                const notches = Math.trunc(delta / MobileTouch.PINCH_STEP);
                MobileTouch.pinchDistance += notches * MobileTouch.PINCH_STEP;
                // Point the mouse at the pinch centre before the wheel lands. Client.followCamera
                // only claims a wheel notch when the TRACKED position is inside the 3D viewport,
                // and otherwise Client.doScrollbar gets it. Without this the pinch was judged
                // against wherever you last tapped, so pinching after touching the inventory
                // scrolled the inventory instead of zooming the camera.
                MobileTouch.dispatchMouse('mousemove', (event.touches[0].clientX + event.touches[1].clientX) / 2, (event.touches[0].clientY + event.touches[1].clientY) / 2, 0);
                // Fingers apart = zoom in, and wheel-up (negative deltaY) is zoom in.
                MobileTouch.dispatchWheel(-notches * 100);
            }
            event.preventDefault();
            return;
        }

        if (event.touches.length !== 1 || MobileTouch.longPressed) {
            return;
        }
        const touch = event.touches[0];

        if (!MobileTouch.dragging) {
            const moved = Math.abs(touch.clientX - MobileTouch.startX) + Math.abs(touch.clientY - MobileTouch.startY);
            if (moved < MobileTouch.DRAG_SLOP) {
                return;
            }
            MobileTouch.cancelLongPress();
            MobileTouch.dragging = true;
            // Where the finger started decides what the drag MEANS. Over the 3D viewport it is a
            // camera turn; anywhere else it is a scroll, because everywhere else is interface.
            //
            // Scrolling reuses the wheel: Client.doScrollbar already scrolls whichever component
            // the pointer is over when mouseWheelRotation is non-zero, so emitting wheel notches
            // scrolls the room-build list, the bank, quest lists — anything with a scrollbar —
            // with no per-interface work. Client.viewportX/Y/W/H are captured every frame by the
            // ct-1337 branch, so this follows the viewport wherever it is.
            //
            // Caveat in resizable mode: the viewport is the whole window and interfaces draw over
            // it, so this test says "world" everywhere and drags stay camera turns. Slice 2 gives
            // the panels their own hit regions, which is what will fix that properly.
            //
            // There used to be a `startX !== 0 &&` guard in front of this. It was never explained
            // and it does harm: startX is written on every single-finger touchstart, so the only
            // thing it excluded was a finger landing at exactly clientX 0. That is off-canvas
            // while the frame is centred, but it is the entire left edge of the game once the
            // canvas is flush to the window - where it silently forced a camera turn.
            MobileTouch.scrollDrag = !MobileTouch.pointInViewport(MobileTouch.startX, MobileTouch.startY);
            if (MobileTouch.scrollDrag) {
                MobileTouch.scrollAnchorY = MobileTouch.startY;
            }
            // THE MOVE BEFORE THE PRESS IS THE WHOLE TRICK. mousePressed returns early for the
            // middle button and captures middleLastX/Y from nextMouseX/nextMouseY — the last
            // position a move or enter event recorded. On touch nothing has moved the mouse, so
            // that was stale (wherever you last tapped, or -1 before you ever had), and every
            // drag started measuring from that fixed point instead of from your finger. Which
            // is why the camera always swung to the same place. Sending a move first puts the
            // real origin in before the press reads it.
            MobileTouch.dispatchMouse('mousemove', MobileTouch.startX, MobileTouch.startY, 0);
            MobileTouch.dispatchMouse('mousedown', MobileTouch.startX, MobileTouch.startY, 1);
        }
        if (MobileTouch.scrollDrag) {
            const delta = MobileTouch.scrollAnchorY - touch.clientY;
            if (Math.abs(delta) >= MobileTouch.SCROLL_STEP) {
                const notches = Math.trunc(delta / MobileTouch.SCROLL_STEP);
                MobileTouch.scrollAnchorY -= notches * MobileTouch.SCROLL_STEP;
                // Drag UP moves the content up, i.e. scrolls down — the direct-manipulation
                // convention every touch UI uses, and the opposite sign to a mouse wheel.
                MobileTouch.dispatchWheel(notches * 100);
            }
            event.preventDefault();
            return;
        }
        MobileTouch.dispatchMouse('mousemove', touch.clientX, touch.clientY, 1);
        event.preventDefault();
    };

    /**
     * A client (CSS) point in FRAME pixels — the coordinate space every component rect is in.
     *
     * Divides by the canvas' own bounding rect, so it is correct in both display modes and at any
     * presentation scale without knowing which one is live.
     */
    private static toFrame(clientX: number, clientY: number): { x: number; y: number } | null {
        const canvas = MobileTouch.canvas;
        if (!canvas) {
            return null;
        }
        const bounds = canvas.getBoundingClientRect();
        return {
            x: (clientX - bounds.left) * (canvas.width / bounds.width),
            y: (clientY - bounds.top) * (canvas.height / bounds.height)
        };
    }

    /**
     * Is this client point on the WORLD rather than on a HUD panel?
     *
     * This used to test `Client.viewportX/Y/W/H` alone, and in the resizable layout that rect is
     * the whole frame — so it said "world" everywhere, every drag became a camera turn and no
     * interface could be scroll-dragged at all. `Client.pointOverScene` subtracts the anchored HUD
     * rects, which is the distinction the fixed frame used to get for free from its 512x334 hole.
     */
    private static pointInViewport(clientX: number, clientY: number): boolean {
        const point = MobileTouch.toFrame(clientX, clientY);
        if (point === null) {
            return true;
        }
        return Client.pointOverScene(point.x, point.y);
    }

    private static readonly onTouchEnd = (event: TouchEvent): void => {
        MobileTouch.cancelLongPress();

        if (MobileTouch.pinching && event.touches.length < 2) {
            MobileTouch.pinching = false;
            MobileTouch.pinchDistance = 0;
            // Lifting one finger of a pinch fires NO fresh touchstart for the finger still down,
            // so startX/startY would still hold the anchor from before the pinch began. The next
            // touchmove then measures DRAG_SLOP against that stale point, clears it immediately,
            // and opens a camera drag anchored wherever you last tapped - the camera snapping to
            // a fixed place after every zoom. Re-seed from the surviving finger.
            const remaining: Touch | undefined = event.touches[0];
            if (remaining) {
                MobileTouch.startX = remaining.clientX;
                MobileTouch.startY = remaining.clientY;
            }
            event.preventDefault();
            return;
        }
        if (MobileTouch.dragging) {
            MobileTouch.endDrag(event.changedTouches[0]);
            event.preventDefault();
            return;
        }
        if (MobileTouch.longPressed) {
            // The menu is open; swallow the synthetic click that would dismiss it or walk the
            // player to wherever they were holding.
            MobileTouch.longPressed = false;
            event.preventDefault();
            MobileTouch.holdMenuOpen();
            return;
        }
        // A plain tap on a text field raises the keyboard, the way RuneScape's own mobile client
        // does — the chatbox in game, the username/password band on the login screen. Deliberately
        // NOT prevented: the synthetic click still goes through, so tapping a name in the chat, or
        // selecting which login field you meant, keeps working. This only adds the keyboard.
        //
        // It has to happen here rather than off the synthetic click, because iOS only honours
        // focus() inside a real user gesture and a dispatched click is not one. That is also why
        // there is no longer a Keyboard button: this is the whole route in.
        MobileTouch.maybeTypeOnTap(event.changedTouches[0]);
    };

    /** Text field tapped, and the keyboard is not already up? Raise it. */
    private static maybeTypeOnTap(touch: Touch | undefined): void {
        if (touch === undefined || MobileKeyboard.isOpen()) {
            return;
        }
        const point = MobileTouch.toFrame(touch.clientX, touch.clientY);
        if (point !== null && Client.wantsTextInput(point.x, point.y)) {
            // open() arms the focus hold itself, which swallowSynthetic then reads — see the
            // note there. Without it the keyboard closes in the same breath it opened.
            MobileKeyboard.open();
        }
    }

    /**
     * Eats the browser's compatibility mouse events for a moment after a long press.
     *
     * THIS is what was closing the menu, not the pointer leaving. After a touch sequence the
     * browser synthesises mousedown/mouseup/click, and ClientMouseListener.mousePressed sets
     * nextMouseClickButton = 1 for a LEFT press — so the compatibility mousedown alone is
     * enough for Client.mouseLoop's `button === 1` branch to pick an option and shut the menu.
     * The finger had barely left the glass.
     *
     * preventDefault on touchend does not reliably suppress those on iOS; suppressing them
     * properly means preventing touchstart, which cannot be done here because tap-to-walk
     * depends on the very same synthetic click. So they are swallowed after the fact instead.
     *
     * isTrusted is what separates them from ours: events the browser generates are trusted,
     * events dispatched from script are not. So this cannot eat the right-press the long-press
     * itself sends, nor the drag's middle-button stream.
     */
    private static readonly swallowSynthetic = (event: MouseEvent): void => {
        if (!event.isTrusted) {
            return;
        }
        const now: number = performance.now();
        // THE KEYBOARD-OPENS-THEN-SHUTS FIX.
        //
        // GameShell gives the canvas `tabIndex = -1`, which makes it CLICK-FOCUSABLE. So the
        // compatibility mousedown that follows every tap moves DOM focus to the canvas — off the
        // hidden input we just focused — and iOS dismisses the keyboard in the same breath it
        // raised it. The old Keyboard button never hit this because its own pointerdown handler
        // called preventDefault for exactly this reason; tapping the chatbox has no button to do
        // that on, so it has to be done here.
        //
        // preventDefault on mousedown suppresses the focus transfer and nothing else. Note it is
        // deliberately WITHOUT stopPropagation, unlike the swallow below: the client must still
        // receive this click, so that tapping a name in the chat, or choosing which login field
        // you meant, keeps working.
        if (event.type === 'mousedown' && MobileKeyboard.holdingFocus()) {
            event.preventDefault();
        }
        if (now > MobileTouch.swallowUntil) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
    };

    /**
     * Keeps the right-click menu up after the finger lifts.
     *
     * Client.mouseLoop dismisses an open menu as soon as the TRACKED mouse position drifts
     * more than 10px outside the menu box — the desktop behaviour where sliding the pointer
     * off the menu closes it. Lifting a finger fires the canvas' mouseleave, and mouseExited
     * sets nextMouseX/nextMouseY to -1, which is outside everything. So the menu opened and
     * vanished in the same breath.
     *
     * preventDefault on touchend suppresses the compatibility click but not the pointer
     * leaving, so the position has to be put back. Re-asserting it over the next few frames
     * outlasts whichever synthetic event arrives, and parks the cursor on the press point —
     * which is inside the menu, since the menu is drawn centred on it.
     */
    private static holdMenuOpen(): void {
        // Long enough to cover the compatibility burst that follows a touch sequence, short
        // enough that the player's NEXT deliberate tap — picking an option off the menu — is a
        // real click again and gets through.
        MobileTouch.swallowUntil = performance.now() + 350;
        const x = MobileTouch.startX;
        const y = MobileTouch.startY;
        const reassert = (): void => MobileTouch.dispatchMouse('mousemove', x, y, 0);
        reassert();
        requestAnimationFrame(reassert);
        window.setTimeout(reassert, 50);
        window.setTimeout(reassert, 150);
    }

    /**
     * THE MOUSEUP IS NOT OPTIONAL, WHATEVER KIND OF DRAG THIS WAS.
     *
     * onTouchMove sends the middle-button mousedown before it knows whether the drag is a camera
     * turn or an interface scroll, so a scroll drag presses the middle button too. This used to
     * return early for those and never release it, and ClientMouseListener.middleDown is cleared
     * in exactly one place - mouseReleased for button 1. So one scroll of the bank latched it true
     * for the rest of the session.
     *
     * What that looks like in game is the camera tearing off on some LATER, unrelated tap: with
     * middleDown stuck, every mouseleave writes nextMouseX/nextMouseY = -1, and followCamera reads
     * the jump from the last real position to -1 as a yaw delta of well over a thousand units.
     */
    private static endDrag(touch: Touch | undefined): void {
        if (!MobileTouch.dragging) {
            return;
        }
        MobileTouch.dragging = false;
        MobileTouch.scrollDrag = false;
        const x = touch ? touch.clientX : MobileTouch.startX;
        const y = touch ? touch.clientY : MobileTouch.startY;
        MobileTouch.dispatchMouse('mouseup', x, y, 1);
    }

    private static distance(a: Touch, b: Touch): number {
        const dx = a.clientX - b.clientX;
        const dy = a.clientY - b.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private static dispatchMouse(type: string, clientX: number, clientY: number, button: number): void {
        const canvas = MobileTouch.canvas;
        if (!canvas) {
            return;
        }
        let buttons = 0;
        if (button === 1) {
            buttons = 4; // middle-button bit
        } else if (button === 2) {
            buttons = 2; // right-button bit
        }
        canvas.dispatchEvent(new MouseEvent(type, { clientX, clientY, button, buttons, bubbles: true, cancelable: true }));
    }

    private static dispatchWheel(deltaY: number): void {
        const canvas = MobileTouch.canvas;
        if (!canvas) {
            return;
        }
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY, deltaMode: WheelEvent.DOM_DELTA_PIXEL, bubbles: true, cancelable: true }));
    }

    // -----------------------------------------------------------------------------------
    // Buttons
    // -----------------------------------------------------------------------------------

    /**
     * The DOM chrome: one stack of icon buttons on the LEFT EDGE, with ControlBar's gear as its
     * bottom entry.
     *
     * Everything that could be taken away has been. The Keyboard button is gone entirely — tapping
     * a text field raises the keyboard (see MobileKeyboard). Fullscreen/Add-to-Home only exists
     * where there is browser chrome to escape, so a home-screen install never sees it.
     *
     * WHY THE LEFT EDGE, and why they are together again after being deliberately split apart:
     * both corners the split used are now occupied. Chat moved to the top-left, so the gear that
     * was parked there sat ON the chatbox; the bar was pinned 146px off the BOTTOM to sit above a
     * chat cluster that is no longer down there, which left it floating in mid-air over the world.
     * The left edge between the chat cluster and the multiway icon is the one strip of frame no
     * HUD piece claims, and a single column of equal icons is what the reference layout puts
     * there. See the [data-layout='fill'] rules in public/index.html for the geometry.
     */
    private static addButtons(host: HTMLElement): void {
        const bar = document.createElement('div');
        // Named so the resizable layout can lift it off the page flow and float it inside the
        // safe area — in that mode the canvas is the whole window and there is no strip below the
        // frame to sit in. See the [data-layout='fill'] rules in public/index.html.
        bar.id = 'mobile-bar';
        // Direction and PADDING are NOT set here: fitted/windowed keeps this a row in a strip
        // under the frame and wants both, the fill layout makes it a column flush with the gear
        // below it and wants neither. Both belong in the CSS, and an inline value would win over
        // it — 6px of inline padding is exactly what put the stack's buttons 6px to the right of
        // the gear they are supposed to line up with.
        bar.style.cssText = 'display:flex;gap:8px;align-items:center;line-height:normal;';

        // The old "Big view" button lived here. It is gone because the thing it toggled is now a
        // real, persisted display mode - Settings -> Display -> Layout - which defaults to
        // Resizable on touch. A second unpersisted toggle for the same flag could only disagree
        // with the stored setting.

        // Chat show/hide. The sidebar's toggle is its own tab row (Client.ifButtonX -> tapTab), so
        // the chatbox is the one HUD cluster with nothing on screen that could collapse it.
        MobileTouch.chatButton = MobileTouch.makeButton('Hide chat', MobileTouch.glyphImg('ui_chat', 24), MobileTouch.onChatButton);
        bar.appendChild(MobileTouch.chatButton);

        // Nothing to offer if there is no chrome to escape.
        if (!MobileTouch.isStandalone()) {
            const full: boolean = MobileTouch.canFullscreen();
            bar.appendChild(MobileTouch.makeButton(full ? 'Fullscreen' : 'Add to Home', full ? MobileTouch.glyphImg('ui_fullscreen', 24) : MobileTouch.ICON_INSTALL, MobileTouch.onFullscreenButton));
        }
        // After #game in the document, so it stacks under the frame rather than on it.
        (host.parentElement ?? host).appendChild(bar);
        MobileTouch.buttonBar = bar;
        MobileTouch.syncChatButton();
        // Raising the keyboard with the chatbox collapsed would be typing blind — the overlay
        // chat lines show what arrives, never the line being composed. See MobileKeyboard.onOpen.
        MobileKeyboard.onOpen = (): void => MobileTouch.setChatOpen(true);
        MobileTouch.watchOrientation();
    }

    static chatButton: HTMLButtonElement | null = null;

    /**
     * Show/hide the chatbox and its mode bar. MobileLayout re-asserts the hide flags every frame,
     * so this only has to write the state — but the components it hides were painting where the
     * scene now has to, hence the repaint.
     */
    private static readonly onChatButton = (): void => MobileTouch.setChatOpen(!MobileLayout.chatOpen);

    /** Single entry point, so the button's lit state can never disagree with the layout's. */
    static setChatOpen(open: boolean): void {
        if (MobileLayout.chatOpen === open) {
            return;
        }
        MobileLayout.chatOpen = open;
        MobileTouch.syncChatButton();
        // The components being hidden were painting where the scene now has to.
        Client.redrawAllComponents();
    }

    /**
     * The icon never changes — the LIT background is what says the chatbox is up.
     *
     * The label used to flip between "Hide chat" and "Show chat" so the button said what the tap
     * would do. An icon cannot say that, so the state has to be visible instead: lit means the
     * thing it toggles is on screen, which is the same convention the selected side-tab cell uses.
     * The title keeps the words for anyone hovering with a mouse.
     */
    private static syncChatButton(): void {
        if (MobileTouch.chatButton !== null) {
            MobileTouch.chatButton.title = MobileLayout.chatOpen ? 'Hide chat' : 'Show chat';
            MobileTouch.chatButton.setAttribute('aria-label', MobileTouch.chatButton.title);
            MobileTouch.chatButton.classList.toggle(MobileTouch.LIT_CLASS, MobileLayout.chatOpen);
        }
    }

    static buttonBar: HTMLElement | null = null;

    /**
     * One button of the stack: an inline SVG glyph, with the words kept as the accessible name.
     *
     * Shape and colour are left to `#mobile-bar button` in public/index.html — see FRAME_FILL for
     * why they cannot be inline here.
     */
    private static makeButton(label: string, icon: string, onPress: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.innerHTML = icon;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.addEventListener('pointerdown', (event: PointerEvent): void => {
            event.preventDefault();
            onPress();
        });
        return button;
    }

    private static readonly onFullscreenButton = (): void => {
        if (MobileTouch.canFullscreen()) {
            MobileTouch.toggleFullscreen();
            return;
        }
        MobileTouch.showHomeScreenHelp();
    };

    static toggleFullscreen(): void {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }
        void document.documentElement.requestFullscreen().catch((): void => {
            /* refused by a permissions policy — leave the page as it is */
        });
    }

    /**
     * iPhone Safari does not implement the Fullscreen API at all, so there is no button we
     * can write that makes the browser chrome go away. Add to Home Screen is the only route,
     * and it genuinely is chromeless — the apple-mobile-web-app-* meta tags in index.html are
     * what make the launched page run standalone. Since it cannot be triggered from script,
     * the honest thing is to say so rather than ship a button that silently does nothing.
     */
    private static showHomeScreenHelp(): void {
        const existing = document.getElementById('mobile-help');
        if (existing) {
            existing.remove();
            return;
        }
        const panel = document.createElement('div');
        panel.id = 'mobile-help';
        panel.style.cssText =
            'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1000;' +
            'max-width:280px;padding:14px 16px;background:#2b2620;color:#fff;' +
            'border:1px solid #675a4a;border-radius:6px;font:13px Arial,Helvetica,sans-serif;line-height:1.45;';
        panel.innerHTML =
            '<b>Install for fullscreen</b><br><br>' +
            'Safari on iPhone has no fullscreen mode for web pages. To play properly:<br><br>' +
            '1. Tap <b>Share</b> (the box with an arrow)<br>' +
            '2. Tap <b>Add to Home Screen</b><br>' +
            '3. Open the game from the new icon, held sideways<br><br>' +
            'Launched that way there is no browser chrome at all, the screen will not dim while ' +
            'you play, and your settings and hotkeys stop being wiped after a week.<br><br>' +
            '<i>Tap this box to close.</i>';
        panel.addEventListener('pointerdown', (event: PointerEvent): void => {
            event.preventDefault();
            panel.remove();
        });
        document.body.appendChild(panel);
    }

    // -----------------------------------------------------------------------------------
    // Orientation
    // -----------------------------------------------------------------------------------

    private static orientationHinted: boolean = false;

    /**
     * A nudge towards landscape, shown once per portrait session.
     *
     * Deliberately a hint and NOT a blocking overlay. In the resizable layout portrait is no
     * longer broken — ScreenMode derives both frame axes from one uniform scale, so a phone held
     * upright gets a correct, undistorted 765x1658-ish frame. It is merely a bad shape to play in:
     * the minimap anchors top-right and the sidebar bottom-right, so they end up a long way apart
     * with a very tall strip of world between them. Jagex reached the same conclusion for OSRS
     * mobile and shipped landscape-only, their stated reason being that the interfaces — the bank
     * above all — are authored landscape.
     *
     * Orientation cannot be locked from script here: `screen.orientation.lock()` does not exist on
     * iOS in any mode, and the manifest's `orientation` member is ignored there. A hint really is
     * the whole toolbox.
     */
    private static watchOrientation(): void {
        const check = (): void => {
            const portrait = window.innerHeight > window.innerWidth;
            const existing = document.getElementById('rotate-hint');
            if (!portrait) {
                existing?.remove();
                return;
            }
            if (existing || MobileTouch.orientationHinted) {
                return;
            }
            MobileTouch.orientationHinted = true;
            const hint = document.createElement('div');
            hint.id = 'rotate-hint';
            hint.style.cssText =
                'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom, 0px) + 12px);' +
                'transform:translateX(-50%);z-index:1000;padding:10px 14px;background:#2b2620;' +
                'color:#fff;border:1px solid #675a4a;border-radius:6px;opacity:0.92;' +
                'font:12px Arial,Helvetica,sans-serif;text-align:center;max-width:80vw;';
            hint.textContent = 'Turn your phone sideways — the interfaces are laid out for landscape, and the minimap and inventory sit far apart held upright. Tap to dismiss.';
            hint.addEventListener('pointerdown', (event: PointerEvent): void => {
                event.preventDefault();
                hint.remove();
            });
            document.body.appendChild(hint);
        };
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', check);
        check();
    }
}
