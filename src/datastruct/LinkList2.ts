import Linkable2 from '#/datastruct/Linkable2.js';

export default class LinkList2<T extends Linkable2> {
    readonly sentinel: Linkable2 = new Linkable2();

    constructor() {
        this.sentinel.next2 = this.sentinel;
        this.sentinel.prev2 = this.sentinel;
    }

    push(node: T): void {
        if (node.prev2 !== null) {
            node.unlink2();
        }

        node.next2 = this.sentinel;
        node.prev2 = this.sentinel.prev2;
        node.prev2!.next2 = node;
        node.next2.prev2 = node;
    }

    pushFront(node: T): void {
        if (node.prev2 !== null) {
            node.unlink2();
        }

        node.prev2 = this.sentinel;
        node.next2 = this.sentinel.next2;
        node.prev2.next2 = node;
        node.next2!.prev2 = node;
    }

    popFront(): T | null {
        const node = this.sentinel.next2 as T;
        if (node === this.sentinel) {
            return null;
        } else {
            node.unlink2();
            return node;
        }
    }

    next(): T | null {
        const node = this.sentinel.next2 as T;
        if (node === this.sentinel) {
            return null;
        } else {
            return node;
        }
    }
}
