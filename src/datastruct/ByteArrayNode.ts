import Linkable from '#/datastruct/Linkable.js';

export default class ByteArrayNode extends Linkable {
    readonly data: Uint8Array;

    constructor(data: Uint8Array) {
        super();
        this.data = data;
    }
}
