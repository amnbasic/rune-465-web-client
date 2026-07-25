import Pix3D from '#/dash3d/Pix3D.js';

import Packet from '#/io/Packet.js';

import FaceNormal from '#/dash3d/FaceNormal.js';
import PointNormal from '#/dash3d/PointNormal.js';
import ModelLit from '#/dash3d/ModelLit.js';
import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';
import SoftwareModelLit from '#/dash3d/SoftwareModelLit.js';
import type Js5 from '#/js5/Js5.js';

export default class ModelUnlit extends ModelSource {
    // jag::oldscape::dash3d::ModelLit::m_numPoints
    numPoints: number = 0;

    // jag::oldscape::dash3d::ModelLit::m_pointX
    pointX: Int32Array | null = null;

    // jag::oldscape::dash3d::ModelLit::m_pointY
    pointY: Int32Array | null = null;

    // jag::oldscape::dash3d::ModelLit::m_pointZ
    pointZ: Int32Array | null = null;

    // jag::oldscape::dash3d::ModelLit::m_numFaces
    numFaces: number = 0;

    faceVertexA: Int32Array | null = null;
    faceVertexB: Int32Array | null = null;
    faceVertexC: Int32Array | null = null;
    faceRenderType: Int8Array | null = null;
    facePriority: Int8Array | null = null;
    faceAlpha: Int8Array | null = null;
    faceTextureAxis: Int8Array | null = null;
    faceColour: Int16Array | null = null;
    faceTextureId: Int16Array | null = null;
    priority: number = 0;

    // jag::oldscape::dash3d::ModelLit::m_numT
    numT: number = 0;

    textureRenderType: Int8Array | null = null;
    faceTextureP: Int16Array | null = null;
    faceTextureM: Int16Array | null = null;
    faceTextureN: Int16Array | null = null;
    textureScaleX: Int16Array | null = null;
    textureScaleY: Int16Array | null = null;
    textureScaleZ: Int16Array | null = null;
    textureRotation: Int8Array | null = null;
    textureSpeed: Int8Array | null = null;
    textureDirection: Int8Array | null = null;
    textureTranslation: Int8Array | null = null;
    vertexLabel: Int32Array | null = null;
    faceLabel: Int32Array | null = null;
    labelVertices: (Int32Array | null)[] | null = null;
    labelFaces: (Int32Array | null)[] | null = null;
    faceNormal: (FaceNormal | null)[] | null = null;
    pointNormal: (PointNormal | null)[] | null = null;
    sharedPointNormal: (PointNormal | null)[] | null = null;
    ambient: number = 0;
    contrast: number = 0;
    boundsCalculated: boolean = false;
    maxY: number = 0;
    minX: number = 0;
    maxX: number = 0;
    minZ: number = 0;
    maxZ: number = 0;

    // jag::oldscape::dash3d::ModelUnlitImpl::m_shareMap
    static readonly shareMap: Int32Array = new Int32Array(10000);

    // jag::oldscape::dash3d::ModelUnlitImpl::m_shareMap2
    static readonly shareMap2: Int32Array = new Int32Array(10000);

    // jag::oldscape::dash3d::ModelUnlitImpl::m_shareTic
    static shareTic: number = 0;

    static readonly sinTable: Int32Array = Pix3D.sinTable;
    static readonly cosTable: Int32Array = Pix3D.cosTable;

    // todo: identify
    field1519: number = 0;
    field1502: Int8Array | null = null;

    static method543(arg0: Int32Array[], arg1: number, arg2: number): number {
        const var3 = arg1 >> 7;
        const var4 = arg2 >> 7;
        if (var3 < 0 || var4 < 0 || var3 >= arg0.length || var4 >= arg0[0].length) {
            return 0;
        }
        const var5 = arg1 & 0x7f;
        const var6 = arg2 & 0x7f;
        const var7 = (arg0[var3][var4] * (128 - var5) + arg0[var3 + 1][var4] * var5) >> 7;
        const var8 = (arg0[var3][var4 + 1] * (128 - var5) + arg0[var3 + 1][var4 + 1] * var5) >> 7;
        return (var7 * (128 - var6) + var8 * var6) >> 7;
    }

    static load(arg0: Js5, arg1: number): ModelUnlit | null {
        const var2 = arg0.getFile(0, arg1);
        return var2 === null ? null : new ModelUnlit(var2);
    }

    constructor();
    constructor(src: Uint8Array);
    constructor(models: (ModelUnlit | null)[], count: number);
    constructor(src: ModelUnlit, arg1: boolean, arg2: boolean, arg3: boolean, arg4: boolean);
    constructor(src?: Uint8Array | (ModelUnlit | null)[] | ModelUnlit, count?: number | boolean, arg2?: boolean, arg3?: boolean, _arg4?: boolean) {
        super();
        if (src instanceof ModelUnlit) {
            const arg0: ModelUnlit = src;
            const arg1: boolean = count as boolean;
            this.numPoints = arg0.numPoints;
            this.numFaces = arg0.numFaces;
            this.numT = arg0.numT;
            if (arg1) {
                this.pointX = arg0.pointX;
                this.pointY = arg0.pointY;
                this.pointZ = arg0.pointZ;
            } else {
                this.pointX = new Int32Array(this.numPoints);
                this.pointY = new Int32Array(this.numPoints);
                this.pointZ = new Int32Array(this.numPoints);
                for (let var6: number = 0; var6 < this.numPoints; var6++) {
                    this.pointX[var6] = arg0.pointX![var6];
                    this.pointY[var6] = arg0.pointY![var6];
                    this.pointZ[var6] = arg0.pointZ![var6];
                }
            }
            if (arg2) {
                this.faceColour = arg0.faceColour;
            } else {
                this.faceColour = new Int16Array(this.numFaces);
                for (let var7: number = 0; var7 < this.numFaces; var7++) {
                    this.faceColour[var7] = arg0.faceColour![var7];
                }
            }
            if (arg3 || arg0.faceTextureId === null) {
                this.faceTextureId = arg0.faceTextureId;
            } else {
                this.faceTextureId = new Int16Array(this.numFaces);
                for (let var8: number = 0; var8 < this.numFaces; var8++) {
                    this.faceTextureId[var8] = arg0.faceTextureId[var8];
                }
            }
            this.faceAlpha = arg0.faceAlpha;
            this.faceVertexA = arg0.faceVertexA;
            this.faceVertexB = arg0.faceVertexB;
            this.faceVertexC = arg0.faceVertexC;
            this.faceRenderType = arg0.faceRenderType;
            this.facePriority = arg0.facePriority;
            this.faceTextureAxis = arg0.faceTextureAxis;
            this.priority = arg0.priority;
            this.textureRenderType = arg0.textureRenderType;
            this.faceTextureP = arg0.faceTextureP;
            this.faceTextureM = arg0.faceTextureM;
            this.faceTextureN = arg0.faceTextureN;
            this.textureScaleX = arg0.textureScaleX;
            this.textureScaleY = arg0.textureScaleY;
            this.textureScaleZ = arg0.textureScaleZ;
            this.textureRotation = arg0.textureRotation;
            this.textureSpeed = arg0.textureSpeed;
            this.textureDirection = arg0.textureDirection;
            this.textureTranslation = arg0.textureTranslation;
            this.field1502 = arg0.field1502;
            this.vertexLabel = arg0.vertexLabel;
            this.faceLabel = arg0.faceLabel;
            this.labelVertices = arg0.labelVertices;
            this.labelFaces = arg0.labelFaces;
            this.pointNormal = arg0.pointNormal;
            this.faceNormal = arg0.faceNormal;
            this.sharedPointNormal = arg0.sharedPointNormal;
            this.ambient = arg0.ambient;
            this.contrast = arg0.contrast;
        } else if (Array.isArray(src)) {
            const arg0: (ModelUnlit | null)[] = src;
            const arg1: number = count as number;
            let var3: boolean = false;
            let var4: boolean = false;
            let var5: boolean = false;
            let var6: boolean = false;
            let var7: boolean = false;
            let var8: boolean = false;
            this.numPoints = 0;
            this.numFaces = 0;
            this.numT = 0;
            this.priority = -1;
            for (let var9: number = 0; var9 < arg1; var9++) {
                const var10: ModelUnlit | null = arg0[var9];
                if (var10 !== null) {
                    this.numPoints += var10.numPoints;
                    this.numFaces += var10.numFaces;
                    this.numT += var10.numT;
                    if (var10.facePriority === null) {
                        if (this.priority === -1) {
                            this.priority = var10.priority;
                        }
                        if (this.priority !== var10.priority) {
                            var4 = true;
                        }
                    } else {
                        var4 = true;
                    }
                    var3 ||= var10.faceRenderType !== null;
                    var5 ||= var10.faceAlpha !== null;
                    var6 ||= var10.faceLabel !== null;
                    var7 ||= var10.faceTextureId !== null;
                    var8 ||= var10.faceTextureAxis !== null;
                }
            }
            this.pointX = new Int32Array(this.numPoints);
            this.pointY = new Int32Array(this.numPoints);
            this.pointZ = new Int32Array(this.numPoints);
            this.vertexLabel = new Int32Array(this.numPoints);
            this.faceVertexA = new Int32Array(this.numFaces);
            this.faceVertexB = new Int32Array(this.numFaces);
            this.faceVertexC = new Int32Array(this.numFaces);
            if (var3) {
                this.faceRenderType = new Int8Array(this.numFaces);
            }
            if (var4) {
                this.facePriority = new Int8Array(this.numFaces);
            }
            if (var5) {
                this.faceAlpha = new Int8Array(this.numFaces);
            }
            if (var6) {
                this.faceLabel = new Int32Array(this.numFaces);
            }
            if (var7) {
                this.faceTextureId = new Int16Array(this.numFaces);
            }
            if (var8) {
                this.faceTextureAxis = new Int8Array(this.numFaces);
            }
            this.faceColour = new Int16Array(this.numFaces);
            if (this.numT > 0) {
                this.textureRenderType = new Int8Array(this.numT);
                this.faceTextureP = new Int16Array(this.numT);
                this.faceTextureM = new Int16Array(this.numT);
                this.faceTextureN = new Int16Array(this.numT);
                this.textureScaleX = new Int16Array(this.numT);
                this.textureScaleY = new Int16Array(this.numT);
                this.textureScaleZ = new Int16Array(this.numT);
                this.textureRotation = new Int8Array(this.numT);
                this.textureSpeed = new Int8Array(this.numT);
                this.textureDirection = new Int8Array(this.numT);
                this.textureTranslation = new Int8Array(this.numT);
                this.field1502 = new Int8Array(this.numT);
            }
            this.numPoints = 0;
            this.numFaces = 0;
            this.numT = 0;
            for (let var11: number = 0; var11 < arg1; var11++) {
                const var12: ModelUnlit | null = arg0[var11];
                if (var12 !== null) {
                    for (let var13: number = 0; var13 < var12.numFaces; var13++) {
                        if (var3 && var12.faceRenderType !== null) {
                            this.faceRenderType![this.numFaces] = var12.faceRenderType[var13];
                        }
                        if (var4) {
                            if (var12.facePriority === null) {
                                this.facePriority![this.numFaces] = var12.priority;
                            } else {
                                this.facePriority![this.numFaces] = var12.facePriority[var13];
                            }
                        }
                        if (var5 && var12.faceAlpha !== null) {
                            this.faceAlpha![this.numFaces] = var12.faceAlpha[var13];
                        }
                        if (var6 && var12.faceLabel !== null) {
                            this.faceLabel![this.numFaces] = var12.faceLabel[var13];
                        }
                        if (var7) {
                            if (var12.faceTextureId === null) {
                                this.faceTextureId![this.numFaces] = -1;
                            } else {
                                this.faceTextureId![this.numFaces] = var12.faceTextureId[var13];
                            }
                        }
                        if (var8) {
                            if (var12.faceTextureAxis === null || var12.faceTextureAxis[var13] === -1) {
                                this.faceTextureAxis![this.numFaces] = -1;
                            } else {
                                this.faceTextureAxis![this.numFaces] = var12.faceTextureAxis[var13] + this.numT;
                            }
                        }
                        this.faceColour[this.numFaces] = var12.faceColour![var13];
                        this.faceVertexA[this.numFaces] = this.addPoint(var12, var12.faceVertexA![var13]);
                        this.faceVertexB[this.numFaces] = this.addPoint(var12, var12.faceVertexB![var13]);
                        this.faceVertexC[this.numFaces] = this.addPoint(var12, var12.faceVertexC![var13]);
                        this.numFaces++;
                    }
                    for (let var14: number = 0; var14 < var12.numT; var14++) {
                        const var15: number = (this.textureRenderType![this.numT] = var12.textureRenderType![var14]);
                        if (var15 === 0) {
                            this.faceTextureP![this.numT] = this.addPoint(var12, var12.faceTextureP![var14]);
                            this.faceTextureM![this.numT] = this.addPoint(var12, var12.faceTextureM![var14]);
                            this.faceTextureN![this.numT] = this.addPoint(var12, var12.faceTextureN![var14]);
                        }
                        if (var15 >= 1 && var15 <= 3) {
                            this.faceTextureP![this.numT] = var12.faceTextureP![var14];
                            this.faceTextureM![this.numT] = var12.faceTextureM![var14];
                            this.faceTextureN![this.numT] = var12.faceTextureN![var14];
                            this.textureScaleX![this.numT] = var12.textureScaleX![var14];
                            this.textureScaleY![this.numT] = var12.textureScaleY![var14];
                            this.textureScaleZ![this.numT] = var12.textureScaleZ![var14];
                            this.textureRotation![this.numT] = var12.textureRotation![var14];
                            this.textureSpeed![this.numT] = var12.textureSpeed![var14];
                            this.textureDirection![this.numT] = var12.textureDirection![var14];
                        }
                        if (var15 === 2) {
                            this.textureTranslation![this.numT] = var12.textureTranslation![var14];
                            this.field1502![this.numT] = var12.field1502![var14];
                        }
                        this.numT++;
                    }
                }
            }
        } else if (src) {
            if (src[src.length - 1] === 0xff && src[src.length - 2] === 0xff) {
                this.loadOb3(src);
            } else {
                this.loadOb2(src);
            }
        }
    }

    override method570(arg0: ModelSource, arg1: number, arg2: number, arg3: number, arg4: boolean): void {
        const var6: ModelUnlit = arg0 as ModelUnlit;
        var6.calcBoundingCube();
        var6.calculateNormals();
        ModelUnlit.shareTic++;
        let var7: number = 0;
        const var8: Int32Array = var6.pointX!;
        const var9: number = var6.numPoints;
        for (let var10: number = 0; var10 < this.numPoints; var10++) {
            const var11: PointNormal = this.pointNormal![var10]!;
            if (var11.w !== 0) {
                const var12: number = this.pointY![var10] - arg2;
                if (var12 >= var6.field1519 && var12 <= var6.maxY) {
                    const var13: number = this.pointX![var10] - arg1;
                    if (var13 >= var6.minX && var13 <= var6.maxX) {
                        const var14: number = this.pointZ![var10] - arg3;
                        if (var14 >= var6.minZ && var14 <= var6.maxZ) {
                            for (let var15: number = 0; var15 < var9; var15++) {
                                const var16: PointNormal = var6.pointNormal![var15]!;
                                if (var13 === var8[var15] && var14 === var6.pointZ![var15] && var12 === var6.pointY![var15] && var16.w !== 0) {
                                    if (this.sharedPointNormal === null) {
                                        this.sharedPointNormal = new Array(this.numPoints).fill(null);
                                    }
                                    if (var6.sharedPointNormal === null) {
                                        var6.sharedPointNormal = new Array(var9).fill(null);
                                    }
                                    let var17: PointNormal | null = this.sharedPointNormal[var10];
                                    if (var17 === null) {
                                        var17 = this.sharedPointNormal[var10] = new PointNormal(var11);
                                    }
                                    let var18: PointNormal | null = var6.sharedPointNormal[var15];
                                    if (var18 === null) {
                                        var18 = var6.sharedPointNormal[var15] = new PointNormal(var16);
                                    }
                                    var17.x += var16.x;
                                    var17.y += var16.y;
                                    var17.z += var16.z;
                                    var17.w += var16.w;
                                    var18.x += var11.x;
                                    var18.y += var11.y;
                                    var18.z += var11.z;
                                    var18.w += var11.w;
                                    var7++;
                                    ModelUnlit.shareMap[var10] = ModelUnlit.shareTic;
                                    ModelUnlit.shareMap2[var15] = ModelUnlit.shareTic;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (var7 < 3 || !arg4) {
            return;
        }
        for (let var19: number = 0; var19 < this.numFaces; var19++) {
            if (ModelUnlit.shareMap[this.faceVertexA![var19]] === ModelUnlit.shareTic && ModelUnlit.shareMap[this.faceVertexB![var19]] === ModelUnlit.shareTic && ModelUnlit.shareMap[this.faceVertexC![var19]] === ModelUnlit.shareTic) {
                if (this.faceRenderType === null) {
                    this.faceRenderType = new Int8Array(this.numFaces);
                }
                this.faceRenderType[var19] = 2;
            }
        }
        for (let var20: number = 0; var20 < var6.numFaces; var20++) {
            if (ModelUnlit.shareMap2[var6.faceVertexA![var20]] === ModelUnlit.shareTic && ModelUnlit.shareMap2[var6.faceVertexB![var20]] === ModelUnlit.shareTic && ModelUnlit.shareMap2[var6.faceVertexC![var20]] === ModelUnlit.shareTic) {
                if (var6.faceRenderType === null) {
                    var6.faceRenderType = new Int8Array(var6.numFaces);
                }
                var6.faceRenderType[var20] = 2;
            }
        }
    }

    loadOb2(arg0: Uint8Array): void {
        let var2 = false;
        let var3 = false;
        const var4 = new Packet(arg0);
        const var5 = new Packet(arg0);
        const var6 = new Packet(arg0);
        const var7 = new Packet(arg0);
        const var8 = new Packet(arg0);
        var4.pos = arg0.length - 18;
        const var9 = var4.g2();
        const var10 = var4.g2();
        const var11 = var4.g1();
        const var12 = var4.g1();
        const var13 = var4.g1();
        const var14 = var4.g1();
        const var15 = var4.g1();
        const var16 = var4.g1();
        const var17 = var4.g2();
        const var18 = var4.g2();
        const var19 = var4.g2();
        const var20 = var4.g2();
        const var21 = var9;
        let var23 = var21 + var10;
        const var24 = var23;
        if (var13 === 255) {
            var23 += var10;
        }
        const var25 = var23;
        if (var15 === 1) {
            var23 += var10;
        }
        const var26 = var23;
        if (var12 === 1) {
            var23 += var10;
        }
        const var27 = var23;
        if (var16 === 1) {
            var23 += var9;
        }
        const var28 = var23;
        if (var14 === 1) {
            var23 += var10;
        }
        const var30 = var23 + var20;
        const var32 = var30 + var10 * 2;
        const var34 = var32 + var11 * 6;
        const var36 = var34 + var17;
        const var38 = var36 + var18;
        this.numPoints = var9;
        this.numFaces = var10;
        this.numT = var11;
        this.pointX = new Int32Array(var9);
        this.pointY = new Int32Array(var9);
        this.pointZ = new Int32Array(var9);
        this.faceVertexA = new Int32Array(var10);
        this.faceVertexB = new Int32Array(var10);
        this.faceVertexC = new Int32Array(var10);
        if (var11 > 0) {
            this.textureRenderType = new Int8Array(var11);
            this.faceTextureP = new Int16Array(var11);
            this.faceTextureM = new Int16Array(var11);
            this.faceTextureN = new Int16Array(var11);
        }
        if (var16 === 1) {
            this.vertexLabel = new Int32Array(var9);
        }
        if (var12 === 1) {
            this.faceRenderType = new Int8Array(var10);
            this.faceTextureAxis = new Int8Array(var10);
            this.faceTextureId = new Int16Array(var10);
        }
        if (var13 === 255) {
            this.facePriority = new Int8Array(var10);
        } else {
            this.priority = var13;
        }
        if (var14 === 1) {
            this.faceAlpha = new Int8Array(var10);
        }
        if (var15 === 1) {
            this.faceLabel = new Int32Array(var10);
        }
        this.faceColour = new Int16Array(var10);
        var4.pos = 0;
        var5.pos = var34;
        var6.pos = var36;
        var7.pos = var38;
        var8.pos = var27;
        let var40 = 0;
        let var41 = 0;
        let var42 = 0;
        for (let var43 = 0; var43 < var9; var43++) {
            const var44 = var4.g1();
            let var45 = 0;
            if ((var44 & 0x1) !== 0) {
                var45 = var5.method342();
            }
            let var46 = 0;
            if ((var44 & 0x2) !== 0) {
                var46 = var6.method342();
            }
            let var47 = 0;
            if ((var44 & 0x4) !== 0) {
                var47 = var7.method342();
            }
            this.pointX[var43] = var40 + var45;
            this.pointY[var43] = var41 + var46;
            this.pointZ[var43] = var42 + var47;
            var40 = this.pointX[var43];
            var41 = this.pointY[var43];
            var42 = this.pointZ[var43];
            if (var16 === 1) {
                this.vertexLabel![var43] = var8.g1();
            }
        }
        var4.pos = var30;
        var5.pos = var26;
        var6.pos = var24;
        var7.pos = var28;
        var8.pos = var25;
        for (let var48 = 0; var48 < var10; var48++) {
            this.faceColour[var48] = var4.g2();
            if (var12 === 1) {
                const var49 = var5.g1();
                if ((var49 & 0x1) === 1) {
                    this.faceRenderType![var48] = 1;
                    var2 = true;
                } else {
                    this.faceRenderType![var48] = 0;
                }
                if ((var49 & 0x2) === 2) {
                    this.faceTextureAxis![var48] = var49 >> 2;
                    this.faceTextureId![var48] = this.faceColour[var48];
                    this.faceColour[var48] = 127;
                    if (this.faceTextureId![var48] !== -1) {
                        var3 = true;
                    }
                } else {
                    this.faceTextureAxis![var48] = -1;
                    this.faceTextureId![var48] = -1;
                }
            }
            if (var13 === 255) {
                this.facePriority![var48] = var6.g1b();
            }
            if (var14 === 1) {
                this.faceAlpha![var48] = var7.g1b();
            }
            if (var15 === 1) {
                this.faceLabel![var48] = var8.g1();
            }
        }
        var4.pos = var23;
        var5.pos = var21;
        let var50 = 0;
        let var51 = 0;
        let var52 = 0;
        let var53 = 0;
        for (let var54 = 0; var54 < var10; var54++) {
            const var55 = var5.g1();
            if (var55 === 1) {
                var50 = var4.method342() + var53;
                var51 = var4.method342() + var50;
                var52 = var4.method342() + var51;
                var53 = var52;
                this.faceVertexA[var54] = var50;
                this.faceVertexB[var54] = var51;
                this.faceVertexC[var54] = var52;
            }
            if (var55 === 2) {
                var51 = var52;
                var52 = var4.method342() + var53;
                var53 = var52;
                this.faceVertexA[var54] = var50;
                this.faceVertexB[var54] = var51;
                this.faceVertexC[var54] = var52;
            }
            if (var55 === 3) {
                var50 = var52;
                var52 = var4.method342() + var53;
                var53 = var52;
                this.faceVertexA[var54] = var50;
                this.faceVertexB[var54] = var51;
                this.faceVertexC[var54] = var52;
            }
            if (var55 === 4) {
                const var56 = var50;
                var50 = var51;
                var51 = var56;
                var52 = var4.method342() + var53;
                var53 = var52;
                this.faceVertexA[var54] = var50;
                this.faceVertexB[var54] = var56;
                this.faceVertexC[var54] = var52;
            }
        }
        var4.pos = var32;
        for (let var57 = 0; var57 < var11; var57++) {
            this.textureRenderType![var57] = 0;
            this.faceTextureP![var57] = var4.g2();
            this.faceTextureM![var57] = var4.g2();
            this.faceTextureN![var57] = var4.g2();
        }
        if (this.faceTextureAxis !== null) {
            let var58 = false;
            for (let var59 = 0; var59 < var10; var59++) {
                const var60 = this.faceTextureAxis[var59] & 0xff;
                if (var60 !== 255) {
                    if ((this.faceTextureP![var60] & 0xffff) === this.faceVertexA[var59] && (this.faceTextureM![var60] & 0xffff) === this.faceVertexB[var59] && (this.faceTextureN![var60] & 0xffff) === this.faceVertexC[var59]) {
                        this.faceTextureAxis[var59] = -1;
                    } else {
                        var58 = true;
                    }
                }
            }
            if (!var58) {
                this.faceTextureAxis = null;
            }
        }
        if (!var3) {
            this.faceTextureId = null;
        }
        if (!var2) {
            this.faceRenderType = null;
        }
    }

    loadOb3(arg0: Uint8Array): void {
        const var2 = new Packet(arg0);
        const var3 = new Packet(arg0);
        const var4 = new Packet(arg0);
        const var5 = new Packet(arg0);
        const var6 = new Packet(arg0);
        const var7 = new Packet(arg0);
        const var8 = new Packet(arg0);
        var2.pos = arg0.length - 23;
        const var9: number = var2.g2();
        const var10: number = var2.g2();
        const var11: number = var2.g1();
        const var12: number = var2.g1();
        const var13: number = var2.g1();
        const var14: number = var2.g1();
        const var15: number = var2.g1();
        const var16: number = var2.g1();
        const var17: number = var2.g1();
        const var18: number = var2.g2();
        const var19: number = var2.g2();
        const var20: number = var2.g2();
        const var21: number = var2.g2();
        const var22: number = var2.g2();
        let var23: number = 0;
        let var24: number = 0;
        let var25: number = 0;
        if (var11 > 0) {
            this.textureRenderType = new Int8Array(var11);
            var2.pos = 0;
            for (let var26: number = 0; var26 < var11; var26++) {
                const var27: number = (this.textureRenderType[var26] = var2.g1b());
                if (var27 === 0) {
                    var23++;
                }
                if (var27 >= 1 && var27 <= 3) {
                    var24++;
                }
                if (var27 === 2) {
                    var25++;
                }
            }
        }
        let var29: number = var11 + var9;
        const var30: number = var29;
        if (var12 === 1) {
            var29 += var10;
        }
        let var32: number = var29 + var10;
        const var33: number = var32;
        if (var13 === 255) {
            var32 += var10;
        }
        const var34: number = var32;
        if (var15 === 1) {
            var32 += var10;
        }
        const var35: number = var32;
        if (var17 === 1) {
            var32 += var9;
        }
        const var36: number = var32;
        if (var14 === 1) {
            var32 += var10;
        }
        let var38: number = var32 + var21;
        const var39: number = var38;
        if (var16 === 1) {
            var38 += var10 * 2;
        }
        const var41: number = var38 + var22;
        const var43: number = var41 + var10 * 2;
        const var45: number = var43 + var18;
        const var47: number = var45 + var19;
        const var49: number = var47 + var20;
        const var51: number = var49 + var23 * 6;
        const var53: number = var51 + var24 * 6;
        const var55: number = var53 + var24 * 6;
        const var57: number = var55 + var24;
        const var59: number = var57 + var24;
        this.numPoints = var9;
        this.numFaces = var10;
        this.numT = var11;
        this.pointX = new Int32Array(var9);
        this.pointY = new Int32Array(var9);
        this.pointZ = new Int32Array(var9);
        this.faceVertexA = new Int32Array(var10);
        this.faceVertexB = new Int32Array(var10);
        this.faceVertexC = new Int32Array(var10);
        if (var17 === 1) {
            this.vertexLabel = new Int32Array(var9);
        }
        if (var12 === 1) {
            this.faceRenderType = new Int8Array(var10);
        }
        if (var13 === 255) {
            this.facePriority = new Int8Array(var10);
        } else {
            this.priority = var13 > 127 ? var13 - 256 : var13;
        }
        if (var14 === 1) {
            this.faceAlpha = new Int8Array(var10);
        }
        if (var15 === 1) {
            this.faceLabel = new Int32Array(var10);
        }
        if (var16 === 1) {
            this.faceTextureId = new Int16Array(var10);
        }
        if (var16 === 1 && var11 > 0) {
            this.faceTextureAxis = new Int8Array(var10);
        }
        this.faceColour = new Int16Array(var10);
        if (var11 > 0) {
            this.faceTextureP = new Int16Array(var11);
            this.faceTextureM = new Int16Array(var11);
            this.faceTextureN = new Int16Array(var11);
            if (var24 > 0) {
                this.textureScaleX = new Int16Array(var24);
                this.textureScaleY = new Int16Array(var24);
                this.textureScaleZ = new Int16Array(var24);
                this.textureRotation = new Int8Array(var24);
                this.textureSpeed = new Int8Array(var24);
                this.textureDirection = new Int8Array(var24);
            }
            if (var25 > 0) {
                this.textureTranslation = new Int8Array(var25);
                this.field1502 = new Int8Array(var25);
            }
        }
        var2.pos = var11;
        var3.pos = var43;
        var4.pos = var45;
        var5.pos = var47;
        var6.pos = var35;
        let var61: number = 0;
        let var62: number = 0;
        let var63: number = 0;
        for (let var64: number = 0; var64 < var9; var64++) {
            const var65: number = var2.g1();
            let var66: number = 0;
            if ((var65 & 0x1) !== 0) {
                var66 = var3.method342();
            }
            let var67: number = 0;
            if ((var65 & 0x2) !== 0) {
                var67 = var4.method342();
            }
            let var68: number = 0;
            if ((var65 & 0x4) !== 0) {
                var68 = var5.method342();
            }
            this.pointX[var64] = var61 + var66;
            this.pointY[var64] = var62 + var67;
            this.pointZ[var64] = var63 + var68;
            var61 = this.pointX[var64];
            var62 = this.pointY[var64];
            var63 = this.pointZ[var64];
            if (var17 === 1) {
                this.vertexLabel![var64] = var6.g1();
            }
        }
        var2.pos = var41;
        var3.pos = var30;
        var4.pos = var33;
        var5.pos = var36;
        var6.pos = var34;
        var7.pos = var39;
        var8.pos = var38;
        for (let var69: number = 0; var69 < var10; var69++) {
            this.faceColour[var69] = var2.g2();
            if (var12 === 1) {
                this.faceRenderType![var69] = var3.g1b();
            }
            if (var13 === 255) {
                this.facePriority![var69] = var4.g1b();
            }
            if (var14 === 1) {
                this.faceAlpha![var69] = var5.g1b();
            }
            if (var15 === 1) {
                this.faceLabel![var69] = var6.g1();
            }
            if (var16 === 1) {
                this.faceTextureId![var69] = var7.g2() - 1;
            }
            if (this.faceTextureAxis !== null) {
                if (this.faceTextureId![var69] === -1) {
                    this.faceTextureAxis[var69] = -1;
                } else {
                    this.faceTextureAxis[var69] = var8.g1() - 1;
                }
            }
        }
        var2.pos = var32;
        var3.pos = var29;
        let var70: number = 0;
        let var71: number = 0;
        let var72: number = 0;
        let var73: number = 0;
        for (let var74: number = 0; var74 < var10; var74++) {
            const var75: number = var3.g1();
            if (var75 === 1) {
                var70 = var2.method342() + var73;
                var71 = var2.method342() + var70;
                var72 = var2.method342() + var71;
                var73 = var72;
                this.faceVertexA[var74] = var70;
                this.faceVertexB[var74] = var71;
                this.faceVertexC[var74] = var72;
            }
            if (var75 === 2) {
                var71 = var72;
                var72 = var2.method342() + var73;
                var73 = var72;
                this.faceVertexA[var74] = var70;
                this.faceVertexB[var74] = var71;
                this.faceVertexC[var74] = var72;
            }
            if (var75 === 3) {
                var70 = var72;
                var72 = var2.method342() + var73;
                var73 = var72;
                this.faceVertexA[var74] = var70;
                this.faceVertexB[var74] = var71;
                this.faceVertexC[var74] = var72;
            }
            if (var75 === 4) {
                const var76: number = var70;
                var70 = var71;
                var71 = var76;
                var72 = var2.method342() + var73;
                var73 = var72;
                this.faceVertexA[var74] = var70;
                this.faceVertexB[var74] = var76;
                this.faceVertexC[var74] = var72;
            }
        }
        var2.pos = var49;
        var3.pos = var51;
        var4.pos = var53;
        var5.pos = var55;
        var6.pos = var57;
        var7.pos = var59;
        for (let var77: number = 0; var77 < var11; var77++) {
            const var78: number = this.textureRenderType![var77] & 0xff;
            if (var78 === 0) {
                this.faceTextureP![var77] = var2.g2();
                this.faceTextureM![var77] = var2.g2();
                this.faceTextureN![var77] = var2.g2();
            }
            if (var78 === 1) {
                this.faceTextureP![var77] = var3.g2();
                this.faceTextureM![var77] = var3.g2();
                this.faceTextureN![var77] = var3.g2();
                this.textureScaleX![var77] = var4.g2();
                this.textureScaleY![var77] = var4.g2();
                this.textureScaleZ![var77] = var4.g2();
                this.textureRotation![var77] = var5.g1b();
                this.textureSpeed![var77] = var6.g1b();
                this.textureDirection![var77] = var7.g1b();
            }
            if (var78 === 2) {
                this.faceTextureP![var77] = var3.g2();
                this.faceTextureM![var77] = var3.g2();
                this.faceTextureN![var77] = var3.g2();
                this.textureScaleX![var77] = var4.g2();
                this.textureScaleY![var77] = var4.g2();
                this.textureScaleZ![var77] = var4.g2();
                this.textureRotation![var77] = var5.g1b();
                this.textureSpeed![var77] = var6.g1b();
                this.textureDirection![var77] = var7.g1b();
                this.textureTranslation![var77] = var7.g1b();
                this.field1502![var77] = var7.g1b();
            }
            if (var78 === 3) {
                this.faceTextureP![var77] = var3.g2();
                this.faceTextureM![var77] = var3.g2();
                this.faceTextureN![var77] = var3.g2();
                this.textureScaleX![var77] = var4.g2();
                this.textureScaleY![var77] = var4.g2();
                this.textureScaleZ![var77] = var4.g2();
                this.textureRotation![var77] = var5.g1b();
                this.textureSpeed![var77] = var6.g1b();
                this.textureDirection![var77] = var7.g1b();
            }
        }
    }

    addPoint(arg0: ModelUnlit, arg1: number): number {
        let var3: number = -1;
        const var4: number = arg0.pointX![arg1];
        const var5: number = arg0.pointY![arg1];
        const var6: number = arg0.pointZ![arg1];
        for (let var7: number = 0; var7 < this.numPoints; var7++) {
            if (var4 === this.pointX![var7] && var5 === this.pointY![var7] && var6 === this.pointZ![var7]) {
                var3 = var7;
                break;
            }
        }

        if (var3 === -1) {
            this.pointX![this.numPoints] = var4;
            this.pointY![this.numPoints] = var5;
            this.pointZ![this.numPoints] = var6;

            if (arg0.vertexLabel !== null) {
                this.vertexLabel![this.numPoints] = arg0.vertexLabel[arg1];
            }

            var3 = this.numPoints++;
        }

        return var3;
    }

    override method544(): boolean {
        return true;
    }

    override method88(): number {
        if (!this.boundsCalculated) {
            this.calcBoundingCube();
        }

        return this.field1519;
    }

    override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void {}

    hillSkew(arg0: number, arg1: number, arg2: Int32Array[], arg3: Int32Array[] | null, arg4: number, arg5: number, arg6: number): ModelUnlit {
        this.calcBoundingCube();
        const var8 = arg4 + this.minX;
        const var9 = arg4 + this.maxX;
        const var10 = arg6 + this.minZ;
        const var11 = arg6 + this.maxZ;
        if ((arg0 === 1 || arg0 === 2 || arg0 === 3 || arg0 === 5) && (var8 < 0 || (var9 + 128) >> 7 >= arg2.length || var10 < 0 || (var11 + 128) >> 7 >= arg2[0].length)) {
            return this;
        }
        if (arg0 === 4 || arg0 === 5) {
            if (arg3 === null) {
                return this;
            }
            if (var8 < 0 || (var9 + 128) >> 7 >= arg3.length || var10 < 0 || (var11 + 128) >> 7 >= arg3[0].length) {
                return this;
            }
        } else {
            const var12 = var8 >> 7;
            const var13 = (var9 + 127) >> 7;
            const var14 = var10 >> 7;
            const var15 = (var11 + 127) >> 7;
            if (arg2[var12][var14] === arg5 && arg2[var13][var14] === arg5 && arg2[var12][var15] === arg5 && arg2[var13][var15] === arg5) {
                return this;
            }
        }

        const var16 = new ModelUnlit();
        var16.numPoints = this.numPoints;
        var16.numFaces = this.numFaces;
        var16.numT = this.numT;
        var16.faceVertexA = this.faceVertexA;
        var16.faceVertexB = this.faceVertexB;
        var16.faceVertexC = this.faceVertexC;
        var16.faceRenderType = this.faceRenderType;
        var16.facePriority = this.facePriority;
        var16.faceAlpha = this.faceAlpha;
        var16.faceTextureAxis = this.faceTextureAxis;
        var16.faceColour = this.faceColour;
        var16.faceTextureId = this.faceTextureId;
        var16.priority = this.priority;
        var16.textureRenderType = this.textureRenderType;
        var16.faceTextureP = this.faceTextureP;
        var16.faceTextureM = this.faceTextureM;
        var16.faceTextureN = this.faceTextureN;
        var16.textureScaleX = this.textureScaleX;
        var16.textureScaleY = this.textureScaleY;
        var16.textureScaleZ = this.textureScaleZ;
        var16.textureRotation = this.textureRotation;
        var16.textureSpeed = this.textureSpeed;
        var16.textureDirection = this.textureDirection;
        var16.textureTranslation = this.textureTranslation;
        var16.field1502 = this.field1502;
        var16.vertexLabel = this.vertexLabel;
        var16.faceLabel = this.faceLabel;
        var16.labelVertices = this.labelVertices;
        var16.labelFaces = this.labelFaces;
        var16.ambient = this.ambient;
        var16.contrast = this.contrast;
        var16.pointNormal = this.pointNormal;
        var16.faceNormal = this.faceNormal;
        var16.sharedPointNormal = this.sharedPointNormal;
        if (arg0 === 3) {
            var16.pointX = new Int32Array(this.pointX!);
            var16.pointY = new Int32Array(this.pointY!);
            var16.pointZ = new Int32Array(this.pointZ!);
        } else {
            var16.pointX = this.pointX;
            var16.pointY = new Int32Array(var16.numPoints);
            var16.pointZ = this.pointZ;
        }
        if (arg0 === 1) {
            for (let var17 = 0; var17 < var16.numPoints; var17++) {
                const var18 = this.pointX![var17] + arg4;
                const var19 = this.pointZ![var17] + arg6;
                const var20 = var18 & 0x7f;
                const var21 = var19 & 0x7f;
                const var22 = var18 >> 7;
                const var23 = var19 >> 7;
                const var24 = (arg2[var22][var23] * (128 - var20) + arg2[var22 + 1][var23] * var20) >> 7;
                const var25 = (arg2[var22][var23 + 1] * (128 - var20) + arg2[var22 + 1][var23 + 1] * var20) >> 7;
                const var26 = (var24 * (128 - var21) + var25 * var21) >> 7;
                var16.pointY![var17] = this.pointY![var17] + var26 - arg5;
            }
        } else if (arg0 === 2) {
            for (let var27 = 0; var27 < var16.numPoints; var27++) {
                const var28 = ((this.pointY![var27] << 16) / this.field1519) | 0;
                if (var28 < arg1) {
                    const var29 = this.pointX![var27] + arg4;
                    const var30 = this.pointZ![var27] + arg6;
                    const var31 = var29 & 0x7f;
                    const var32 = var30 & 0x7f;
                    const var33 = var29 >> 7;
                    const var34 = var30 >> 7;
                    const var35 = (arg2[var33][var34] * (128 - var31) + arg2[var33 + 1][var34] * var31) >> 7;
                    const var36 = (arg2[var33][var34 + 1] * (128 - var31) + arg2[var33 + 1][var34 + 1] * var31) >> 7;
                    const var37 = (var35 * (128 - var32) + var36 * var32) >> 7;
                    var16.pointY![var27] = this.pointY![var27] + ((((var37 - arg5) * (arg1 - var28)) / arg1) | 0);
                } else {
                    var16.pointY![var27] = this.pointY![var27];
                }
            }
        } else if (arg0 === 3) {
            const var38 = (arg1 & 0xff) * 4;
            const var39 = ((arg1 >> 8) & 0xff) * 4;
            this.method562(arg2, arg4, arg5, arg6, var38, var39);
        } else if (arg0 === 4) {
            const var40 = this.maxY - this.field1519;
            for (let var41 = 0; var41 < this.numPoints; var41++) {
                const var42 = this.pointX![var41] + arg4;
                const var43 = this.pointZ![var41] + arg6;
                const var44 = var42 & 0x7f;
                const var45 = var43 & 0x7f;
                const var46 = var42 >> 7;
                const var47 = var43 >> 7;
                const var48 = (arg3![var46][var47] * (128 - var44) + arg3![var46 + 1][var47] * var44) >> 7;
                const var49 = (arg3![var46][var47 + 1] * (128 - var44) + arg3![var46 + 1][var47 + 1] * var44) >> 7;
                const var50 = (var48 * (128 - var45) + var49 * var45) >> 7;
                var16.pointY![var41] = this.pointY![var41] + var50 + var40 - arg5;
            }
        } else if (arg0 === 5) {
            const var51 = this.maxY - this.field1519;
            for (let var52 = 0; var52 < this.numPoints; var52++) {
                const var53 = this.pointX![var52] + arg4;
                const var54 = this.pointZ![var52] + arg6;
                const var55 = var53 & 0x7f;
                const var56 = var54 & 0x7f;
                const var57 = var53 >> 7;
                const var58 = var54 >> 7;
                const var59 = (arg2[var57][var58] * (128 - var55) + arg2[var57 + 1][var58] * var55) >> 7;
                const var60 = (arg2[var57][var58 + 1] * (128 - var55) + arg2[var57 + 1][var58 + 1] * var55) >> 7;
                const var61 = (var59 * (128 - var56) + var60 * var56) >> 7;
                const var62 = (arg3![var57][var58] * (128 - var55) + arg3![var57 + 1][var58] * var55) >> 7;
                const var63 = (arg3![var57][var58 + 1] * (128 - var55) + arg3![var57 + 1][var58 + 1] * var55) >> 7;
                const var64 = (var62 * (128 - var56) + var63 * var56) >> 7;
                const var65 = var61 - var64;
                var16.pointY![var52] = (((((this.pointY![var52] << 8) / var51) | 0) * var65) >> 8) - (arg5 - var61);
            }
        }
        this.boundsCalculated = false;
        return var16;
    }

    method547(arg0: number, arg1: number): SoftwareModelLit {
        return new SoftwareModelLit(this, arg0, arg1, -50, -10, -50);
    }

    geometryChanged(): void {
        this.pointNormal = null;
        this.sharedPointNormal = null;
        this.faceNormal = null;
        this.boundsCalculated = false;
    }

    copyForShareLight(): ModelUnlit {
        const var1 = new ModelUnlit();
        if (this.faceRenderType !== null) {
            var1.faceRenderType = new Int8Array(this.numFaces);
            for (let var2 = 0; var2 < this.numFaces; var2++) {
                var1.faceRenderType[var2] = this.faceRenderType[var2];
            }
        }
        var1.numPoints = this.numPoints;
        var1.numFaces = this.numFaces;
        var1.numT = this.numT;
        var1.pointX = this.pointX;
        var1.pointY = this.pointY;
        var1.pointZ = this.pointZ;
        var1.faceVertexA = this.faceVertexA;
        var1.faceVertexB = this.faceVertexB;
        var1.faceVertexC = this.faceVertexC;
        var1.facePriority = this.facePriority;
        var1.faceAlpha = this.faceAlpha;
        var1.faceTextureAxis = this.faceTextureAxis;
        var1.faceColour = this.faceColour;
        var1.faceTextureId = this.faceTextureId;
        var1.priority = this.priority;
        var1.textureRenderType = this.textureRenderType;
        var1.faceTextureP = this.faceTextureP;
        var1.faceTextureM = this.faceTextureM;
        var1.faceTextureN = this.faceTextureN;
        var1.textureScaleX = this.textureScaleX;
        var1.textureScaleY = this.textureScaleY;
        var1.textureScaleZ = this.textureScaleZ;
        var1.textureRotation = this.textureRotation;
        var1.textureSpeed = this.textureSpeed;
        var1.textureDirection = this.textureDirection;
        var1.textureTranslation = this.textureTranslation;
        var1.field1502 = this.field1502;
        var1.vertexLabel = this.vertexLabel;
        var1.faceLabel = this.faceLabel;
        var1.labelVertices = this.labelVertices;
        var1.labelFaces = this.labelFaces;
        var1.pointNormal = this.pointNormal;
        var1.faceNormal = this.faceNormal;
        var1.ambient = this.ambient;
        var1.contrast = this.contrast;
        return var1;
    }

    override method559(): ModelSource {
        return this.light(this.ambient, this.contrast, -50, -10, -50);
    }

    method560(arg0: number): void {
        const var2 = ModelUnlit.sinTable[arg0];
        const var3 = ModelUnlit.cosTable[arg0];
        for (let var4 = 0; var4 < this.numPoints; var4++) {
            const var5 = (this.pointY![var4] * var2 + this.pointX![var4] * var3) >> 16;
            this.pointY![var4] = (this.pointY![var4] * var3 - this.pointX![var4] * var2) >> 16;
            this.pointX![var4] = var5;
        }
        this.geometryChanged();
    }

    method562(arg0: Int32Array[], arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        const var7 = Math.trunc(-arg4 / 2);
        const var8 = Math.trunc(-arg5 / 2);
        const var9 = ModelUnlit.method543(arg0, arg1 + var7, arg3 + var8);
        const var10 = Math.trunc(arg4 / 2);
        const var11 = Math.trunc(-arg5 / 2);
        const var12 = ModelUnlit.method543(arg0, arg1 + var10, arg3 + var11);
        const var13 = Math.trunc(-arg4 / 2);
        const var14 = Math.trunc(arg5 / 2);
        const var15 = ModelUnlit.method543(arg0, arg1 + var13, arg3 + var14);
        const var16 = Math.trunc(arg4 / 2);
        const var17 = Math.trunc(arg5 / 2);
        const var18 = ModelUnlit.method543(arg0, arg1 + var16, arg3 + var17);
        const var19 = var9 < var12 ? var9 : var12;
        const var20 = var15 < var18 ? var15 : var18;
        const var21 = var12 < var18 ? var12 : var18;
        const var22 = var9 < var15 ? var9 : var15;
        const var23 = Math.trunc(Math.atan2(var19 - var20, arg5) * 325.95) & 0x7ff;
        if (var23 !== 0) {
            this.rotateXAxis(var23);
        }
        const var24 = Math.trunc(Math.atan2(var22 - var21, arg4) * 325.95) & 0x7ff;
        if (var24 !== 0) {
            this.method560(var24);
        }
        let var25 = var9 + var18;
        if (var12 + var15 < var25) {
            var25 = var12 + var15;
        }
        const var26 = (var25 >> 1) - arg2;
        if (var26 !== 0) {
            this.translate(0, var26, 0);
        }
    }

    method563(): void {
        this.vertexLabel = null;
        this.faceLabel = null;
        this.labelVertices = null;
        this.labelFaces = null;
    }

    calcBoundingCube(): void {
        if (this.boundsCalculated) {
            return;
        }

        this.boundsCalculated = true;
        let var1 = 32767;
        let var2 = 32767;
        let var3 = 32767;
        let var4 = -32768;
        let var5 = -32768;
        let var6 = -32768;
        for (let var7 = 0; var7 < this.numPoints; var7++) {
            const var8 = this.pointX![var7];
            const var9 = this.pointY![var7];
            const var10 = this.pointZ![var7];
            if (var8 < var1) {
                var1 = var8;
            }
            if (var8 > var4) {
                var4 = var8;
            }
            if (var9 < var2) {
                var2 = var9;
            }
            if (var9 > var5) {
                var5 = var9;
            }
            if (var10 < var3) {
                var3 = var10;
            }
            if (var10 > var6) {
                var6 = var10;
            }
        }
        this.minX = var1;
        this.maxX = var4;
        this.field1519 = var2;
        this.maxY = var5;
        this.minZ = var3;
        this.maxZ = var6;
    }

    prepareAnim(): void {
        let var10002: number;
        if (this.vertexLabel !== null) {
            const var1 = new Int32Array(256);
            let var2 = 0;
            for (let var3 = 0; var3 < this.numPoints; var3++) {
                const var4 = this.vertexLabel[var3];
                var10002 = var1[var4]++;
                if (var4 > var2) {
                    var2 = var4;
                }
            }
            this.labelVertices = new Array(var2 + 1).fill(null);
            for (let var5 = 0; var5 <= var2; var5++) {
                this.labelVertices[var5] = new Int32Array(var1[var5]);
                var1[var5] = 0;
            }
            let var6 = 0;
            while (var6 < this.numPoints) {
                const var7 = this.vertexLabel[var6];
                this.labelVertices[var7]![var1[var7]++] = var6++;
            }
            this.vertexLabel = null;
        }
        if (this.faceLabel === null) {
            return;
        }
        const var8 = new Int32Array(256);
        let var9 = 0;
        for (let var10 = 0; var10 < this.numFaces; var10++) {
            const var11 = this.faceLabel[var10];
            var10002 = var8[var11]++;
            if (var11 > var9) {
                var9 = var11;
            }
        }
        this.labelFaces = new Array(var9 + 1).fill(null);
        for (let var12 = 0; var12 <= var9; var12++) {
            this.labelFaces[var12] = new Int32Array(var8[var12]);
            var8[var12] = 0;
        }
        let var13 = 0;
        while (var13 < this.numFaces) {
            const var14 = this.faceLabel[var13];
            this.labelFaces[var14]![var8[var14]++] = var13++;
        }
        this.faceLabel = null;
    }

    rotate90(): void {
        for (let v: number = 0; v < this.numPoints; v++) {
            const tmp: number = this.pointX![v];
            this.pointX![v] = this.pointZ![v];
            this.pointZ![v] = -tmp;
        }
        this.geometryChanged();
    }

    rotate180(): void {
        for (let v: number = 0; v < this.numPoints; v++) {
            this.pointX![v] = -this.pointX![v];
            this.pointZ![v] = -this.pointZ![v];
        }
        this.geometryChanged();
    }

    rotate270(): void {
        for (let v: number = 0; v < this.numPoints; v++) {
            const tmp: number = this.pointZ![v];
            this.pointZ![v] = this.pointX![v];
            this.pointX![v] = -tmp;
        }
        this.geometryChanged();
    }

    method573(): void {
        const var1 = ModelUnlit.sinTable[256];
        const var2 = ModelUnlit.cosTable[256];
        for (let var3 = 0; var3 < this.numPoints; var3++) {
            const var4 = (this.pointZ![var3] * var1 + this.pointX![var3] * var2) >> 16;
            this.pointZ![var3] = (this.pointZ![var3] * var2 - this.pointX![var3] * var1) >> 16;
            this.pointX![var3] = var4;
        }
        this.geometryChanged();
    }

    rotateXAxis(arg0: number): void {
        const var2 = ModelUnlit.sinTable[arg0];
        const var3 = ModelUnlit.cosTable[arg0];
        for (let var4: number = 0; var4 < this.numPoints; var4++) {
            const var5 = (this.pointY![var4] * var3 - this.pointZ![var4] * var2) >> 16;
            this.pointZ![var4] = (this.pointY![var4] * var2 + this.pointZ![var4] * var3) >> 16;
            this.pointY![var4] = var5;
        }
        this.geometryChanged();
    }

    method565(arg0: number, arg1: number, arg2: number): void {
        if (arg2 !== 0) {
            const var4: number = ModelUnlit.sinTable[arg2];
            const var5: number = ModelUnlit.cosTable[arg2];
            for (let var6: number = 0; var6 < this.numPoints; var6++) {
                const var7: number = (this.pointY![var6] * var4 + this.pointX![var6] * var5) >> 16;
                this.pointY![var6] = (this.pointY![var6] * var5 - this.pointX![var6] * var4) >> 16;
                this.pointX![var6] = var7;
            }
        }
        if (arg0 !== 0) {
            const var8: number = ModelUnlit.sinTable[arg0];
            const var9: number = ModelUnlit.cosTable[arg0];
            for (let var10: number = 0; var10 < this.numPoints; var10++) {
                const var11: number = (this.pointY![var10] * var9 - this.pointZ![var10] * var8) >> 16;
                this.pointZ![var10] = (this.pointY![var10] * var8 + this.pointZ![var10] * var9) >> 16;
                this.pointY![var10] = var11;
            }
        }
        if (arg1 !== 0) {
            const var12: number = ModelUnlit.sinTable[arg1];
            const var13: number = ModelUnlit.cosTable[arg1];
            for (let var14: number = 0; var14 < this.numPoints; var14++) {
                const var15: number = (this.pointZ![var14] * var12 + this.pointX![var14] * var13) >> 16;
                this.pointZ![var14] = (this.pointZ![var14] * var13 - this.pointX![var14] * var12) >> 16;
                this.pointX![var14] = var15;
            }
        }
    }

    translate(arg0: number, arg1: number, arg2: number): void {
        for (let var4: number = 0; var4 < this.numPoints; var4++) {
            this.pointX![var4] += arg0;
            this.pointY![var4] += arg1;
            this.pointZ![var4] += arg2;
        }
        this.geometryChanged();
    }

    recolour(arg0: number, arg1: number): void {
        for (let var3: number = 0; var3 < this.numFaces; var3++) {
            if (this.faceColour![var3] === arg0) {
                this.faceColour![var3] = arg1;
            }
        }
    }

    retexture(arg0: number, arg1: number): void {
        if (this.faceTextureId === null) {
            return;
        }

        for (let var3: number = 0; var3 < this.numFaces; var3++) {
            if (this.faceTextureId[var3] === arg0) {
                this.faceTextureId[var3] = arg1;
            }
        }
    }

    mirror(): void {
        for (let v: number = 0; v < this.numPoints; v++) {
            this.pointZ![v] = -this.pointZ![v];
        }

        for (let f: number = 0; f < this.numFaces; f++) {
            const tmp: number = this.faceVertexA![f];
            this.faceVertexA![f] = this.faceVertexC![f];
            this.faceVertexC![f] = tmp;
        }
        this.geometryChanged();
    }

    resize(arg0: number, arg1: number, arg2: number): void {
        for (let var4: number = 0; var4 < this.numPoints; var4++) {
            this.pointX![var4] = ((this.pointX![var4] * arg0) / 128) | 0;
            this.pointY![var4] = ((this.pointY![var4] * arg1) / 128) | 0;
            this.pointZ![var4] = ((this.pointZ![var4] * arg2) / 128) | 0;
        }
        this.geometryChanged();
    }

    calculateNormals(): void {
        if (this.pointNormal !== null) {
            return;
        }
        this.pointNormal = new Array(this.numPoints).fill(null);
        for (let var1 = 0; var1 < this.numPoints; var1++) {
            this.pointNormal[var1] = new PointNormal();
        }
        for (let var2 = 0; var2 < this.numFaces; var2++) {
            const var3 = this.faceVertexA![var2];
            const var4 = this.faceVertexB![var2];
            const var5 = this.faceVertexC![var2];
            const var6 = this.pointX![var4] - this.pointX![var3];
            const var7 = this.pointY![var4] - this.pointY![var3];
            const var8 = this.pointZ![var4] - this.pointZ![var3];
            const var9 = this.pointX![var5] - this.pointX![var3];
            const var10 = this.pointY![var5] - this.pointY![var3];
            const var11 = this.pointZ![var5] - this.pointZ![var3];
            let var12 = var7 * var11 - var10 * var8;
            let var13 = var8 * var9 - var11 * var6;
            let var14;
            for (var14 = var6 * var10 - var9 * var7; var12 > 8192 || var13 > 8192 || var14 > 8192 || var12 < -8192 || var13 < -8192 || var14 < -8192; var14 >>= 0x1) {
                var12 >>= 0x1;
                var13 >>= 0x1;
            }
            let var15 = Math.sqrt(var12 * var12 + var13 * var13 + var14 * var14) | 0;
            if (var15 <= 0) {
                var15 = 1;
            }
            const var16 = ((var12 * 256) / var15) | 0;
            const var17 = ((var13 * 256) / var15) | 0;
            const var18 = ((var14 * 256) / var15) | 0;
            let var19: number;
            if (this.faceRenderType === null) {
                var19 = 0;
            } else {
                var19 = this.faceRenderType[var2];
            }
            if (var19 === 0) {
                const var20 = this.pointNormal[var3]!;
                var20.x += var16;
                var20.y += var17;
                var20.z += var18;
                var20.w++;
                const var21 = this.pointNormal[var4]!;
                var21.x += var16;
                var21.y += var17;
                var21.z += var18;
                var21.w++;
                const var22 = this.pointNormal[var5]!;
                var22.x += var16;
                var22.y += var17;
                var22.z += var18;
                var22.w++;
            } else if (var19 === 1) {
                if (this.faceNormal === null) {
                    this.faceNormal = new Array(this.numFaces).fill(null);
                }
                const var23 = (this.faceNormal[var2] = new FaceNormal());
                var23.x = var16;
                var23.y = var17;
                var23.z = var18;
            }
        }
    }

    light(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): ModelLit {
        return new SoftwareModelLit(this, arg0, arg1, arg2, arg3, arg4);
    }
}
