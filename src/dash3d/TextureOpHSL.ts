import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpHSL extends TextureOp {
    field3213: number = 0;
    saturation: number = 0;
    field3224: number = 0;
    hueShift: number = 0;
    brightness: number = 0;
    field3207: number = 0;
    field3208: number = 0;
    field3209: number = 0;
    field3210: number = 0;

    constructor() {
        super(1, false);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.hueShift = arg0.g2b();
        } else if (arg1 === 1) {
            this.saturation = ((arg0.g1b() << 12) / 100) | 0;
        } else if (arg1 === 2) {
            this.brightness = ((arg0.g1b() << 12) / 100) | 0;
        }
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = this.getInputColour(0, arg0);
            const var4 = var3[1];
            const var5 = var3[0];
            const var6 = var3[2];
            const var7 = var2[0];
            const var8 = var2[1];
            const var9 = var2[2];
            for (let var10 = 0; var10 < Texture.width; var10++) {
                this.rgbToHsl(var4[var10], var5[var10], var6[var10]);
                this.field3213 += this.brightness;
                if (this.field3213 < 0) {
                    this.field3213 = 0;
                }
                for (this.field3209 += this.hueShift; this.field3209 < 0; this.field3209 += 4096) {}
                if (this.field3213 > 4096) {
                    this.field3213 = 4096;
                }
                while (this.field3209 > 4096) {
                    this.field3209 -= 4096;
                }
                this.field3207 += this.saturation;
                if (this.field3207 < 0) {
                    this.field3207 = 0;
                }
                if (this.field3207 > 4096) {
                    this.field3207 = 4096;
                }
                this.hslToRgb(this.field3207, this.field3209, this.field3213);
                var7[var10] = this.field3210;
                var8[var10] = this.field3208;
                var9[var10] = this.field3224;
            }
        }
        return var2;
    }

    hslToRgb(arg0: number, arg1: number, arg2: number): void {
        const var4 = arg2 > 2048 ? arg2 + arg0 - ((arg0 * arg2) >> 12) : ((4096 - -arg0) * arg2) >> 12;
        if (var4 <= 0) {
            this.field3210 = this.field3208 = this.field3224 = arg2;
            return;
        }
        const var5 = arg2 + arg2 - var4;
        const var6 = arg1 * 6;
        const var7 = (((var4 - var5) << 12) / var4) | 0;
        const var8 = var6 >> 12;
        const var9 = var6 - (var8 << 12);
        const var10 = (var4 * var7) >> 12;
        const var11 = (var9 * var10) >> 12;
        const var12 = var4 - var11;
        const var13 = var5 + var11;
        if (var8 === 0) {
            this.field3208 = var13;
            this.field3224 = var5;
            this.field3210 = var4;
            return;
        }
        if (var8 === 1) {
            this.field3224 = var5;
            this.field3208 = var4;
            this.field3210 = var12;
            return;
        }
        if (var8 === 2) {
            this.field3224 = var13;
            this.field3208 = var4;
            this.field3210 = var5;
            return;
        }
        if (var8 === 3) {
            this.field3210 = var5;
            this.field3224 = var4;
            this.field3208 = var12;
            return;
        }
        if (var8 === 4) {
            this.field3210 = var13;
            this.field3224 = var4;
            this.field3208 = var5;
            return;
        }
        if (var8 === 5) {
            this.field3210 = var4;
            this.field3208 = var5;
            this.field3224 = var12;
            return;
        }
    }

    rgbToHsl(arg0: number, arg1: number, arg2: number): void {
        const var4 = arg0 >= arg1 ? arg0 : arg1;
        const var5 = var4 >= arg2 ? var4 : arg2;
        const var6 = arg0 > arg1 ? arg1 : arg0;
        const var7 = var6 <= arg2 ? var6 : arg2;
        this.field3213 = ((var5 + var7) / 2) | 0;
        const var8 = var5 - var7;
        if (var8 <= 0) {
            this.field3209 = 0;
        } else {
            const var9 = (((var5 - arg0) << 12) / var8) | 0;
            const var10 = (((var5 - arg1) << 12) / var8) | 0;
            const var11 = (((var5 - arg2) << 12) / var8) | 0;
            if (var5 === arg1) {
                this.field3209 = arg0 === var7 ? var11 + 20480 : 4096 - var9;
            } else if (var5 === arg0) {
                this.field3209 = arg2 === var7 ? var10 + 4096 : 12288 - var11;
            } else {
                this.field3209 = var7 === arg1 ? var9 + 12288 : -var10 + 20480;
            }
            this.field3209 = (this.field3209 / 6) | 0;
        }
        if (this.field3213 > 0 && this.field3213 < 4096) {
            this.field3207 = ((var8 << 12) / (this.field3213 <= 2048 ? this.field3213 * 2 : 8192 - this.field3213 * 2)) | 0;
        } else {
            this.field3207 = 0;
        }
    }
}
