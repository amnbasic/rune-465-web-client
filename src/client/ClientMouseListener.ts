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
            const canvas = event.currentTarget as HTMLCanvasElement;
            const fixedWidth = canvas.width;
            const fixedHeight = canvas.height;
            const bounds = canvas.getBoundingClientRect();
            const clickX = event.clientX - bounds.left;
            const clickY = event.clientY - bounds.top;
            let x = 0;
            let y = 0;
            if (document.fullscreenElement !== null) {
                const gameAspectRatio = fixedWidth / fixedHeight;
                const ourAspectRatio = window.innerWidth / window.innerHeight;
                const wider = ourAspectRatio >= gameAspectRatio;
                let trueCanvasWidth = 0;
                let trueCanvasHeight = 0;
                let offsetX = 0;
                let offsetY = 0;
                if (wider) {
                    trueCanvasWidth = window.innerHeight * gameAspectRatio;
                    trueCanvasHeight = window.innerHeight;
                    offsetX = (window.innerWidth - trueCanvasWidth) / 2;
                } else {
                    trueCanvasWidth = window.innerWidth;
                    trueCanvasHeight = window.innerWidth / gameAspectRatio;
                    offsetY = (window.innerHeight - trueCanvasHeight) / 2;
                }
                x = ((clickX - offsetX) * (fixedWidth / trueCanvasWidth)) | 0;
                y = ((clickY - offsetY) * (fixedHeight / trueCanvasHeight)) | 0;
            } else {
                x = (clickX * (canvas.width / bounds.width)) | 0;
                y = (clickY * (canvas.height / bounds.height)) | 0;
            }
            if (x < 0) {
                x = 0;
            } else if (x > fixedWidth) {
                x = fixedWidth;
            }
            if (y < 0) {
                y = 0;
            } else if (y > fixedHeight) {
                y = fixedHeight;
            }
            ClientMouseListener.nextMouseClickX = x;
            ClientMouseListener.nextMouseClickY = y;
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
            const canvas = event.currentTarget as HTMLCanvasElement;
            const fixedWidth = canvas.width;
            const fixedHeight = canvas.height;
            const bounds = canvas.getBoundingClientRect();
            const clickX = event.clientX - bounds.left;
            const clickY = event.clientY - bounds.top;
            let x = 0;
            let y = 0;
            if (document.fullscreenElement !== null) {
                const gameAspectRatio = fixedWidth / fixedHeight;
                const ourAspectRatio = window.innerWidth / window.innerHeight;
                const wider = ourAspectRatio >= gameAspectRatio;
                let trueCanvasWidth = 0;
                let trueCanvasHeight = 0;
                let offsetX = 0;
                let offsetY = 0;
                if (wider) {
                    trueCanvasWidth = window.innerHeight * gameAspectRatio;
                    trueCanvasHeight = window.innerHeight;
                    offsetX = (window.innerWidth - trueCanvasWidth) / 2;
                } else {
                    trueCanvasWidth = window.innerWidth;
                    trueCanvasHeight = window.innerWidth / gameAspectRatio;
                    offsetY = (window.innerHeight - trueCanvasHeight) / 2;
                }
                x = ((clickX - offsetX) * (fixedWidth / trueCanvasWidth)) | 0;
                y = ((clickY - offsetY) * (fixedHeight / trueCanvasHeight)) | 0;
            } else {
                x = (clickX * (canvas.width / bounds.width)) | 0;
                y = (clickY * (canvas.height / bounds.height)) | 0;
            }
            if (x < 0) {
                x = 0;
            } else if (x > fixedWidth) {
                x = fixedWidth;
            }
            if (y < 0) {
                y = 0;
            } else if (y > fixedHeight) {
                y = fixedHeight;
            }
            ClientMouseListener.nextMouseX = x;
            ClientMouseListener.nextMouseY = y;
        }
    }

    mouseExited(_event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            ClientMouseListener.nextMouseX = -1;
            ClientMouseListener.nextMouseY = -1;
        }
    }

    mouseDragged(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const canvas = event.currentTarget as HTMLCanvasElement;
            const fixedWidth = canvas.width;
            const fixedHeight = canvas.height;
            const bounds = canvas.getBoundingClientRect();
            const clickX = event.clientX - bounds.left;
            const clickY = event.clientY - bounds.top;
            let x = 0;
            let y = 0;
            if (document.fullscreenElement !== null) {
                const gameAspectRatio = fixedWidth / fixedHeight;
                const ourAspectRatio = window.innerWidth / window.innerHeight;
                const wider = ourAspectRatio >= gameAspectRatio;
                let trueCanvasWidth = 0;
                let trueCanvasHeight = 0;
                let offsetX = 0;
                let offsetY = 0;
                if (wider) {
                    trueCanvasWidth = window.innerHeight * gameAspectRatio;
                    trueCanvasHeight = window.innerHeight;
                    offsetX = (window.innerWidth - trueCanvasWidth) / 2;
                } else {
                    trueCanvasWidth = window.innerWidth;
                    trueCanvasHeight = window.innerWidth / gameAspectRatio;
                    offsetY = (window.innerHeight - trueCanvasHeight) / 2;
                }
                x = ((clickX - offsetX) * (fixedWidth / trueCanvasWidth)) | 0;
                y = ((clickY - offsetY) * (fixedHeight / trueCanvasHeight)) | 0;
            } else {
                x = (clickX * (canvas.width / bounds.width)) | 0;
                y = (clickY * (canvas.height / bounds.height)) | 0;
            }
            if (x < 0) {
                x = 0;
            } else if (x > fixedWidth) {
                x = fixedWidth;
            }
            if (y < 0) {
                y = 0;
            } else if (y > fixedHeight) {
                y = fixedHeight;
            }
            ClientMouseListener.nextMouseX = x;
            ClientMouseListener.nextMouseY = y;
        }
    }

    mouseMoved(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const canvas = event.currentTarget as HTMLCanvasElement;
            const fixedWidth = canvas.width;
            const fixedHeight = canvas.height;
            const bounds = canvas.getBoundingClientRect();
            const clickX = event.clientX - bounds.left;
            const clickY = event.clientY - bounds.top;
            let x = 0;
            let y = 0;
            if (document.fullscreenElement !== null) {
                const gameAspectRatio = fixedWidth / fixedHeight;
                const ourAspectRatio = window.innerWidth / window.innerHeight;
                const wider = ourAspectRatio >= gameAspectRatio;
                let trueCanvasWidth = 0;
                let trueCanvasHeight = 0;
                let offsetX = 0;
                let offsetY = 0;
                if (wider) {
                    trueCanvasWidth = window.innerHeight * gameAspectRatio;
                    trueCanvasHeight = window.innerHeight;
                    offsetX = (window.innerWidth - trueCanvasWidth) / 2;
                } else {
                    trueCanvasWidth = window.innerWidth;
                    trueCanvasHeight = window.innerWidth / gameAspectRatio;
                    offsetY = (window.innerHeight - trueCanvasHeight) / 2;
                }
                x = ((clickX - offsetX) * (fixedWidth / trueCanvasWidth)) | 0;
                y = ((clickY - offsetY) * (fixedHeight / trueCanvasHeight)) | 0;
            } else {
                x = (clickX * (canvas.width / bounds.width)) | 0;
                y = (clickY * (canvas.height / bounds.height)) | 0;
            }
            if (x < 0) {
                x = 0;
            } else if (x > fixedWidth) {
                x = fixedWidth;
            }
            if (y < 0) {
                y = 0;
            } else if (y > fixedHeight) {
                y = fixedHeight;
            }
            ClientMouseListener.nextMouseX = x;
            ClientMouseListener.nextMouseY = y;
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
