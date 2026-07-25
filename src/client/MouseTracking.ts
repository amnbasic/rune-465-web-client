import ClientMouseListener from '#/client/ClientMouseListener.js';
import ThreadSleep from '#/util/ThreadSleep.js';

export default class MouseTracking {
    active: boolean = true;
    length: number = 0;
    x: Int32Array = new Int32Array(500);
    y: Int32Array = new Int32Array(500);

    async run(): Promise<void> {
        while (this.active) {
            if (this.length < 500) {
                this.x[this.length] = ClientMouseListener.mouseX;
                this.y[this.length] = ClientMouseListener.mouseY;
                this.length++;
            }

            await ThreadSleep.sleepPrecise(50);
        }
    }
}
