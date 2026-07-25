import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpPolar extends TextureOp {
    static field203: number = 0;
    static opacity8: number = 0;

    constructor() {
        super(1, false);
    }

    computePolarLookup(arg0: number, arg1: number): void {
        let var3 = Texture.rowLut[arg1];
        let var4 = Texture.columnLut[arg0];
        const var5 = Math.atan2(var4 - 2048, var3 - 2048);
        if (var5 >= -3.141592653589793 && var5 <= -2.356194490192345) {
            TextureOpPolar.field203 = arg1;
            TextureOpPolar.opacity8 = arg0;
        } else if (var5 <= -1.5707963267948966 && var5 >= -2.356194490192345) {
            TextureOpPolar.field203 = arg0;
            TextureOpPolar.opacity8 = arg1;
        } else if (var5 <= -0.7853981633974483 && var5 >= -1.5707963267948966) {
            TextureOpPolar.opacity8 = Texture.width - arg1;
            TextureOpPolar.field203 = arg0;
        } else if (var5 <= 0.0 && var5 >= -0.7853981633974483) {
            TextureOpPolar.opacity8 = arg0;
            TextureOpPolar.field203 = Texture.height - arg1;
        } else if (var5 >= 0.0 && var5 <= 0.7853981633974483) {
            TextureOpPolar.opacity8 = Texture.width - arg0;
            TextureOpPolar.field203 = Texture.height - arg1;
        } else if (var5 >= 0.7853981633974483 && var5 <= 1.5707963267948966) {
            TextureOpPolar.opacity8 = Texture.width - arg1;
            TextureOpPolar.field203 = Texture.height - arg0;
        } else if (var5 >= 1.5707963267948966 && var5 <= 2.356194490192345) {
            TextureOpPolar.opacity8 = arg1;
            TextureOpPolar.field203 = Texture.height - arg0;
        } else if (var5 >= 2.356194490192345 && var5 <= 3.141592653589793) {
            TextureOpPolar.field203 = arg1;
            TextureOpPolar.opacity8 = Texture.width - arg0;
        }
        TextureOpPolar.field203 &= Texture.heightMask;
        TextureOpPolar.opacity8 &= Texture.widthMask;
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            for (let i = 0; i < Texture.width; i++) {
                this.computePolarLookup(i, arg0);
                const input = this.getInputMono(TextureOpPolar.field203, 0);
                out[i] = input[TextureOpPolar.opacity8];
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
            const outR = out[0];
            const outG = out[1];
            const outB = out[2];
            for (let i = 0; i < Texture.width; i++) {
                this.computePolarLookup(i, arg0);
                const input = this.getInputColour(0, TextureOpPolar.field203);
                outR[i] = input[0][TextureOpPolar.opacity8];
                outG[i] = input[1][TextureOpPolar.opacity8];
                outB[i] = input[2][TextureOpPolar.opacity8];
            }
        }
        return out;
    }
}
