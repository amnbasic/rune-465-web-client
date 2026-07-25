import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpColourFill extends TextureOp {
    red = 0;
    green = 0;
    blue = 0;

    constructor();
    constructor(arg0: number);
    constructor(arg0: number = 0) {
        super(0, false);
        this.setColor(0);
    }

    setColor(arg0: number): void {
        this.green = (arg0 >> 4) & 0xff0;
        this.red = (arg0 & 0xff) << 4;
        this.blue = (arg0 >> 12) & 0xff0;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.setColor(arg0.g3());
        }
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = var2[0];
            const var4 = var2[2];
            const var5 = var2[1];
            for (let var6 = 0; var6 < Texture.width; var6++) {
                var3[var6] = this.blue;
                var5[var6] = this.green;
                var4[var6] = this.red;
            }
        }
        return var2;
    }
}
