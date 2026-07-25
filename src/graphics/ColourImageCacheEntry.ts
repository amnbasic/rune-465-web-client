import Linkable from '#/datastruct/Linkable.js';

export default class ColourImageCacheEntry extends Linkable {
    readonly field3006: number;
    readonly field3015: number;

    constructor(arg0: number, arg1: number) {
        super();
        this.field3006 = arg1;
        this.field3015 = arg0;
    }
}
