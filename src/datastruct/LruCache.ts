import Linkable2 from '#/datastruct/Linkable2.js';
import HashTable from '#/datastruct/HashTable.js';
import LinkList2 from '#/datastruct/LinkList2.js';

export default class LruCache<T extends Linkable2> {
    readonly sentinel: Linkable2 = new Linkable2();
    readonly capacity: number;
    available: number;
    readonly cache: HashTable<T>;
    readonly order: LinkList2<T> = new LinkList2();

    constructor(capacity: number) {
        this.capacity = capacity;
        this.available = capacity;
        let bucketCount: number;
        for (bucketCount = 1; bucketCount + bucketCount < capacity; bucketCount += bucketCount) {}
        this.cache = new HashTable(bucketCount);
    }

    find(key: bigint): T | null {
        const node = this.cache.find(key);
        if (node !== null) {
            this.order.push(node);
        }
        return node;
    }

    remove(key: bigint): void {
        const node = this.cache.find(key);
        if (node !== null) {
            node.unlink();
            node.unlink2();
            this.available++;
        }
    }

    put(key: bigint, node: T): void {
        if (this.available === 0) {
            const first = this.order.popFront() as T;
            first.unlink();
            first.unlink2();
            if (first === this.sentinel) {
                const second = this.order.popFront() as T;
                second.unlink();
                second.unlink2();
            }
        } else {
            this.available--;
        }
        this.cache.put(key, node);
        this.order.push(node);
    }

    clear(): void {
        while (true) {
            const node = this.order.popFront();
            if (node === null) {
                this.available = this.capacity;
                return;
            }
            node.unlink();
            node.unlink2();
        }
    }

    search(): Linkable2 | null {
        return this.cache.search() as Linkable2 | null;
    }

    findnext(): Linkable2 | null {
        return this.cache.findnext() as Linkable2 | null;
    }
}
