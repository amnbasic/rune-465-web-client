import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpLerp extends TextureOp {
    constructor() {
        super(3, false);
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const a = this.getInputMono(arg0, 0);
            const b = this.getInputMono(arg0, 1);
            const weight = this.getInputMono(arg0, 2);
            for (let i = 0; i < Texture.width; i++) {
                const w = weight[i];
                if (w === 4096) {
                    out[i] = a[i];
                } else if (w === 0) {
                    out[i] = b[i];
                } else {
                    out[i] = (a[i] * w + (4096 - w) * b[i]) >> 12;
                }
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const weight = this.getInputMono(arg0, 2);
            const a = this.getInputColour(0, arg0);
            const b = this.getInputColour(1, arg0);
            const aB = a[2];
            const bR = b[0];
            const outR = out[0];
            const outB = out[2];
            const aG = a[1];
            const bG = b[1];
            const aR = a[0];
            const outG = out[1];
            const bB = b[2];
            for (let i = 0; i < Texture.width; i++) {
                const w = weight[i];
                if (w === 4096) {
                    outR[i] = aR[i];
                    outG[i] = aG[i];
                    outB[i] = aB[i];
                } else if (w === 0) {
                    outR[i] = bR[i];
                    outG[i] = bG[i];
                    outB[i] = bB[i];
                } else {
                    const inv = 4096 - w;
                    outR[i] = (w * aR[i] + inv * bR[i]) >> 12;
                    outG[i] = (w * aG[i] + bG[i] * inv) >> 12;
                    outB[i] = (aB[i] * w + bB[i] * inv) >> 12;
                }
            }
        }
        return out;
    }
}
