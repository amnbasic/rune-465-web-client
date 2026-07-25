import TextureOpBoxBlur from '#/dash3d/TextureOpBoxBlur.js';
import TextureOpBrick from '#/dash3d/TextureOpBrick.js';
import TextureOpChromaReplace from '#/dash3d/TextureOpChromaReplace.js';
import TextureOpClamp from '#/dash3d/TextureOpClamp.js';
import TextureOpClouds from '#/dash3d/TextureOpClouds.js';
import TextureOpColourFill from '#/dash3d/TextureOpColourFill.js';
import TextureOpColourRamp from '#/dash3d/TextureOpColourRamp.js';
import TextureOpColourize from '#/dash3d/TextureOpColourize.js';
import TextureOpCombine from '#/dash3d/TextureOpCombine.js';
import TextureOpCurve from '#/dash3d/TextureOpCurve.js';
import TextureOpDisplace from '#/dash3d/TextureOpDisplace.js';
import TextureOpEdgeDetect from '#/dash3d/TextureOpEdgeDetect.js';
import TextureOpFlip from '#/dash3d/TextureOpFlip.js';
import TextureOpFrame from '#/dash3d/TextureOpFrame.js';
import TextureOpGrayscale from '#/dash3d/TextureOpGrayscale.js';
import TextureOpHSL from '#/dash3d/TextureOpHSL.js';
import TextureOpHashNoise from '#/dash3d/TextureOpHashNoise.js';
import TextureOpImage from '#/dash3d/TextureOpImage.js';
import TextureOpImageTile from '#/dash3d/TextureOpImageTile.js';
import TextureOpInvert from '#/dash3d/TextureOpInvert.js';
import TextureOpLerp from '#/dash3d/TextureOpLerp.js';
import TextureOpLighting from '#/dash3d/TextureOpLighting.js';
import TextureOpMandelbrot from '#/dash3d/TextureOpMandelbrot.js';
import TextureOpMonoAnim from '#/dash3d/TextureOpMonoAnim.js';
import TextureOpMonoConst from '#/dash3d/TextureOpMonoConst.js';
import TextureOpMonoFill from '#/dash3d/TextureOpMonoFill.js';
import TextureOpNormalMap from '#/dash3d/TextureOpNormalMap.js';
import TextureOpPixelate from '#/dash3d/TextureOpPixelate.js';
import TextureOpPolar from '#/dash3d/TextureOpPolar.js';
import TextureOpRadial from '#/dash3d/TextureOpRadial.js';
import TextureOpRemap from '#/dash3d/TextureOpRemap.js';
import TextureOpSineWaves from '#/dash3d/TextureOpSineWaves.js';
import TextureOpSparkle from '#/dash3d/TextureOpSparkle.js';
import TextureOpSprite from '#/dash3d/TextureOpSprite.js';
import TextureOpStar from '#/dash3d/TextureOpStar.js';
import TextureOpStripes from '#/dash3d/TextureOpStripes.js';
import TextureOpThreshold from '#/dash3d/TextureOpThreshold.js';
import TextureOpVector from '#/dash3d/TextureOpVector.js';
import TextureOpVoronoi from '#/dash3d/TextureOpVoronoi.js';
import TextureOpWood from '#/dash3d/TextureOpWood.js';
import type TextureProvider from '#/dash3d/TextureProvider.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class Texture {
    static readonly gammaLut: Int32Array = new Int32Array(256);
    static textureProvider: TextureProvider;
    static sprites: Js5;
    static width: number = 0;
    static columnLut: Int32Array;
    static aspectScale: number = 0;
    static height: number = 0;
    static widthMask: number = 0;
    static rowLut: Int32Array;
    static heightMask: number = 0;
    static lastGamma: number = -1.0;

    readonly ops: TextureOp[];
    readonly alphaOp: TextureOp;
    readonly spriteIds: Int32Array;
    readonly colourOp: TextureOp;
    readonly textureIds: Int32Array;

    constructor();
    constructor(packet: Packet);
    constructor(packet?: Packet) {
        if (!packet) {
            this.spriteIds = new Int32Array(0);
            this.textureIds = new Int32Array(0);
            this.colourOp = new TextureOpMonoFill();
            this.colourOp.opacity = 1;
            this.alphaOp = new TextureOpMonoFill();
            this.ops = [this.colourOp, this.alphaOp];
            this.alphaOp.opacity = 1;
            return;
        }

        const var2 = packet.g1();
        this.ops = new Array<TextureOp>(var2);
        let var3 = 0;
        let var4 = 0;
        const var5: (number[] | null)[] = new Array(var2);
        for (let var6 = 0; var6 < var2; var6++) {
            const var7 = Texture.decodeOp(packet);
            if (var7.getImageId() >= 0) {
                var4++;
            }
            if (var7.getSpriteId() >= 0) {
                var3++;
            }
            const var8 = var7.inputs.length;
            var5[var6] = new Array(var8);
            for (let var9 = 0; var9 < var8; var9++) {
                var5[var6]![var9] = packet.g1();
            }
            this.ops[var6] = var7;
        }
        this.spriteIds = new Int32Array(var4);
        this.textureIds = new Int32Array(var3);
        let var10 = 0;
        let var11 = 0;
        for (let var12 = 0; var12 < var2; var12++) {
            const var13 = this.ops[var12];
            const var14 = var13.inputs.length;
            for (let var15 = 0; var15 < var14; var15++) {
                var13.inputs[var15] = this.ops[var5[var12]![var15]];
            }
            const var16 = var13.getImageId();
            const var17 = var13.getSpriteId();
            if (var16 > 0) {
                this.spriteIds[var10++] = var16;
            }
            if (var17 > 0) {
                this.textureIds[var11++] = var17;
            }
            var5[var12] = null;
        }
        this.colourOp = this.ops[packet.g1()];
        this.alphaOp = this.ops[packet.g1()];
    }

    static createOp(arg0: number): TextureOp | null {
        if (arg0 === 0) {
            return new TextureOpMonoFill();
        } else if (arg0 === 1) {
            return new TextureOpColourFill();
        } else if (arg0 === 2) {
            return new TextureOpMonoConst();
        } else if (arg0 === 3) {
            return new TextureOpMonoAnim();
        } else if (arg0 === 4) {
            return new TextureOpClouds();
        } else if (arg0 === 5) {
            return new TextureOpBoxBlur();
        } else if (arg0 === 6) {
            return new TextureOpClamp();
        } else if (arg0 === 7) {
            return new TextureOpCombine();
        } else if (arg0 === 8) {
            return new TextureOpCurve();
        } else if (arg0 === 9) {
            return new TextureOpFlip();
        } else if (arg0 === 10) {
            return new TextureOpColourRamp();
        } else if (arg0 === 11) {
            return new TextureOpColourize();
        } else if (arg0 === 12) {
            return new TextureOpRadial();
        } else if (arg0 === 13) {
            return new TextureOpHashNoise();
        } else if (arg0 === 14) {
            return new TextureOpFrame();
        } else if (arg0 === 15) {
            return new TextureOpVoronoi();
        } else if (arg0 === 16) {
            return new TextureOpBrick();
        } else if (arg0 === 17) {
            return new TextureOpHSL();
        } else if (arg0 === 18) {
            return new TextureOpImageTile();
        } else if (arg0 === 19) {
            return new TextureOpDisplace();
        } else if (arg0 === 20) {
            return new TextureOpPixelate();
        } else if (arg0 === 21) {
            return new TextureOpLerp();
        } else if (arg0 === 22) {
            return new TextureOpInvert();
        } else if (arg0 === 23) {
            return new TextureOpPolar();
        } else if (arg0 === 24) {
            return new TextureOpGrayscale();
        } else if (arg0 === 25) {
            return new TextureOpChromaReplace();
        } else if (arg0 === 26) {
            return new TextureOpThreshold();
        } else if (arg0 === 27) {
            return new TextureOpStripes();
        } else if (arg0 === 28) {
            return new TextureOpWood();
        } else if (arg0 === 29) {
            return new TextureOpVector();
        } else if (arg0 === 30) {
            return new TextureOpRemap();
        } else if (arg0 === 31) {
            return new TextureOpMandelbrot();
        } else if (arg0 === 32) {
            return new TextureOpLighting();
        } else if (arg0 === 33) {
            return new TextureOpNormalMap();
        } else if (arg0 === 34) {
            return new TextureOpSineWaves();
        } else if (arg0 === 35) {
            return new TextureOpEdgeDetect();
        } else if (arg0 === 36) {
            return new TextureOpSprite();
        } else if (arg0 === 37) {
            return new TextureOpStar();
        } else if (arg0 === 38) {
            return new TextureOpSparkle();
        } else if (arg0 === 39) {
            return new TextureOpImage();
        } else {
            return null;
        }
    }

    static decodeOp(arg0: Packet): TextureOp {
        arg0.g1();
        const var1 = arg0.g1();
        const var2 = Texture.createOp(var1)!;
        var2.opacity = arg0.g1();
        const var3 = arg0.g1();
        for (let var4 = 0; var4 < var3; var4++) {
            const var5 = arg0.g1();
            var2.decode(arg0, var5);
        }
        var2.postDecode();
        return var2;
    }

    static buildGammaLut(arg0: number): void {
        if (Texture.lastGamma === arg0) {
            return;
        }
        for (let var2 = 0; var2 < 256; var2++) {
            const var3 = Math.trunc(Math.pow(var2 / 255.0, arg0) * 255.0);
            Texture.gammaLut[var2] = var3 <= 255 ? var3 : 255;
        }
        Texture.lastGamma = arg0;
    }

    static setDimensions(arg0: number, arg1: number): void {
        if (Texture.width !== arg0) {
            Texture.columnLut = new Int32Array(arg0);
            for (let var2 = 0; var2 < arg0; var2++) {
                Texture.columnLut[var2] = ((var2 << 12) / arg0) | 0;
            }
            Texture.aspectScale = arg0 === 64 ? 2048 : 4096;
            Texture.width = arg0;
            Texture.widthMask = arg0 - 1;
        }
        if (arg1 === Texture.height) {
            return;
        }
        if (Texture.width === arg1) {
            Texture.rowLut = Texture.columnLut;
        } else {
            Texture.rowLut = new Int32Array(arg1);
            for (let var3 = 0; var3 < arg1; var3++) {
                Texture.rowLut[var3] = ((var3 << 12) / arg1) | 0;
            }
        }
        Texture.height = arg1;
        Texture.heightMask = arg1 - 1;
    }

    render(arg0: number, arg1: number, arg2: boolean, arg3: Js5, arg4: TextureProvider, arg5: number, arg6: boolean): Int32Array {
        Texture.buildGammaLut(arg0);
        Texture.textureProvider = arg4;
        Texture.sprites = arg3;
        Texture.setDimensions(arg1, arg5);
        for (let var9 = 0; var9 < this.ops.length; var9++) {
            this.ops[var9].createCache(arg1, arg5);
        }
        const var10 = new Int32Array(arg5 * arg1);
        let var11: number;
        let var12: number;
        let var13: number;
        if (arg6) {
            var11 = -1;
            var12 = arg1 - 1;
            var13 = -1;
        } else {
            var12 = 0;
            var11 = arg1;
            var13 = 1;
        }
        let var14 = 0;
        for (let var15 = 0; var15 < arg5; var15++) {
            if (arg2) {
                var14 = var15;
            }
            let var17: Int32Array;
            let var18: Int32Array;
            let var19: Int32Array;
            if (this.colourOp.monochrome) {
                const var20 = this.colourOp.renderMono(var15);
                var18 = var20;
                var17 = var20;
                var19 = var20;
            } else {
                const var16 = this.colourOp.renderColour(var15);
                var17 = var16[1];
                var18 = var16[0];
                var19 = var16[2];
            }
            for (let var21 = var12; var21 !== var11; var21 += var13) {
                let var22 = var18[var21] >> 4;
                if (var22 > 255) {
                    var22 = 255;
                }
                if (var22 < 0) {
                    var22 = 0;
                }
                const var23 = Texture.gammaLut[var22];
                let var24 = var17[var21] >> 4;
                if (var24 > 255) {
                    var24 = 255;
                }
                let var25 = var19[var21] >> 4;
                if (var24 < 0) {
                    var24 = 0;
                }
                if (var25 > 255) {
                    var25 = 255;
                }
                const var26 = Texture.gammaLut[var24];
                if (var25 < 0) {
                    var25 = 0;
                }
                const var27 = Texture.gammaLut[var25];
                var10[var14++] = var27 + (var26 << 8) + (var23 << 16);
                if (arg2) {
                    var14 += arg1 - 1;
                }
            }
        }
        for (let var28 = 0; var28 < this.ops.length; var28++) {
            this.ops[var28].clearCache();
        }
        return var10;
    }

    isReady(arg0: TextureProvider, arg1: Js5): boolean {
        for (let var3 = 0; var3 < this.spriteIds.length; var3++) {
            if (!arg1.requestDownload(this.spriteIds[var3])) {
                return false;
            }
        }
        for (let var4 = 0; var4 < this.textureIds.length; var4++) {
            if (!arg0.isLoaded(this.textureIds[var4])) {
                return false;
            }
        }
        return true;
    }
}
