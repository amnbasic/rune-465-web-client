import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpColourize extends TextureOp {
    blueScale = 4096;
    greenScale = 4096;
    redScale = 4096;

    constructor() {
        super(1, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const input = this.getInputColour(0, arg0);
            const inG = input[1];
            const inR = input[0];
            const outG = out[1];
            const inB = input[2];
            const outR = out[0];
            const outB = out[2];
            for (let i = 0; i < Texture.width; i++) {
                const r = inR[i];
                const b = inB[i];
                const g = inG[i];
                if (b === r && b === g) {
                    outR[i] = (r * this.redScale) >> 12;
                    outG[i] = (b * this.greenScale) >> 12;
                    outB[i] = (g * this.blueScale) >> 12;
                } else {
                    outR[i] = this.redScale;
                    outG[i] = this.greenScale;
                    outB[i] = this.blueScale;
                }
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.redScale = arg0.g2();
        } else if (arg1 === 1) {
            this.greenScale = arg0.g2();
        } else if (arg1 === 2) {
            this.blueScale = arg0.g2();
        }
    }
}
