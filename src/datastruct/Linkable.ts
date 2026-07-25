export default class Linkable {
    key: bigint = 0n;
    next: Linkable | null = null;
    prev: Linkable | null = null;

    unlink(): void {
        if (this.prev != null) {
            this.prev.next = this.next;
            this.next!.prev = this.prev;
            this.next = null;
            this.prev = null;
        }
    }

    isLinked(): boolean {
        return this.prev !== null;
    }
}
