export default class MonotonicTime {
    static leapMillis: number = 0;
    static previous: number = 0;

    static currentTime(): number {
        const var0 = Date.now();
        if (var0 < MonotonicTime.leapMillis) {
            MonotonicTime.previous += MonotonicTime.leapMillis - var0;
        }
        MonotonicTime.leapMillis = var0;
        return var0 + MonotonicTime.previous;
    }
}
