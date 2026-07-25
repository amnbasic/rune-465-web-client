import LinkList from '#/datastruct/LinkList.js';
import MonochromeImageCacheEntry from '#/graphics/MonochromeImageCacheEntry.js';

export default class MonochromeImageCache {
    static readonly field1572 = new MonochromeImageCacheEntry(0, 0);

    field3078: LinkList<MonochromeImageCacheEntry> | null = new LinkList();
    field3086 = -1;
    readonly field3087: number;
    readonly field3088: number;
    field3091: Int32Array[] | null;
    field3095: Array<MonochromeImageCacheEntry | null> | null;
    field3097 = 0;
    field3098 = false;

    constructor(arg0: number, arg1: number, arg2: number) {
        this.field3087 = arg0;
        this.field3091 = new Array(this.field3087);
        for (let i = 0; i < this.field3087; i++) {
            this.field3091[i] = new Int32Array(arg2);
        }
        this.field3088 = arg1;
        this.field3095 = new Array(this.field3088).fill(null);
    }

    getAllFrames(): Int32Array[] {
        if (this.field3088 !== this.field3087) {
            throw new Error('Can only retrieve a full image cache');
        }
        for (let i = 0; i < this.field3087; i++) {
            this.field3095![i] = MonochromeImageCache.field1572;
        }
        return this.field3091!;
    }

    getFrame(arg0: number): Int32Array {
        if (this.field3087 === this.field3088) {
            this.field3098 = this.field3095![arg0] === null;
            this.field3095![arg0] = MonochromeImageCache.field1572;
            return this.field3091![arg0];
        } else if (this.field3087 === 1) {
            this.field3098 = arg0 !== this.field3086;
            this.field3086 = arg0;
            return this.field3091![0];
        } else {
            let var2 = this.field3095![arg0];
            if (var2 === null) {
                this.field3098 = true;
                if (this.field3087 > this.field3097) {
                    var2 = new MonochromeImageCacheEntry(arg0, this.field3097);
                    this.field3097++;
                } else {
                    const var3 = this.field3078!.tail()!;
                    var2 = new MonochromeImageCacheEntry(arg0, var3.field3001);
                    this.field3095![var3.field2992] = null;
                    var3.unlink();
                }
                this.field3095![arg0] = var2;
            } else {
                this.field3098 = false;
            }
            this.field3078!.pushFront(var2);
            return this.field3091![var2.field3001];
        }
    }

    destroy(): void {
        for (let var1 = 0; var1 < this.field3087; var1++) {
            this.field3091![var1] = null as unknown as Int32Array;
        }
        this.field3091 = null;
        this.field3095 = null;
        this.field3078!.clear();
        this.field3078 = null;
    }
}
