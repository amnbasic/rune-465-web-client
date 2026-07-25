import Linkable from '#/datastruct/Linkable.js';
import ColourImageCache from '#/graphics/ColourImageCache.js';
import MonochromeImageCache from '#/graphics/MonochromeImageCache.js';
import Packet from '#/io/Packet.js';

export default abstract class TextureOp extends Linkable {
    monochrome: boolean;
    readonly inputs: TextureOp[];
    opacity = 0;
    monoCache!: MonochromeImageCache;
    colourCache!: ColourImageCache;

    constructor(arg0: number, arg1: boolean) {
        super();
        this.monochrome = arg1;
        this.inputs = new Array(arg0);
    }

    renderMono(arg0: number): Int32Array {
        throw new Error('This operation does not have a monochrome output');
    }

    getInputMono(arg0: number, arg1: number): Int32Array {
        return this.inputs[arg1].monochrome ? this.inputs[arg1].renderMono(arg0) : this.inputs[arg1].renderColour(arg0)[0];
    }

    decode(arg0: Packet, arg1: number): void {}

    getInputColour(arg0: number, arg1: number): [Int32Array, Int32Array, Int32Array] {
        if (this.inputs[arg0].monochrome) {
            const var3 = this.inputs[arg0].renderMono(arg1);
            return [var3, var3, var3];
        } else {
            return this.inputs[arg0].renderColour(arg1);
        }
    }

    postDecode(): void {}

    getImageId(): number {
        return -1;
    }

    renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        throw new Error('This operation does not have a colour output');
    }

    clearCache(): void {
        if (this.monochrome) {
            this.monoCache.destroy();
            this.monoCache = null as unknown as MonochromeImageCache;
        } else {
            this.colourCache.destroy();
            this.colourCache = null as unknown as ColourImageCache;
        }
    }

    createCache(arg0: number, arg1: number): void {
        const var3 = this.opacity === 255 ? arg1 : this.opacity;
        if (this.monochrome) {
            this.monoCache = new MonochromeImageCache(var3, arg1, arg0);
        } else {
            this.colourCache = new ColourImageCache(var3, arg1, arg0);
        }
    }

    getSpriteId(): number {
        return -1;
    }
}
