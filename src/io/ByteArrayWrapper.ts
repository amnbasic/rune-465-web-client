import ArrayUtil from '#/util/ArrayUtil.js';

export default abstract class ByteArrayWrapper {
    static useDirectBuffer: boolean = false;

    static wrap(arg0: Uint8Array | null): Uint8Array | ByteArrayWrapper | null {
        if (arg0 === null) {
            return null;
        }
        if (arg0.length > 136 && !ByteArrayWrapper.useDirectBuffer) {
            ByteArrayWrapper.useDirectBuffer = true;
        }
        return arg0;
    }

    static unwrap(arg0: boolean, arg1: Uint8Array | ByteArrayWrapper | null): Uint8Array | null {
        if (arg1 === null) {
            return null;
        } else if (arg1 instanceof Uint8Array) {
            const var2 = arg1;
            if (arg0) {
                const var4 = ArrayUtil.method1276(var2);
                return new Uint8Array(var4.buffer, var4.byteOffset, var4.byteLength);
            }
            return var2;
        } else if (arg1 instanceof ByteArrayWrapper) {
            const var3 = arg1;
            return var3.toByteArray();
        } else {
            throw new Error();
        }
    }

    abstract toByteArray(): Uint8Array;

    abstract set(arg0: Uint8Array): void;
}
