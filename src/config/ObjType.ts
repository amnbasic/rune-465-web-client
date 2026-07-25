import LruCache from '#/datastruct/LruCache.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable from '#/datastruct/Linkable.js';
import StringNode from '#/datastruct/StringNode.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import Pix2D from '#/graphics/Pix2D.js';
import Pix3D from '#/dash3d/Pix3D.js';
import ModelLit from '#/dash3d/ModelLit.js';
import ModelUnlit from '#/dash3d/ModelUnlit.js';
import SoftwareModelLit from '#/dash3d/SoftwareModelLit.js';
import Pix32 from '#/graphics/Pix32.js';
import SoftwarePix32 from '#/graphics/SoftwarePix32.js';
import type PixFont from '#/graphics/PixFont.js';
import ModelSourceCache from '#/dash3d/ModelSourceCache.js';

import IntMath from '#/util/IntMath.js';
import Text from '#/constants/Text.js';
import type SeqType from '#/config/SeqType.js';
import JagString from '#/jstring/JagString.js';

// jag::oldscape::configdecoder::ObjType
export default class ObjType extends Linkable2 {
    static clientpalette: Int16Array = new Int16Array(256);

    // jag::oldscape::configdecoder::ObjType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::ObjType::m_pModels
    static models: Js5;

    // jag::oldscape::configdecoder::ObjType::m_memServer
    static memServer: boolean = false;

    static numDefinitions: number = 0;
    static readonly recentUse: LruCache<ObjType> = new LruCache(64);
    static readonly modelCache: ModelSourceCache = new ModelSourceCache(50);
    static readonly spriteCache: LruCache<SoftwarePix32> = new LruCache(100);

    // jag::oldscape::configdecoder::ObjType::m_countFont
    static countFont: PixFont | null = null;

    id: number = 0;
    model: number = 0;
    name: string = 'null';
    recol_s: Int16Array | null = null;
    recol_d: Int16Array | null = null;
    retex_s: Int16Array | null = null;
    retex_d: Int16Array | null = null;
    recol_d_palette: Int8Array | null = null;
    zoom2d: number = 2000;
    xan2d: number = 0;
    yan2d: number = 0;
    zan2d: number = 0;
    xof2d: number = 0;
    yof2d: number = 0;
    stackable: number = 0;
    cost: number = 1;
    members: boolean = false;
    op: (string | null)[] | null = [null, null, Text.take, null, null];
    iop: (string | null)[] | null = [null, null, null, null, Text.drop];
    manwear: number = -1;
    manwear2: number = -1;
    manwearOffsetY: number = 0;
    womanwear: number = -1;
    womanwear2: number = -1;
    womanwearOffsetY: number = 0;
    manwear3: number = -1;
    womanwear3: number = -1;
    manhead: number = -1;
    manhead2: number = -1;
    womanhead: number = -1;
    womanhead2: number = -1;
    countobj: Int32Array | null = null;
    countco: Int32Array | null = null;
    certlink: number = -1;
    certtemplate: number = -1;
    lentlink: number = -1;
    lenttemplate: number = -1;
    resizex: number = 128;
    resizey: number = 128;
    resizez: number = 128;
    ambient: number = 0;
    contrast: number = 0;
    team: number = 0;
    stockmarket: boolean = false;
    dummyitem: number = 0;
    params: HashTable<Linkable> | null = null;

    // todo: identify and sort
    field2839: Int32Array[] | null = null;
    static field1210: Int16Array | null = null;
    static field2107: number = 0;
    static field3893: number = 0;
    static wearable: Int32Array;

    // jag::oldscape::configdecoder::ObjType::Init
    static init(memServer: boolean, config: Js5, countFont: PixFont | null, models: Js5): void {
        ObjType.models = models;
        ObjType.memServer = memServer;
        ObjType.configClient = config;
        // 465: objs are a flat group in idx2 (group 10). numDefinitions = file count of group 10.
        ObjType.numDefinitions = ObjType.configClient.getFileIdLimit(10);
        ObjType.countFont = countFont;
    }

    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 10;
    }

    // jag::oldscape::configdecoder::ObjType::List
    static list(id: number): ObjType {
        const cached = ObjType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = ObjType.configClient.getFile(ObjType.getGroupId(id), ObjType.getFileId(id));
        const type = new ObjType();
        type.id = id;
        if (data !== null) {
            type.decode(new Packet(data));
        }
        type.postDecode();
        if (type.certtemplate !== -1) {
            type.genCert(ObjType.list(type.certlink), ObjType.list(type.certtemplate));
        }
        if (type.lenttemplate !== -1) {
            type.genLent(ObjType.list(type.lentlink), ObjType.list(type.lenttemplate));
        }
        if (!ObjType.memServer && type.members) {
            type.team = 0;
            type.op = null;
            type.stockmarket = false;
            type.name = Text.members_object;
            type.iop = null;
        }

        ObjType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::ObjType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::ObjType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 1) {
            this.model = buf.g2();
        } else if (code === 2) {
            this.name = buf.gjstr();
        } else if (code === 4) {
            this.zoom2d = buf.g2();
        } else if (code === 5) {
            this.xan2d = buf.g2();
        } else if (code === 6) {
            this.yan2d = buf.g2();
        } else if (code === 7) {
            this.xof2d = buf.g2();
            if (this.xof2d > 32767) {
                this.xof2d -= 65536;
            }
        } else if (code === 8) {
            this.yof2d = buf.g2();
            if (this.yof2d > 32767) {
                this.yof2d -= 65536;
            }
        } else if (code === 11) {
            this.stackable = 1;
        } else if (code === 12) {
            this.cost = buf.g4();
        } else if (code === 16) {
            this.members = true;
        } else if (code === 23) {
            this.manwear = buf.g2();
            this.manwearOffsetY = buf.g1();
        } else if (code === 24) {
            this.manwear2 = buf.g2();
        } else if (code === 25) {
            this.womanwear = buf.g2();
            this.womanwearOffsetY = buf.g1();
        } else if (code === 26) {
            this.womanwear2 = buf.g2();
        } else if (code >= 30 && code < 35) {
            this.op![code - 30] = buf.gjstr();
            if (this.op![code - 30]!.toLowerCase() === Text.hidden.toLowerCase()) {
                this.op![code - 30] = null;
            }
        } else if (code >= 35 && code < 40) {
            this.iop![code - 35] = buf.gjstr();
        } else if (code === 40) {
            const count: number = buf.g1();
            this.recol_s = new Int16Array(count);
            this.recol_d = new Int16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.recol_s[i] = buf.g2();
                this.recol_d[i] = buf.g2();
            }
        } else if (code === 41) {
            const count: number = buf.g1();
            this.retex_d = new Int16Array(count);
            this.retex_s = new Int16Array(count);
            for (let i: number = 0; i < count; i++) {
                this.retex_s[i] = buf.g2();
                this.retex_d[i] = buf.g2();
            }
        } else if (code === 42) {
            const count: number = buf.g1();
            this.recol_d_palette = new Int8Array(count);
            for (let i: number = 0; i < count; i++) {
                this.recol_d_palette[i] = buf.g1b();
            }
        } else if (code === 65) {
            this.stockmarket = true;
        } else if (code === 78) {
            this.manwear3 = buf.g2();
        } else if (code === 79) {
            this.womanwear3 = buf.g2();
        } else if (code === 90) {
            this.manhead = buf.g2();
        } else if (code === 91) {
            this.womanhead = buf.g2();
        } else if (code === 92) {
            this.manhead2 = buf.g2();
        } else if (code === 93) {
            this.womanhead2 = buf.g2();
        } else if (code === 95) {
            this.zan2d = buf.g2();
        } else if (code === 96) {
            this.dummyitem = buf.g1();
        } else if (code === 97) {
            this.certlink = buf.g2();
        } else if (code === 98) {
            this.certtemplate = buf.g2();
        } else if (code >= 100 && code < 110) {
            if (this.countobj === null) {
                this.countco = new Int32Array(10);
                this.countobj = new Int32Array(10);
            }

            this.countobj![code - 100] = buf.g2();
            this.countco![code - 100] = buf.g2();
        } else if (code === 110) {
            this.resizex = buf.g2();
        } else if (code === 111) {
            this.resizey = buf.g2();
        } else if (code === 112) {
            this.resizez = buf.g2();
        } else if (code === 113) {
            this.ambient = buf.g1b();
        } else if (code === 114) {
            this.contrast = buf.g1b() * 5;
        } else if (code === 115) {
            this.team = buf.g1();
        } else if (code === 121) {
            this.lentlink = buf.g2();
        } else if (code === 122) {
            this.lenttemplate = buf.g2();
        } else if (code === 124) {
            if (this.field2839 === null) {
                this.field2839 = new Array(11);
            }
            const index = buf.g1();
            this.field2839[index] = new Int32Array(6);
            for (let i = 0; i < 6; i++) {
                this.field2839[index][i] = buf.g2b();
            }
        } else if (code === 249) {
            const count = buf.g1();
            if (this.params === null) {
                this.params = new HashTable(IntMath.bitceil(count));
            }
            for (let i = 0; i < count; i++) {
                const isString = buf.g1() === 1;
                const key = buf.g3();
                const node = isString ? new StringNode(buf.gjstr()) : new IntNode(buf.g4());
                this.params.put(BigInt(key), node);
            }
        }
    }

    // jag::oldscape::configdecoder::ObjType::PostDecode
    postDecode(): void {}

    // jag::oldscape::configdecoder::ObjType::GenCert
    genCert(link: ObjType, template: ObjType): void {
        this.yof2d = template.yof2d;
        this.recol_d_palette = template.recol_d_palette;
        this.cost = link.cost;
        this.stackable = 1;
        this.recol_s = template.recol_s;
        this.name = link.name;
        this.zoom2d = template.zoom2d;
        this.xan2d = template.xan2d;
        this.xof2d = template.xof2d;
        this.yan2d = template.yan2d;
        this.retex_s = template.retex_s;
        this.members = link.members;
        this.model = template.model;
        this.retex_d = template.retex_d;
        this.recol_d = template.recol_d;
        this.zan2d = template.zan2d;
    }

    genLent(arg0: ObjType, arg1: ObjType): void {
        this.xan2d = arg1.xan2d;
        this.zoom2d = arg1.zoom2d;
        this.name = arg0.name;
        this.womanwearOffsetY = arg0.womanwearOffsetY;
        this.womanwear2 = arg0.womanwear2;
        this.yan2d = arg1.yan2d;
        this.recol_d = arg0.recol_d;
        this.manwear2 = arg0.manwear2;
        this.xof2d = arg1.xof2d;
        this.manhead2 = arg0.manhead2;
        this.retex_d = arg0.retex_d;
        this.womanwear = arg0.womanwear;
        this.op = arg0.op;
        this.manhead = arg0.manhead;
        this.model = arg1.model;
        this.members = arg0.members;
        this.zan2d = arg1.zan2d;
        this.iop = new Array(5).fill(null);
        this.manwear3 = arg0.manwear3;
        this.womanwear3 = arg0.womanwear3;
        this.cost = 0;
        this.womanhead = arg0.womanhead;
        this.recol_d_palette = arg0.recol_d_palette;
        this.womanhead2 = arg0.womanhead2;
        this.manwear = arg0.manwear;
        this.retex_s = arg0.retex_s;
        this.yof2d = arg1.yof2d;
        this.team = arg0.team;
        this.manwearOffsetY = arg0.manwearOffsetY;
        this.recol_s = arg0.recol_s;
        this.params = arg0.params;
        if (arg0.iop !== null) {
            for (let var3 = 0; var3 < 4; var3++) {
                this.iop[var3] = arg0.iop[var3];
            }
        }
        this.iop[4] = Text.discard;
    }

    // jag::oldscape::configdecoder::ObjType::GetModelLit
    getModelLit(): SoftwareModelLit | null;
    getModelLit(count: number, frame: number, seq: SeqType | null): ModelLit | null;
    getModelLit(arg0?: number, arg1: number = 0, arg2: SeqType | null = null): SoftwareModelLit | ModelLit | null {
        const animated = arg0 !== undefined;
        const count = arg0 ?? 1;

        if (this.countobj !== null && count > 1) {
            let id: number = -1;
            for (let i: number = 0; i < 10; i++) {
                if (count >= this.countco![i] && this.countco![i] !== 0) {
                    id = this.countobj[i];
                }
            }

            if (id !== -1) {
                return ObjType.list(id).getModelLit(1, arg1, arg2);
            }
        }

        if (animated) {
            const cached = ObjType.modelCache.find(BigInt(this.id)) as SoftwareModelLit | null;
            if (cached !== null) {
                return arg2 !== null ? arg2.animateModelWithExtra(arg1, cached) : cached;
            }
        }

        const model = ModelUnlit.load(ObjType.models!, this.model);
        if (model === null) {
            return null;
        }

        if (this.recol_s !== null) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                if (this.recol_d_palette === null || i >= this.recol_d_palette.length) {
                    model.recolour(this.recol_s[i], this.recol_d![i]);
                } else {
                    model.recolour(this.recol_s[i], ObjType.clientpalette[this.recol_d_palette[i] & 0xff]);
                }
            }
        }

        if (this.retex_s !== null) {
            for (let i: number = 0; i < this.retex_s.length; i++) {
                model.retexture(this.retex_s[i], this.retex_d![i]);
            }
        }

        const lit = animated ? new SoftwareModelLit(model, this.ambient + 64, this.contrast + 768, -50, -10, -50) : model.method547(this.ambient + 64, this.contrast + 768);
        if (this.resizex !== 128 || this.resizey !== 128 || this.resizez !== 128) {
            lit.resize(this.resizex, this.resizey, this.resizez);
        }
        if (animated) {
            lit.useAABBMouseCheck = true;
            ObjType.modelCache.put(BigInt(this.id), lit);
        }
        return arg2 !== null ? arg2.animateModelWithExtra(arg1, lit) : lit;
    }

    // jag::oldscape::configdecoder::ObjType::GetStackSizeAlt
    getStackSizeAlt(arg0: number): ObjType {
        if (this.countobj !== null && arg0 > 1) {
            let var2: number = -1;
            for (let var3: number = 0; var3 < 10; var3++) {
                if (arg0 >= this.countco![var3] && this.countco![var3] !== 0) {
                    var2 = this.countobj[var3];
                }
            }
            if (var2 !== -1) {
                return ObjType.list(var2);
            }
        }
        return this;
    }

    // jag::oldscape::configdecoder::ObjType::GetSprite
    static getSprite(arg0: number, arg1: number, arg2: number, arg3: boolean, arg4: number): Pix32 | null {
        const var5 = (BigInt(arg4) << 40n) + (BigInt(arg2) << 16n) + BigInt(arg1) + (arg3 ? 137438953472n : 0n) + (BigInt(arg0) << 38n);
        const var7 = ObjType.spriteCache.find(var5);
        if (var7 !== null) {
            return var7;
        }

        Pix3D.textureFallback = false;
        const var8 = ObjType.getSpriteInner(arg1, arg2, arg4, arg0, false, arg3);
        if (var8 !== null && !Pix3D.textureFallback) {
            ObjType.spriteCache.put(var5, var8);
        }
        return var8;
    }

    static getSpriteInner(arg0: number, arg1: number, arg2: number, arg3: number, arg4: boolean, arg5: boolean): SoftwarePix32 | null {
        let var6: ObjType = ObjType.list(arg0);
        if (arg1 > 1 && var6.countobj !== null) {
            let var7 = -1;
            for (let var8 = 0; var8 < 10; var8++) {
                if (arg1 >= var6.countco![var8] && var6.countco![var8] !== 0) {
                    var7 = var6.countobj[var8];
                }
            }
            if (var7 !== -1) {
                var6 = ObjType.list(var7);
            }
        }

        const var9 = var6.getModelLit();
        if (var9 === null) {
            return null;
        }

        let var10: SoftwarePix32 | null = null;
        if (var6.certtemplate !== -1) {
            var10 = ObjType.getSpriteInner(var6.certlink, 10, 0, 1, true, false);
            if (var10 === null) {
                return null;
            }
        } else if (var6.lenttemplate !== -1) {
            var10 = ObjType.getSpriteInner(var6.lentlink, arg1, arg2, arg3, false, false);
            if (var10 === null) {
                return null;
            }
        }

        const var11 = Pix2D.pixels;
        const var12 = Pix2D.width;
        const var13 = Pix2D.height;
        const var14 = new Int32Array(4);
        Pix2D.saveClipping(var14);
        let var15 = new SoftwarePix32(36, 32);
        Pix2D.setPixels(var15.data, 36, 32);
        Pix3D.setRenderClipping();
        Pix3D.setOrigin(16, 16);

        let var16 = var6.zoom2d;
        if (arg4) {
            var16 = (var16 * 1.5) | 0;
        } else if (arg3 === 2) {
            var16 = (var16 * 1.04) | 0;
        }

        Pix3D.lowDetail = false;
        const var17 = (Pix3D.cosTable[var6.xan2d] * var16) >> 16;
        const var18 = (var16 * Pix3D.sinTable[var6.xan2d]) >> 16;
        var9.method193(var6.yan2d, var6.zan2d, var6.xan2d, var6.xof2d, var18 + var6.yof2d - ((var9.method88() / 2) | 0), var6.yof2d + var17);

        if (arg3 >= 1) {
            var15.addOutline(1);
            if (arg3 >= 2) {
                var15.addOutline(0xffffff);
            }
            Pix2D.setPixels(var15.data, 36, 32);
        }
        if (arg2 !== 0) {
            var15.addShadow(arg2);
        }

        if (var6.certtemplate !== -1) {
            var10!.plotSprite(0, 0);
        } else if (var6.lenttemplate !== -1) {
            Pix2D.setPixels(var10!.data, 36, 32);
            var15.plotSprite(0, 0);
            var15 = var10!;
        }

        if (arg5 && (var6.stackable === 1 || arg1 !== 1) && arg1 !== -1) {
            ObjType.countFont!.drawString(ObjType.invNumber(arg1), 0, 9, 0xffff00, 1);
        }

        Pix2D.setPixels(var11, var12, var13);
        Pix2D.restoreClipping(var14);
        Pix3D.setRenderClipping();
        Pix3D.lowDetail = true;
        return var15;
    }

    // jag::oldscape::configdecoder::ObjType::InvNumber
    static invNumber(value: number): string {
        if (value < 100000) {
            return `<col=ffff00>${value}</col>`;
        } else if (value < 10000000) {
            return `<col=ffffff>${(value / 1000) | 0}${Text.thousand_short}</col>`;
        } else {
            return `<col=00ff80>${(value / 1000000) | 0}${Text.million_short}</col>`;
        }
    }

    // jag::oldscape::configdecoder::ObjType::CheckWearModel
    checkWearModel(arg0: boolean): boolean {
        let var2 = this.manwear2;
        let var3 = this.manwear;
        let var4 = this.manwear3;
        if (arg0) {
            var3 = this.womanwear;
            var2 = this.womanwear2;
            var4 = this.womanwear3;
        }

        if (var3 === -1) {
            return true;
        }

        let var5 = true;
        if (!ObjType.models!.requestDownload(var3, 0)) {
            var5 = false;
        }
        if (var2 !== -1 && !ObjType.models!.requestDownload(var2, 0)) {
            var5 = false;
        }
        if (var4 !== -1 && !ObjType.models!.requestDownload(var4, 0)) {
            var5 = false;
        }
        return var5;
    }

    // jag::oldscape::configdecoder::ObjType::GetWearModelNoCheck
    getWearModelNoCheck(arg0: boolean): ModelUnlit | null {
        let var2 = this.manwear;
        let var3 = this.manwear3;
        let var4 = this.manwear2;
        if (arg0) {
            var2 = this.womanwear;
            var3 = this.womanwear3;
            var4 = this.womanwear2;
        }

        if (var2 === -1) {
            return null;
        }

        let var5 = ModelUnlit.load(ObjType.models!, var2)!;

        if (var4 !== -1) {
            const var6 = ModelUnlit.load(ObjType.models!, var4)!;

            if (var3 === -1) {
                const var7 = [var5, var6];
                var5 = new ModelUnlit(var7, 2);
            } else {
                const var8 = ModelUnlit.load(ObjType.models!, var3)!;
                const var9 = [var5, var6, var8];
                var5 = new ModelUnlit(var9, 3);
            }
        }

        if (!arg0 && this.manwearOffsetY !== 0) {
            var5.translate(0, this.manwearOffsetY, 0);
        }
        if (arg0 && this.womanwearOffsetY !== 0) {
            var5.translate(0, this.womanwearOffsetY, 0);
        }

        if (this.recol_s !== null) {
            for (let var10 = 0; var10 < this.recol_s.length; var10++) {
                var5.recolour(this.recol_s[var10], this.recol_d![var10]);
            }
        }

        if (this.retex_s !== null) {
            for (let var11 = 0; var11 < this.retex_s.length; var11++) {
                var5.retexture(this.retex_s[var11], this.retex_d![var11]);
            }
        }

        return var5;
    }

    // jag::oldscape::configdecoder::ObjType::CheckHeadModel
    checkHeadModel(arg0: boolean): boolean {
        let var2 = this.manhead;
        let var3 = this.manhead2;
        if (arg0) {
            var3 = this.womanhead2;
            var2 = this.womanhead;
        }

        if (var2 === -1) {
            return true;
        }

        let var4 = true;
        if (!ObjType.models!.requestDownload(var2, 0)) {
            var4 = false;
        }
        if (var3 !== -1 && !ObjType.models!.requestDownload(var3, 0)) {
            var4 = false;
        }
        return var4;
    }

    // jag::oldscape::configdecoder::ObjType::GetHeadModelNoCheck
    getHeadModelNoCheck(arg0: boolean): ModelUnlit | null {
        let var2 = this.manhead;
        let var3 = this.manhead2;
        if (arg0) {
            var3 = this.womanhead2;
            var2 = this.womanhead;
        }
        if (var2 === -1) {
            return null;
        }
        let var4 = ModelUnlit.load(ObjType.models!, var2)!;
        if (var3 !== -1) {
            const var5 = ModelUnlit.load(ObjType.models!, var3)!;
            const var6 = [var4, var5];
            var4 = new ModelUnlit(var6, 2);
        }

        if (this.recol_s !== null) {
            for (let var7 = 0; var7 < this.recol_s.length; var7++) {
                var4.recolour(this.recol_s[var7], this.recol_d![var7]);
            }
        }

        if (this.retex_s !== null) {
            for (let var8 = 0; var8 < this.retex_s.length; var8++) {
                var4.retexture(this.retex_s[var8], this.retex_d![var8]);
            }
        }

        return var4;
    }

    getParamInt(arg0: number, arg1: number): number {
        if (this.params === null) {
            return arg1;
        } else {
            const var3 = this.params.find(BigInt(arg0)) as IntNode | null;
            return var3 === null ? arg1 : var3.value;
        }
    }

    getParamString(arg0: string | null, arg1: number): string | null {
        if (this.params === null) {
            return arg0;
        } else {
            const var3 = this.params.find(BigInt(arg1)) as StringNode | null;
            return var3 === null ? arg0 : (var3.value as string);
        }
    }

    static resetCache(): void {
        ObjType.recentUse.clear();
        ObjType.modelCache.clear();
        ObjType.spriteCache.clear();
    }

    static resetModelCache(): void {
        ObjType.modelCache.clear();
    }

    // jag::oldscape::configdecoder::ObjType::ResetSpriteCache
    static resetSpriteCache(): void {
        ObjType.spriteCache.clear();
    }

    // ---- todo: sort

    static initWearable(): void {
        const var0 = new Int32Array(ObjType.numDefinitions);
        let var1 = 0;
        for (let var2 = 0; var2 < ObjType.numDefinitions; var2++) {
            const var3 = ObjType.list(var2);
            if (var3.manwear >= 0 || var3.womanwear >= 0) {
                var0[var1++] = var2;
            }
        }
        ObjType.wearable = new Int32Array(var1);
        for (let var4 = 0; var4 < var1; var4++) {
            ObjType.wearable[var4] = var0[var4];
        }
    }

    static method467(arg0: boolean, arg1: string): void {
        const var2 = arg1.toLowerCase();
        let var3 = 0;
        let var4 = new Int16Array(16);
        for (let var5 = 0; var5 < ObjType.numDefinitions; var5++) {
            const var6 = ObjType.list(var5);
            if ((!arg0 || var6.stockmarket) && var6.certtemplate === -1 && var6.lenttemplate === -1 && var6.dummyitem === 0 && var6.name.toLowerCase().indexOf(var2) !== -1) {
                if (var3 >= 250) {
                    ObjType.field3893 = -1;
                    ObjType.field1210 = null;
                    return;
                }
                if (var3 >= var4.length) {
                    const var7 = new Int16Array(var4.length * 2);
                    for (let var8 = 0; var8 < var3; var8++) {
                        var7[var8] = var4[var8];
                    }
                    var4 = var7;
                }
                var4[var3++] = var5;
            }
        }

        ObjType.field2107 = 0;
        ObjType.field3893 = var3;
        ObjType.field1210 = var4;
        const var9 = new Array<string | null>(ObjType.field3893);
        for (let var10 = 0; var10 < ObjType.field3893; var10++) {
            var9[var10] = ObjType.list(var4[var10]).name;
        }
        ObjType.method1376(ObjType.field1210, var9);
    }

    static method1376(arg0: Int16Array, arg1: Array<string | null>): void {
        ObjType.method1037(0, arg1, arg1.length - 1, arg0);
    }

    static method1037(arg0: number, arg1: Array<string | null>, arg2: number, arg3: Int16Array): void {
        if (arg0 >= arg2) {
            return;
        }

        const var4 = ((arg0 + arg2) / 2) | 0;
        const var5 = arg1[var4];
        arg1[var4] = arg1[arg2];
        let var6 = arg0;
        arg1[arg2] = var5;
        const var7 = arg3[var4];
        arg3[var4] = arg3[arg2];
        arg3[arg2] = var7;
        for (let var8 = arg0; var8 < arg2; var8++) {
            if (var5 === null || (arg1[var8] !== null && JagString.wrap(arg1[var8]!).compare(JagString.wrap(var5)) < (var8 & 0x1))) {
                const var9 = arg1[var8];
                arg1[var8] = arg1[var6];
                arg1[var6] = var9;
                const var10 = arg3[var8];
                arg3[var8] = arg3[var6];
                arg3[var6++] = var10;
            }
        }
        arg1[arg2] = arg1[var6];
        arg1[var6] = var5;
        arg3[arg2] = arg3[var6];
        arg3[var6] = var7;
        ObjType.method1037(arg0, arg1, var6 - 1, arg3);
        ObjType.method1037(var6 + 1, arg1, arg2, arg3);
    }
}
