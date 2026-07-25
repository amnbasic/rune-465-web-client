import ClientMouseWheelListener from '#/client/ClientMouseWheelListener.js';

export default abstract class MouseWheelListener {
    static getProvider(): MouseWheelListener | null {
        try {
            return new ClientMouseWheelListener();
        } catch {
            return null;
        }
    }

    abstract addListeners(target: HTMLElement): void;
    abstract removeListeners(target: HTMLElement): void;
    abstract getRotation(): number;
}
