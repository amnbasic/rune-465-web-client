import Linkable2 from '#/datastruct/Linkable2.js';
import type TextureProvider from '#/dash3d/TextureProvider.js';
import PixLoader from '#/graphics/PixLoader.js';
import Packet from '#/io/Packet.js';
import Js5 from '#/js5/Js5.js';

/**
 * 465 texture definition + texel build (Java oracle: Class4_Sub19).
 *
 * The 465 cache has no rev-500 "materials" manifest or procedural texture op-trees; each file of
 * textures archive group 0 (file id = texture id) is a small def:
 *   u16 averageColour (HSL16!), u8 opaque, u8 spriteCount (1-4), count x u16 spriteIds (sprites
 *   archive, group=id file=0), if count>1: (count-1) x u8 combineMode + (count-1) x u8 unused,
 *   count x s32 colourOp (0x03RRGGBB = multiply grayscale palette entries by the tint RGB),
 *   u8 animType (0 none, 1/3 vertical scroll -/+, 2/4 horizontal scroll -/+), u8 animSpeed.
 *
 * Texel build (Class4_Sub19.method313): decode sprite (PixLoader = standard 464 sprite format,
 * palette index 0 = transparent), pad to canvas, tint + gamma the palette, palette-lookup into a
 * single size x size RGB block with 64<->128 point resample. LC500's Pix3D samples a single block
 * (not the Java 4-shade-block layout) and applies lighting itself, so one block is correct here.
 */
export default class GlTexture extends Linkable2 {
    static animationBuffer: Int32Array | null = null;

    needsAnimation: boolean = false;
    readonly averageHsl: number;
    readonly opaque: boolean;
    readonly spriteIds: Int32Array;
    readonly combineModes: Int32Array;
    readonly colourOps: Int32Array;
    readonly scrollXSpeed: number;
    readonly scrollYSpeed: number;
    brightness: number = 0;
    texels: Int32Array | null = null;
    // Baked edge length of `texels` (64 or 128). animate() swaps `texels` with a shared grow-only
    // buffer, so texels.length can exceed size*size — never infer the size from the length.
    texelSize: number = 0;

    constructor(arg0: Packet) {
        super();
        this.averageHsl = arg0.g2();
        this.opaque = arg0.g1() === 1;
        const count = arg0.g1();
        this.spriteIds = new Int32Array(count);
        for (let i = 0; i < count; i++) {
            this.spriteIds[i] = arg0.g2();
        }
        this.combineModes = new Int32Array(Math.max(0, count - 1));
        if (count > 1) {
            for (let i = 0; i < count - 1; i++) {
                this.combineModes[i] = arg0.g1();
            }
            for (let i = 0; i < count - 1; i++) {
                arg0.g1(); // read but unused in the 465 client
            }
        }
        this.colourOps = new Int32Array(count);
        for (let i = 0; i < count; i++) {
            this.colourOps[i] = arg0.g4();
        }
        const animType = arg0.g1();
        const animSpeed = arg0.g1();
        // Map the single 465 scroll direction onto LC500's X/Y scroll speeds (animate() reusable).
        this.scrollYSpeed = animType === 1 ? -animSpeed : animType === 3 ? animSpeed : 0;
        this.scrollXSpeed = animType === 2 ? -animSpeed : animType === 4 ? animSpeed : 0;
    }

    isReady(_arg0: TextureProvider, arg1: Js5): boolean {
        let ready = true;
        for (let i = 0; i < this.spriteIds.length; i++) {
            if (!arg1.requestDownload(this.spriteIds[i], 0)) {
                ready = false;
            }
        }
        return ready;
    }

    getTextures(arg0: Js5, arg1: boolean, arg2: TextureProvider): Int32Array | null {
        if (!this.isReady(arg2, arg0)) {
            return null;
        }
        return this.render(1.0, arg1 ? 64 : 128, arg0);
    }

    getTexels(arg0: TextureProvider, arg1: number, arg2: Js5, arg3: boolean): Int32Array | null {
        if (this.texels === null || arg1 !== this.brightness) {
            if (!this.isReady(arg0, arg2)) {
                return null;
            }
            this.texels = this.render(arg1, arg3 ? 64 : 128, arg2);
            this.texelSize = arg3 ? 64 : 128;
            this.brightness = arg1;
        }
        return this.texels;
    }

    private render(brightness: number, size: number, sprites: Js5): Int32Array | null {
        const out = new Int32Array(size * size);
        for (let s = 0; s < this.spriteIds.length; s++) {
            if (s > 0 && this.combineModes[s - 1] !== 0) {
                continue; // only combine mode 0 is implemented (465 client parity)
            }
            if (!PixLoader.depack(sprites, this.spriteIds[s], 0)) {
                return null;
            }
            const cw = PixLoader.owi;
            const ch = PixLoader.ohi;
            const sw = PixLoader.wi[0];
            const sh = PixLoader.hi[0];
            const sx = PixLoader.xof[0];
            const sy = PixLoader.yof[0];
            const pix = PixLoader.bspr[0];
            // pad the cropped sprite back to the full canvas (pad = palette index 0 = transparent)
            let idx: Int8Array;
            if (sw === cw && sh === ch && sx === 0 && sy === 0) {
                idx = pix;
            } else {
                idx = new Int8Array(cw * ch);
                for (let y = 0; y < sh; y++) {
                    for (let x = 0; x < sw; x++) {
                        idx[(y + sy) * cw + x + sx] = pix[y * sw + x];
                    }
                }
            }
            // palette: optional grayscale tint (0x03RRGGBB), then gamma
            const pal = new Int32Array(PixLoader.bpal.length);
            const op = this.colourOps[s];
            const tinted = (op & ~0xffffff) === 0x03000000;
            for (let i = 0; i < pal.length; i++) {
                let c = PixLoader.bpal[i];
                if (tinted && (c & 0xffff) === c >> 8) {
                    const g = c & 0xff;
                    c = (((((op >> 16) & 0xff) * g) >> 8) << 16) | (((((op >> 8) & 0xff) * g) >> 8) << 8) | ((((op & 0xff) * g) >> 8) & 0xff);
                }
                pal[i] = GlTexture.adjustBrightness(c, brightness);
            }
            // composite into the texel block with 64<->128 point resample
            if (cw === size) {
                for (let i = 0; i < out.length; i++) {
                    out[i] = pal[idx[i] & 0xff];
                }
            } else if (cw === 64 && size === 128) {
                for (let y = 0; y < 128; y++) {
                    for (let x = 0; x < 128; x++) {
                        out[(y << 7) + x] = pal[idx[((y >> 1) << 6) + (x >> 1)] & 0xff];
                    }
                }
            } else if (cw === 128 && size === 64) {
                for (let y = 0; y < 64; y++) {
                    for (let x = 0; x < 64; x++) {
                        out[(y << 6) + x] = pal[idx[(y << 8) + (x << 1)] & 0xff];
                    }
                }
            } else {
                return null;
            }
        }
        // 464 bake parity (Class4_Sub19.method313 tail): quantize the base bank. Post-gamma
        // texels with r<=7, g<=7, b==0 collapse to 0 = the colour key, eroding the darkest
        // cut-out fringe to transparency exactly like the Java client.
        for (let i = 0; i < out.length; i++) {
            out[i] &= 0xf8f8ff;
        }
        return out;
    }

    private static adjustBrightness(rgb: number, brightness: number): number {
        if (rgb === 0) {
            return 0; // palette 0 stays transparent
        }
        const r = (Math.pow(((rgb >> 16) & 0xff) / 256.0, brightness) * 256.0) | 0;
        const g = (Math.pow(((rgb >> 8) & 0xff) / 256.0, brightness) * 256.0) | 0;
        const b = (Math.pow((rgb & 0xff) / 256.0, brightness) * 256.0) | 0;
        return (r << 16) | (g << 8) | b;
    }

    animate(arg0: number): void {
        if (this.texels === null || (this.scrollYSpeed === 0 && this.scrollXSpeed === 0)) {
            return;
        }
        if (GlTexture.animationBuffer === null || GlTexture.animationBuffer.length < this.texels.length) {
            GlTexture.animationBuffer = new Int32Array(this.texels.length);
        }
        const var5 = this.texelSize;
        const var2 = var5 * var5;
        const var3 = this.scrollXSpeed * arg0;
        const var4 = var2 - 1;
        const var6 = var5 * arg0 * this.scrollYSpeed;
        const var7 = var5 - 1;
        for (let var8 = 0; var8 < var2; var8 += var5) {
            const var9 = (var8 + var6) & var4;
            for (let var10 = 0; var10 < var5; var10++) {
                const var11 = var8 + var10;
                const var12 = var9 + (var7 & (var3 + var10));
                GlTexture.animationBuffer[var11] = this.texels[var12];
            }
        }
        const var13 = this.texels;
        this.texels = GlTexture.animationBuffer;
        GlTexture.animationBuffer = var13;
    }

    finalize(): void {}
}
