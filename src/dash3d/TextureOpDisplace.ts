import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';

export default class TextureOpDisplace extends TextureOp {
    strength: number = 32768;

    constructor() {
        super(3, false);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.strength = arg0.g2() << 4;
        } else if (arg1 === 1) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override postDecode(): void {
        Statics.method740();
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const angles = this.getInputMono(arg0, 1);
            const distances = this.getInputMono(arg0, 2);
            for (let x = 0; x < Texture.width; x++) {
                const distance = (this.strength * distances[x]) >> 12;
                const angle = (angles[x] >> 4) & 0xff;
                const dx = (Statics.field2920![angle] * distance) >> 12;
                const dy = (Statics.field1734![angle] * distance) >> 12;
                const sampleX = (x + (dx >> 12)) & Texture.widthMask;
                const sampleY = Texture.heightMask & ((dy >> 12) + arg0);
                const input = this.getInputMono(sampleY, 0);
                out[x] = input[sampleX];
            }
        }
        return out;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const angles = this.getInputMono(arg0, 1);
            const distances = this.getInputMono(arg0, 2);
            const outR = out[0];
            const outG = out[1];
            const outB = out[2];
            for (let x = 0; x < Texture.width; x++) {
                const angle = ((angles[x] * 255) >> 12) & 0xff;
                const distance = (this.strength * distances[x]) >> 12;
                const dx = (distance * Statics.field2920![angle]) >> 12;
                const dy = (distance * Statics.field1734![angle]) >> 12;
                const sampleX = (x + (dx >> 12)) & Texture.widthMask;
                const sampleY = (arg0 + (dy >> 12)) & Texture.heightMask;
                const input = this.getInputColour(0, sampleY);
                outR[x] = input[0][sampleX];
                outG[x] = input[1][sampleX];
                outB[x] = input[2][sampleX];
            }
        }
        return out;
    }
}
