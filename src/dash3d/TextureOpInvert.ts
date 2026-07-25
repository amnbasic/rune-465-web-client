import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpInvert extends TextureOp {
    constructor() {
        super(1, false);
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const input = this.getInputMono(arg0, 0);
            for (let i = 0; i < Texture.width; i++) {
                out[i] = 4096 - input[i];
            }
        }
        return out;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const input = this.getInputColour(0, arg0);
            const inR = input[0];
            const inG = input[1];
            const inB = input[2];
            const outG = out[1];
            const outB = out[2];
            const outR = out[0];
            for (let i = 0; i < Texture.width; i++) {
                outR[i] = 4096 - inR[i];
                outG[i] = 4096 - inG[i];
                outB[i] = 4096 - inB[i];
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.monochrome = arg0.g1() === 1;
        }
    }
}
