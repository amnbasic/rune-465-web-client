import LinkList from '#/datastruct/LinkList.js';
import ColourImageCacheEntry from '#/graphics/ColourImageCacheEntry.js';

export default class ColourImageCache {
    static readonly field1236 = new ColourImageCacheEntry(0, 0);

    field4291: Array<ColourImageCacheEntry | null> | null;
    field4296 = 0;
    readonly field4297: number;
    field4300: LinkList<ColourImageCacheEntry> | null = new LinkList();
    field4301 = -1;
    readonly field4305: number;
    field4306: Array<[Int32Array, Int32Array, Int32Array]> | null;
    field4310 = false;

    constructor(arg0: number, arg1: number, arg2: number) {
        this.field4305 = arg1;
        this.field4291 = new Array(this.field4305).fill(null);
        this.field4297 = arg0;
        this.field4306 = new Array(this.field4297);
        for (let i = 0; i < this.field4297; i++) {
            this.field4306[i] = [new Int32Array(arg2), new Int32Array(arg2), new Int32Array(arg2)];
        }
    }

    destroy(): void {
        for (let var1 = 0; var1 < this.field4297; var1++) {
            this.field4306![var1][0] = null as unknown as Int32Array;
            this.field4306![var1][1] = null as unknown as Int32Array;
            this.field4306![var1][2] = null as unknown as Int32Array;
            this.field4306![var1] = null as unknown as [Int32Array, Int32Array, Int32Array];
        }
        this.field4306 = null;
        this.field4291 = null;
        this.field4300!.clear();
        this.field4300 = null;
    }

    getAllFrames(): Array<[Int32Array, Int32Array, Int32Array]> {
        if (this.field4297 !== this.field4305) {
            throw new Error('Can only retrieve a full image cache');
        }
        for (let i = 0; i < this.field4297; i++) {
            this.field4291![i] = ColourImageCache.field1236;
        }
        return this.field4306!;
    }

    getFrame(arg0: number): [Int32Array, Int32Array, Int32Array] {
        if (this.field4297 === this.field4305) {
            this.field4310 = this.field4291![arg0] === null;
            this.field4291![arg0] = ColourImageCache.field1236;
            return this.field4306![arg0];
        } else if (this.field4297 === 1) {
            this.field4310 = arg0 !== this.field4301;
            this.field4301 = arg0;
            return this.field4306![0];
        } else {
            let var2 = this.field4291![arg0];
            if (var2 === null) {
                this.field4310 = true;
                if (this.field4297 > this.field4296) {
                    var2 = new ColourImageCacheEntry(arg0, this.field4296);
                    this.field4296++;
                } else {
                    const var3 = this.field4300!.tail()!;
                    var2 = new ColourImageCacheEntry(arg0, var3.field3006);
                    this.field4291![var3.field3015] = null;
                    var3.unlink();
                }
                this.field4291![arg0] = var2;
            } else {
                this.field4310 = false;
            }
            this.field4300!.pushFront(var2);
            return this.field4306![var2.field3006];
        }
    }
}
