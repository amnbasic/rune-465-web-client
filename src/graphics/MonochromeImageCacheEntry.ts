import Linkable from '#/datastruct/Linkable.js';

export default class MonochromeImageCacheEntry extends Linkable {
    readonly field2992: number;
    readonly field3001: number;

    constructor(arg0: number, arg1: number) {
        super();
        this.field3001 = arg1;
        this.field2992 = arg0;
    }
}
