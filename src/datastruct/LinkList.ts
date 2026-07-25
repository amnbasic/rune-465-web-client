import Linkable from '#/datastruct/Linkable.js';

export default class LinkList<T extends Linkable> {
    readonly sentinel: Linkable = new Linkable();
    cursor: Linkable | null = null;

    constructor() {
        this.sentinel.next = this.sentinel;
        this.sentinel.prev = this.sentinel;
    }

    clear(): void {
        while (true) {
            const node = this.sentinel.next as T;
            if (this.sentinel === node) {
                return;
            }

            node.unlink();
        }
    }

    push(node: T): void {
        if (node.prev !== null) {
            node.unlink();
        }

        node.prev = this.sentinel.prev;
        node.next = this.sentinel;
        node.prev!.next = node;
        node.next.prev = node;
    }

    pushFront(node: T): void {
        if (node.prev !== null) {
            node.unlink();
        }

        node.next = this.sentinel.next;
        node.prev = this.sentinel;
        node.prev.next = node;
        node.next!.prev = node;
    }

    insertBefore(node1: T, node2: T): void {
        if (node1.prev !== null) {
            node1.unlink();
        }

        node1.prev = node2.prev;
        node1.next = node2;
        node1.prev!.next = node1;
        node1.next.prev = node1;
    }

    popFront(): T | null {
        const node = this.sentinel.next as T;
        if (node === this.sentinel) {
            return null;
        } else {
            node.unlink();
            return node;
        }
    }

    head(): T | null {
        const node = this.sentinel.next as T;
        if (this.sentinel === node) {
            this.cursor = null;
            return null;
        } else {
            this.cursor = node.next;
            return node;
        }
    }

    tail(): T | null {
        const node = this.sentinel.prev as T;
        if (node === this.sentinel) {
            this.cursor = null;
            return null;
        } else {
            this.cursor = node.prev;
            return node;
        }
    }

    next(): T | null {
        const node = this.cursor as T;
        if (this.sentinel === node) {
            this.cursor = null;
            return null;
        } else {
            this.cursor = node.next;
            return node;
        }
    }

    prev(): T | null {
        const node = this.cursor as T;
        if (this.sentinel === node) {
            this.cursor = null;
            return null;
        } else {
            this.cursor = node.prev;
            return node;
        }
    }
}
