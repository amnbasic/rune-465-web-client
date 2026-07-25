import ByteArrayWrapper from '#/io/ByteArrayWrapper.js';

export default class ByteBufferNode extends ByteArrayWrapper {
    buffer: Uint8Array = new Uint8Array(0);

    set(arg0: Uint8Array): void {
        this.buffer = new Uint8Array(arg0);
    }

    toByteArray(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
