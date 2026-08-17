import MonotonicTime from '#/util/MonotonicTime.js';

// jag::oldscape::input::ClientMouseListener
export default class ClientMouseListener {
    static instance: ClientMouseListener | null = new ClientMouseListener();
    static idleTimer: number = 0;
    static nextMouseButton: number = 0;
    static nextMouseX: number = -1;
    static nextMouseY: number = -1;
    // middle-button camera drag state (QoL)
    static middleDown: boolean = false;
    static middleLastX: number = 0;
    static middleLastY: number = 0;
    static mouseButton: number = 0;
    static mouseX: number = 0;
    static mouseY: number = 0;
    static nextMouseClickButton: number = 0;
    static nextMouseClickX: number = 0;
    static nextMouseClickY: number = 0;
    static nextMouseClickTime: number = 0;
    static mouseClickButton: number = 0;
    static mouseClickX: number = 0;
    static mouseClickY: number = 0;
    static mouseClickTime: number = 0;

    // todo: inline?
    private static readonly blur = (event: FocusEvent): void => ClientMouseListener.instance?.focusLost(event);
    private static readonly focus = (event: FocusEvent): void => ClientMouseListener.instance?.focusGained(event);

    static addListeners(target: HTMLElement): void {
        target.onmousedown = (event: MouseEvent): void => ClientMouseListener.instance?.mousePressed(event);
        target.onmouseup = (event: MouseEvent): void => ClientMouseListener.instance?.mouseReleased(event);
        target.onmousemove = (event: MouseEvent): void => ClientMouseListener.instance?.mouseMoved(event);
        target.onmouseenter = (event: MouseEvent): void => ClientMouseListener.instance?.mouseEntered(event);
        target.onmouseleave = (event: MouseEvent): void => ClientMouseListener.instance?.mouseExited(event);
        target.onclick = (event: MouseEvent): void => ClientMouseListener.instance?.mouseClicked(event);
        // middle-button: suppress the browser autoscroll/aux behaviour so drag = camera rotate
        target.onauxclick = (event: MouseEvent): void => {
            if (event.button === 1) {
                event.preventDefault();
            }
        };
        target.addEventListener('blur', ClientMouseListener.blur, false);
        target.addEventListener('focus', ClientMouseListener.focus, false);
    }

    static setIdleTimer(value: number): void {
        ClientMouseListener.idleTimer = value;
    }

    /**
     * Event coordinates -> frame coordinates.
     *
     * Divide the offset inside the canvas' bounding rect by that rect's size, and multiply by the
     * backing store. That is correct in EVERY presentation - letterboxed fixed mode, a fill-the-
     * window resizable frame, browser page zoom, fullscreen - because the bounding rect is the
     * rendered rect by definition, whatever put it there.
     *
     * This used to be four verbatim copies, each with a `document.fullscreenElement !== null`
     * branch that re-derived the letterbox from window.innerWidth/innerHeight instead. That branch
     * assumed the canvas was the largest aspect-fit rect in the whole window, but ScreenMode fits
     * it to innerHeight MINUS the strip it reserves for the settings button, so the two only ever
     * agreed at the exact centre of the screen. At 1920x1080 the error reached ~22 frame px at the
     * bottom edge - more than a whole menu row, and enough to make the lower half of the chat-mode
     * buttons unclickable in fullscreen.
     */
    private static toFrame(event: MouseEvent): { x: number; y: number } {
        const canvas = event.currentTarget as HTMLCanvasElement;
        const bounds = canvas.getBoundingClientRect();
        let x = ((event.clientX - bounds.left) * (canvas.width / bounds.width)) | 0;
        let y = ((event.clientY - bounds.top) * (canvas.height / bounds.height)) | 0;
        if (x < 0) {
            x = 0;
        } else if (x > canvas.width) {
            x = canvas.width;
        }
        if (y < 0) {
            y = 0;
        } else if (y > canvas.height) {
            y = canvas.height;
        }
        return { x, y };
    }

    static cycle(): void {
        ClientMouseListener.idleTimer++;
        ClientMouseListener.mouseButton = ClientMouseListener.nextMouseButton;
        ClientMouseListener.mouseX = ClientMouseListener.nextMouseX;
        ClientMouseListener.mouseY = ClientMouseListener.nextMouseY;
        ClientMouseListener.mouseClickButton = ClientMouseListener.nextMouseClickButton;
        ClientMouseListener.mouseClickX = ClientMouseListener.nextMouseClickX;
        ClientMouseListener.mouseClickY = ClientMouseListener.nextMouseClickY;
        ClientMouseListener.mouseClickTime = ClientMouseListener.nextMouseClickTime;
        ClientMouseListener.nextMouseClickButton = 0;
    }

    mousePressed(event: MouseEvent): void {
        // QoL: middle-button drag rotates the camera (like the Java client). Must not register
        // as a game click, and preventDefault stops the browser autoscroll cursor.
        if (event.button === 1) {
            ClientMouseListener.middleDown = true;
            ClientMouseListener.middleLastX = ClientMouseListener.nextMouseX;
            ClientMouseListener.middleLastY = ClientMouseListener.nextMouseY;
            event.preventDefault();
            return;
        }
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const point = ClientMouseListener.toFrame(event);
            ClientMouseListener.nextMouseClickX = point.x;
            ClientMouseListener.nextMouseClickY = point.y;
            ClientMouseListener.nextMouseClickTime = MonotonicTime.currentTime();
            const button = event.button === 2 || event.metaKey ? 2 : 1;
            ClientMouseListener.nextMouseClickButton = button;
            ClientMouseListener.nextMouseButton = button;
        }
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    mouseReleased(event: MouseEvent): void {
        if (event.button === 1) {
            ClientMouseListener.middleDown = false;
            event.preventDefault();
            return;
        }
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            ClientMouseListener.nextMouseButton = 0;
        }
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    mouseClicked(event: MouseEvent): void {
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    mouseEntered(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const point = ClientMouseListener.toFrame(event);
            ClientMouseListener.nextMouseX = point.x;
            ClientMouseListener.nextMouseY = point.y;
        }
    }

    mouseExited(_event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            ClientMouseListener.nextMouseX = -1;
            ClientMouseListener.nextMouseY = -1;
        }
    }

    // `mouseDragged` used to live here, a fourth verbatim copy of the same coordinate code. It was
    // dead: addListeners never bound it, and the browser reports drags through mousemove anyway.

    mouseMoved(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const point = ClientMouseListener.toFrame(event);
            ClientMouseListener.nextMouseX = point.x;
            ClientMouseListener.nextMouseY = point.y;
        }
    }

    focusGained(_event: FocusEvent): void {}

    focusLost(_event: FocusEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.nextMouseButton = 0;
        }
    }

    static removeListeners(target: HTMLElement): void {
        target.onmousedown = null;
        target.onmouseup = null;
        target.onmousemove = null;
        target.onmouseenter = null;
        target.onmouseleave = null;
        target.onclick = null;
        target.removeEventListener('blur', ClientMouseListener.blur, false);
        target.removeEventListener('focus', ClientMouseListener.focus, false);
        ClientMouseListener.nextMouseButton = 0;
    }

    static shutdown(): void {
        ClientMouseListener.instance = null;
    }

    static getIdleTimer(): number {
        return ClientMouseListener.idleTimer;
    }
}
