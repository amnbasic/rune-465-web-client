export default class IntHashTable {
    readonly buckets: Int32Array;

    constructor(keys: ArrayLike<number>) {
        let bucketCount: number;
        for (bucketCount = 1; bucketCount <= keys.length + (keys.length >> 1); bucketCount <<= 1) {}

        this.buckets = new Int32Array(bucketCount + bucketCount);
        for (let i = 0; i < bucketCount + bucketCount; i++) {
            this.buckets[i] = -1;
        }

        let value = 0;
        while (value < keys.length) {
            let hash: number;
            for (hash = keys[value] & (bucketCount - 1); this.buckets[hash + hash + 1] !== -1; hash = (bucketCount - 1) & (hash + 1)) {}

            this.buckets[hash + hash] = keys[value];
            this.buckets[hash + hash + 1] = value++;
        }
    }

    find(key: number): number {
        const mask = (this.buckets.length >> 1) - 1;
        let hash = mask & key;
        while (true) {
            const value = this.buckets[hash + hash + 1];
            if (value === -1) {
                return -1;
            }

            if (key === this.buckets[hash + hash]) {
                return value;
            }

            hash = (hash + 1) & mask;
        }
    }
}
