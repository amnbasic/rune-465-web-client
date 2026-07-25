import JagException from '#/callstack/JagException.js';
import PcmPlayer from '#/sound/PcmPlayer.js';
import ThreadSleep from '#/util/ThreadSleep.js';

export default class AudioThread {
    readonly players: Array<PcmPlayer | null> = [null, null];
    shutdown = false;
    running = false;

    async run(): Promise<void> {
        this.running = true;
        try {
            while (!this.shutdown) {
                for (let i = 0; i < 2; i++) {
                    this.players[i]?.cycle();
                }
                await ThreadSleep.sleepPrecise(10);
            }
        } catch (e) {
            JagException.report(null, e);
        } finally {
            this.running = false;
        }
    }
}
