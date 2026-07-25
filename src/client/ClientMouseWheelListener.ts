import type MouseWheelListener from '#/client/MouseWheelListener.js';

export default class ClientMouseWheelListener implements MouseWheelListener {
    rotation = 0;

    addListeners(target: HTMLElement): void {
        target.onwheel = (event: WheelEvent): void => {
            this.mouseWheelMoved(event);
        };
    }

    removeListeners(target: HTMLElement): void {
        target.onwheel = null;
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
