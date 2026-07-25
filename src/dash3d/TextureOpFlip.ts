import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import ArrayUtil from '#/util/ArrayUtil.js';

export default class TextureOpFlip extends TextureOp {
    flipY = true;
    flipX = true;

    constructor() {
        super(1, false);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.flipX = arg0.g1() === 1;
        } else if (arg1 === 1) {
            this.flipY = arg0.g1() === 1;
        } else if (arg1 === 2) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const input = this.getInputColour(0, this.flipY ? Texture.heightMask - arg0 : arg0);
            const inR = input[0];
            const inB = input[2];
            const inG = input[1];
            const outR = out[0];
            const outG = out[1];
            const outB = out[2];
            if (this.flipX) {
                for (let var11 = 0; var11 < Texture.width; var11++) {
                    outR[var11] = inR[Texture.widthMask - var11];
                    outG[var11] = inG[Texture.widthMask - var11];
                    outB[var11] = inB[Texture.widthMask - var11];
                }
            } else {
                for (let i = 0; i < Texture.width; i++) {
                    outR[i] = inR[i];
                    outG[i] = inG[i];
                    outB[i] = inB[i];
                }
            }
        }
        return out;
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const input = this.getInputMono(this.flipY ? Texture.heightMask - arg0 : arg0, 0);
            if (this.flipX) {
                for (let i = 0; i < Texture.width; i++) {
                    out[i] = input[Texture.widthMask - i];
                }
            } else {
                ArrayUtil.method838(input, 0, out, 0, Texture.width);
            }
        }
        return out;
    }
}
