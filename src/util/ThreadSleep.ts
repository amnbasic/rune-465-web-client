export default class ThreadSleep {
    // jag::this_thread::SleepPrecise
    static async sleepPrecise(ms: number): Promise<void> {
        if (ms <= 0) {
            return;
        }
        if (ms % 10 === 0) {
            await ThreadSleep.sleep(ms - 1);
            await ThreadSleep.sleep(1);
        } else {
            await ThreadSleep.sleep(ms);
        }
    }

    // jag::this_thread::Sleep
    static async sleep(ms: number): Promise<void> {
        try {
            await new Promise<void>(resolve => setTimeout(resolve, ms));
        } catch (var2) {}
    }
}
