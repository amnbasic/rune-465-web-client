export default class JavaRandom {
    private static readonly multiplier = 0x5deece66dn;
    private static readonly addend = 0xbn;
    private static readonly mask = (1n << 48n) - 1n;

    private seed: bigint = 0n;

    constructor(seed?: number | bigint) {
        if (seed === undefined) {
            seed = BigInt(Math.floor(Math.random() * 0x1000000000000));
        }
        this.setSeed(seed);
    }

    setSeed(seed: number | bigint): void {
        const value = typeof seed === 'bigint' ? seed : BigInt(Math.trunc(seed));
        this.seed = (value ^ JavaRandom.multiplier) & JavaRandom.mask;
    }

    private next(bits: number): number {
        this.seed = (this.seed * JavaRandom.multiplier + JavaRandom.addend) & JavaRandom.mask;
        return Number(this.seed >> BigInt(48 - bits));
    }

    nextInt(): number {
        return this.next(32) | 0;
    }
}
