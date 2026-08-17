import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';

/**
 * On-screen keyboard support for touch devices.
 *
 * THE PROBLEM. The client reads input by binding onkeydown/onkeyup/onkeypress to the
 * <canvas> (ClientKeyboardListener.addListeners). A canvas is not a text-entry element, so
 * iOS never offers the soft keyboard for it — no keyboard means no key events, which means
 * the login screen cannot be typed into at all. Chrome on iOS is WebKit underneath and
 * behaves identically. Android is more forgiving but not reliable either.
 *
 * THE FIX. A real <input> the browser is willing to raise a keyboard for, kept visually
 * invisible, whose characters are forwarded into the same buffers the key handlers fill
 * (ClientKeyboardListener.injectChar / injectCode). Client.pollKey and everything above it
 * are untouched and cannot tell the difference.
 *
 * Four things about iOS that constrain the shape of this:
 *
 *  1. The input must be IN THE LAYOUT. display:none, visibility:hidden, width/height 0 and
 *     readonly all stop the keyboard appearing. opacity:0 on a 1px box does not.
 *  2. focus() only raises the keyboard from a REAL user gesture, synchronously. Calling it
 *     from a timer, a promise continuation, or on page load is silently ignored — which is
 *     why the button's handler focuses directly rather than going through any indirection.
 *  3. keydown is not trustworthy for printable characters. iOS reports keyCode 229 for
 *     anything routed through the IME, and `key` is often "Unidentified". The `input` event
 *     is the only reliable source of what was actually typed.
 *  4. Backspace on an EMPTY field fires no event at all. So the field is kept holding a
 *     zero-width sentinel character: deleting it is observable, and tells us a backspace
 *     happened. The field is reset to the sentinel after every event.
 *
 * WHEN THE KEYBOARD SHOWS. Tapping a text field, and nothing else — no button. Not focus-on-any-
 * tap either: tapping the world to walk is the commonest action in the game and raising a keyboard
 * over the viewport every time would be unusable. `Client.wantsTextInput` owns the list of regions
 * where "I want to type" is unambiguous (the chatbox in game, the login band on the title screen)
 * and MobileTouch.onTouchEnd asks it.
 *
 * WHY THE FIELD IS AT THE TOP. This is the fix for "typing shoves the game up the screen". iOS
 * scrolls whatever it must to bring the FOCUSED element above the keyboard, and the field used to
 * be `bottom:0` — the one position guaranteed to be underneath it, so every focus scrolled the
 * page by the full keyboard height. Nothing about the game moved; the browser was scrolling the
 * document out from under it. Pinned to the TOP of the viewport the field is already visible when
 * the keyboard opens, so there is nothing for iOS to scroll, and `pinScroll` undoes it anyway on
 * the builds that scroll regardless.
 */
export default class MobileKeyboard {
    /** Zero-width space. Present so a backspace on an otherwise empty field is observable. */
    private static readonly SENTINEL = '​';

    /** KEY_CODE_MAP values, not DOM keyCodes — see ClientKeyboardListener.setupKeyCodeMap. */
    private static readonly CODE_ENTER = 84;
    private static readonly CODE_BACKSPACE = 85;

    /**
     * Called whenever the keyboard is raised. MobileTouch uses it to force the chatbox back on
     * screen — you cannot type into a hidden one, and the five overlay chat lines carry incoming
     * messages but not the line you are composing, so typing with chat collapsed is typing blind.
     *
     * A callback rather than an import so this file keeps depending on nothing but the key
     * listener, the same rule ControlBar and ScreenMode follow.
     */
    static onOpen: (() => void) | null = null;

    private static input: HTMLInputElement | null = null;

    /**
     * True on anything with a touchscreen. Desktop gets nothing at all — no button, no hidden
     * input — so this cannot interfere with the existing canvas key handling.
     */
    static isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    static init(host: HTMLElement): void {
        if (!MobileKeyboard.isTouchDevice() || MobileKeyboard.input) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.value = MobileKeyboard.SENTINEL;
        // Left on by the browser these rewrite usernames and passwords as you type them.
        input.autocapitalize = 'off';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('aria-hidden', 'true');
        // Invisible but PRESENT (note 1 — this is the one arrangement iOS accepts), and FIXED to
        // the top of the viewport rather than the bottom of the page, which is what stops the
        // focus scrolling the game off screen. See the class note.
        input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;z-index:-1;';

        input.addEventListener('input', MobileKeyboard.onInput);
        input.addEventListener('keydown', MobileKeyboard.onKeyDown);
        input.addEventListener('focus', MobileKeyboard.pinScroll);
        // The keyboard can be dismissed by the OS (the down-chevron, or rotating). Put the
        // field back to a known state so the next open starts clean.
        input.addEventListener('blur', () => {
            input.value = MobileKeyboard.SENTINEL;
            // A blur DURING the hold window is not the player dismissing the keyboard — it is the
            // tap's own compatibility mousedown landing on the canvas, which is focusable
            // (GameShell sets tabIndex -1) and takes focus away half a beat after we asked for it.
            // MobileTouch.swallowSynthetic already preventDefaults that, and this is the second
            // line of defence for the WebKit builds that assign focus somewhere other than
            // mousedown. Bounded by attempts as well as by time so it can never become a loop.
            if (MobileKeyboard.holdingFocus() && MobileKeyboard.refocusLeft > 0) {
                MobileKeyboard.refocusLeft--;
                input.focus({ preventScroll: true });
                return;
            }
            // The keyboard collapsing leaves the same scroll offset behind if it ever got one.
            MobileKeyboard.pinScroll();
        });

        // THERE IS NO KEYBOARD BUTTON any more. Tapping a text field is the whole route in
        // (MobileTouch.maybeTypeOnTap -> Client.wantsTextInput), which covers the chatbox and its
        // prompts in game and the username/password band on the login screen — the only two places
        // this client accepts typing. A permanent button for it was one more thing sitting over
        // the game for a job a tap already does.
        host.appendChild(input);
        MobileKeyboard.input = input;
    }

    static toggle(): void {
        const input = MobileKeyboard.input;
        if (!input) {
            return;
        }
        if (document.activeElement === input) {
            MobileKeyboard.close();
            return;
        }
        MobileKeyboard.open();
    }

    /** Is the soft keyboard up (as far as focus can tell us — there is no API for the real answer)? */
    static isOpen(): boolean {
        return MobileKeyboard.input !== null && document.activeElement === MobileKeyboard.input;
    }

    // ---- holding focus against the tap that opened it -----------------------------------------

    /**
     * How long a freshly-raised keyboard defends its DOM focus, and how many times.
     *
     * The compatibility mouse events a tap produces arrive a few milliseconds after `touchend`, so
     * the window only has to outlast one burst. Anything longer and a deliberate second tap
     * elsewhere would fail to dismiss the keyboard, which is worse than the bug.
     */
    private static readonly HOLD_MS: number = 600;
    private static readonly HOLD_ATTEMPTS: number = 3;

    private static holdUntil: number = 0;
    private static refocusLeft: number = 0;

    /** Is the input currently defending its focus? Read by MobileTouch.swallowSynthetic too. */
    static holdingFocus(): boolean {
        return performance.now() <= MobileKeyboard.holdUntil;
    }

    /**
     * Raise the keyboard. MUST be called synchronously inside a real user gesture (note 2) — from
     * a timer or a promise continuation iOS ignores it silently.
     */
    static open(): void {
        const input = MobileKeyboard.input;
        if (!input) {
            return;
        }
        input.value = MobileKeyboard.SENTINEL;
        MobileKeyboard.holdUntil = performance.now() + MobileKeyboard.HOLD_MS;
        MobileKeyboard.refocusLeft = MobileKeyboard.HOLD_ATTEMPTS;
        // preventScroll is the standards-track version of the same fix as the fixed-top position;
        // WebKit has ignored it in places, so it is belt and braces rather than the answer.
        input.focus({ preventScroll: true });
        MobileKeyboard.onOpen?.();
    }

    /**
     * Put the keyboard away deliberately.
     *
     * Drops the hold FIRST, or the blur handler would read this as the tap's own focus theft and
     * put the keyboard straight back up.
     */
    static close(): void {
        MobileKeyboard.holdUntil = 0;
        MobileKeyboard.refocusLeft = 0;
        MobileKeyboard.input?.blur();
    }

    /**
     * Put the document back at the origin.
     *
     * The layout viewport is the whole window in both display modes and the game never scrolls, so
     * ANY non-zero scroll offset is the browser having moved the page to accommodate the keyboard
     * — there is no legitimate scroll state to preserve here. Re-asserted on the next frame as
     * well, because on iOS the scroll lands after the focus handler returns.
     */
    private static readonly pinScroll = (): void => {
        const reset = (): void => globalThis.scrollTo?.(0, 0);
        reset();
        requestAnimationFrame(reset);
        window.setTimeout(reset, 120);
        window.setTimeout(reset, 350);
    };

    /**
     * Everything typed arrives here. The field holds a single sentinel between events, so the
     * value tells us what happened since the last one: longer means characters were inserted,
     * shorter (sentinel gone) means backspace.
     */
    private static readonly onInput = (): void => {
        const input = MobileKeyboard.input;
        if (!input) {
            return;
        }
        const value = input.value;

        if (!value.includes(MobileKeyboard.SENTINEL)) {
            // The sentinel itself was deleted — that is the backspace we cannot see otherwise.
            ClientKeyboardListener.injectCode(MobileKeyboard.CODE_BACKSPACE);
            input.value = MobileKeyboard.SENTINEL;
            return;
        }

        const typed = value.split(MobileKeyboard.SENTINEL).join('');
        for (let i = 0; i < typed.length; i++) {
            const ch = typed.charCodeAt(i);
            // The client's own getKeyChar drops anything outside this range, so match it here
            // rather than pushing codepoints the game has no glyph for.
            if (ch > 0 && ch < 256) {
                ClientKeyboardListener.injectChar(ch);
            }
        }
        input.value = MobileKeyboard.SENTINEL;
    };

    /**
     * Enter and Backspace only. Both DO fire keydown on iOS (they are not IME-routed), and
     * Enter never reaches the input event because it inserts nothing.
     *
     * Backspace is handled in BOTH places on purpose: this catches it when the field still has
     * content, onInput catches it when the sentinel is all that is left. Whichever fires,
     * exactly one backspace is delivered, because the two cases are mutually exclusive.
     */
    private static readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            ClientKeyboardListener.injectCode(MobileKeyboard.CODE_ENTER);
            return;
        }
        if (event.key === 'Backspace') {
            const input = MobileKeyboard.input;
            if (input && input.value !== MobileKeyboard.SENTINEL) {
                event.preventDefault();
                ClientKeyboardListener.injectCode(MobileKeyboard.CODE_BACKSPACE);
                input.value = MobileKeyboard.SENTINEL;
            }
        }
    };
}
