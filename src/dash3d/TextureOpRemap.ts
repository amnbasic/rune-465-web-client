import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpRemap extends TextureOp {
    inputMin: number = 1024;
    inputMax: number = 3072;
    range: number = 2048;

    constructor() {
        super(1, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const input = this.getInputColour(0, arg0);
            const inG = input[1];
            const inB = input[2];
            const inR = input[0];
            const outB = out[2];
            const outR = out[0];
            const outG = out[1];
            for (let i = 0; i < Texture.width; i++) {
                outR[i] = this.inputMin + ((inR[i] * this.range) >> 12);
                outG[i] = ((this.range * inG[i]) >> 12) + this.inputMin;
                outB[i] = this.inputMin + ((this.range * inB[i]) >> 12);
            }
        }
        return out;
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const input = this.getInputMono(arg0, 0);
            for (let i = 0; i < Texture.width; i++) {
                out[i] = this.inputMin + ((this.range * input[i]) >> 12);
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.inputMin = arg0.g2();
        } else if (arg1 === 1) {
            this.inputMax = arg0.g2();
        } else if (arg1 === 2) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override postDecode(): void {
        this.range = this.inputMax - this.inputMin;
    }
}
