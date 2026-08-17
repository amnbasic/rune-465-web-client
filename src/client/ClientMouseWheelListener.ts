import type MouseWheelListener from '#/client/MouseWheelListener.js';

export default class ClientMouseWheelListener implements MouseWheelListener {
    rotation = 0;

    // Bound once so removeListeners can detach the same reference.
    private readonly handler = (event: WheelEvent): void => {
        // The wheel belongs to the game (camera zoom, interface scrollbars) - without this the
        // browser ALSO scrolls the page, which is very visible as soon as the frame is taller
        // than the window (zoom 2x, zoom-to-fit). Registered non-passive so it can be cancelled.
        event.preventDefault();
        this.mouseWheelMoved(event);
    };

    addListeners(target: HTMLElement): void {
        target.addEventListener('wheel', this.handler, { passive: false });
    }

    removeListeners(target: HTMLElement): void {
        target.removeEventListener('wheel', this.handler);
    }

    mouseWheelMoved(event: WheelEvent): void {
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? 100 : 1;
        const rotation = Math.trunc(event.deltaY / unit);
        this.rotation += rotation === 0 ? Math.sign(event.deltaY) : rotation;
    }

    getRotation(): number {
        const rotation = this.rotation;
        this.rotation = 0;
        return rotation;
    }
}
