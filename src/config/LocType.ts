import LruCache from '#/datastruct/LruCache.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable from '#/datastruct/Linkable.js';
import StringNode from '#/datastruct/StringNode.js';

import SeqType from '#/config/SeqType.js';
import Text from '#/constants/Text.js';

import ModelUnlit from '#/dash3d/ModelUnlit.js';
import ModelCacheLit from '#/dash3d/ModelCacheLit.js';
import type ModelSource from '#/dash3d/ModelSource.js';
import ModelSourceCache from '#/dash3d/ModelSourceCache.js';
import SoftwareModelLit from '#/dash3d/SoftwareModelLit.js';

import Packet from '#/io/Packet.js';

import IntMath from '#/util/IntMath.js';
import VarCache from '#/var/VarCache.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::LocType
export default class LocType extends Linkable2 {
    static clientpalette: Int16Array = new Int16Array(256);

    // jag::oldscape::configdecoder::LocType::m_lowMem
    static lowMem: boolean = false;

    // jag::oldscape::configdecoder::LocType::m_pConfigClient
    static clientConfig: Js5;

    // jag::oldscape::configdecoder::LocType::m_pModels
    static models: Js5;

    // jag::oldscape::configdecoder::LocType::m_recentUse
    static readonly recentUse: LruCache<LocType> = new LruCache(64);

    // jag::oldscape::configdecoder::LocType::m_mc1
    static readonly mc1: ModelSourceCache = new ModelSourceCache(500);

    // jag::oldscape::configdecoder::LocType::m_mc2
    static readonly mc2: ModelSourceCache = new ModelSourceCache(30);

    // jag::oldscape::configdecoder::LocType::m_mc3
    static readonly mc3: ModelCacheLit = new ModelCacheLit();

    static readonly temp: ModelUnlit[] = new Array(4);

    id: number = 0;
    model: Int32Array | null = null;
    shape: Int32Array | null = null;
    name: string = 'null';
    recol_s: Int16Array | null = null;
    recol_d: Int16Array | null = null;
    retex_s: Int16Array | null = null;
    retex_d: Int16Array | null = null;
    recol_d_palette: Int8Array | null = null;
    width: number = 1;
    length: number = 1;
    blockwalk: number = 2;
    blockrange: boolean = true;
    active: number = -1;
    skewType: number = 0;
    skewAmount: number = -1;
    sharelight: boolean = false;
    occlude: boolean = false;
    anim: number = -1;
    wallwidth: number = 16;
    ambient: number = 0;
    contrast: number = 0;
    op: (string | null)[] | null = new Array(5).fill(null);
    mapfunction: number = -1;
    mapscene: number = -1;
    mirror: boolean = false;
    shadow: boolean = true;
    resizex: number = 128;
    resizey: number = 128;
    resizez: number = 128;
    offsetx: number = 0;
    offsety: number = 0;
    offsetz: number = 0;
    forceapproach: number = 0;
    forcedecor: boolean = false;
    breakroutefinding: boolean = false;
    raiseobject: number = -1;
    multiloc: Int32Array | null = null;
    multivarbit: number = -1;
    multivarp: number = -1;
    bgsound_sound: number = -1;
    bgsound_range: number = 0;
    bgsound_mindelay: number = 0;
    bgsound_maxdelay: number = 0;
    bgsound_random: Int32Array | null = null;
    randomanimframe: boolean = true;
    field2799: boolean = false; // todo: identify
    members: boolean = false;
    params: HashTable<Linkable> | null = null;

    // todo: sort
    static memServer: boolean = false;
    static modelCacheDynamic: ModelSourceCache;

    // jag::oldscape::configdecoder::LocType::Init
    static init(config: Js5, models: Js5, memServer: boolean, lowMem: boolean): void {
        LocType.lowMem = lowMem;
        LocType.memServer = memServer;
        LocType.clientConfig = config;
        LocType.models = models;
        LocType.modelCacheDynamic = new ModelSourceCache(30);
    }

    // 465: locs are a flat group in idx2 (group 9, as the server serves it). getFile(file=id, group=9).
    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 9;
    }

    // jag::oldscape::configdecoder::LocType::List
    static list(id: number): LocType {
        const cached = LocType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = LocType.clientConfig.getFile(LocType.getGroupId(id), LocType.getFileId(id));
        const type = new LocType();
        type.id = id;
        if (data !== null) {
            type.decode(new Packet(data));
        }
        type.postDecode();

        if (!LocType.memServer && type.members) {
            type.op = null;
        }
        if (type.breakroutefinding) {
            type.blockwalk = 0;
            type.blockrange = false;
        }

        LocType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::LocType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::LocType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 1) {
            const count = buf.g1();
            if (count > 0) {
                if (this.model !== null && !LocType.lowMem) {
                    buf.pos += count * 3;
                    return;
                } else {
                    this.shape = new Int32Array(count);
                    this.model = new Int32Array(count);
                    for (let i = 0; i < count; i++) {
                        this.model[i] = buf.g2();
                        this.shape[i] = buf.g1();
                    }
                }
            }
        } else if (code === 2) {
            this.name = buf.gjstr();
        } else if (code === 5) {
            const count = buf.g1();
            if (count > 0) {
                if (this.model !== null && !LocType.lowMem) {
                    buf.pos += count * 2;
                    return;
                } else {
                    this.model = new Int32Array(count);
                    this.shape = null;
                    for (let i = 0; i < count; i++) {
                        this.model[i] = buf.g2();
                    }
                }
            }
        } else if (code === 14) {
            this.width = buf.g1();
        } else if (code === 15) {
            this.length = buf.g1();
        } else if (code === 17) {
            this.blockrange = false;
            this.blockwalk = 0;
        } else if (code === 18) {
            this.blockrange = false;
        } else if (code === 19) {
            this.active = buf.g1();
        } else if (code === 21) {
            this.skewType = 1;
        } else if (code === 22) {
            this.sharelight = true;
        } else if (code === 23) {
            this.occlude = true;
        } else if (code === 24) {
            this.anim = buf.g2();
            if (this.anim === 65535) {
                this.anim = -1;
            }
        } else if (code === 27) {
            this.blockwalk = 1;
        } else if (code === 28) {
            this.wallwidth = buf.g1();
        } else if (code === 29) {
            this.ambient = buf.g1b();
        } else if (code === 39) {
            this.contrast = buf.g1b() * 5;
        } else if (code >= 30 && code < 35) {
            this.op![code - 30] = buf.gjstr();
            if (this.op![code - 30]!.toLowerCase() === Text.hidden.toLowerCase()) {
                this.op![code - 30] = null;
            }
        } else if (code === 40) {
            const count = buf.g1();
            this.recol_s = new Int16Array(count);
            this.recol_d = new Int16Array(count);
            for (let i = 0; i < count; i++) {
                this.recol_s[i] = buf.g2();
                this.recol_d[i] = buf.g2();
            }
        } else if (code === 41) {
            const count = buf.g1();
            this.retex_d = new Int16Array(count);
            this.retex_s = new Int16Array(count);
            for (let i = 0; i < count; i++) {
                this.retex_s[i] = buf.g2();
                this.retex_d[i] = buf.g2();
            }
        } else if (code === 42) {
            const count = buf.g1();
            this.recol_d_palette = new Int8Array(count);
            for (let i = 0; i < count; i++) {
                this.recol_d_palette[i] = buf.g1b();
            }
        } else if (code === 60) {
            this.mapfunction = buf.g2();
        } else if (code === 62) {
            this.mirror = true;
        } else if (code === 64) {
            this.shadow = false;
        } else if (code === 65) {
            this.resizex = buf.g2();
        } else if (code === 66) {
            this.resizey = buf.g2();
        } else if (code === 67) {
            this.resizez = buf.g2();
        } else if (code === 68) {
            this.mapscene = buf.g2();
        } else if (code === 69) {
            this.forceapproach = buf.g1();
        } else if (code === 70) {
            this.offsetx = buf.g2b();
        } else if (code === 71) {
            this.offsety = buf.g2b();
        } else if (code === 72) {
            this.offsetz = buf.g2b();
        } else if (code === 73) {
            this.forcedecor = true;
        } else if (code === 74) {
            this.breakroutefinding = true;
        } else if (code === 75) {
            this.raiseobject = buf.g1();
        } else if (code === 77 || code === 92) {
            this.multivarbit = buf.g2();
            if (this.multivarbit === 65535) {
                this.multivarbit = -1;
            }
            let defaultLoc = -1;
            this.multivarp = buf.g2();
            if (this.multivarp === 65535) {
                this.multivarp = -1;
            }
            if (code === 92) {
                defaultLoc = buf.g2();
                if (defaultLoc === 65535) {
                    defaultLoc = -1;
                }
            }
            const count = buf.g1();
            this.multiloc = new Int32Array(count + 2);
            for (let i = 0; i <= count; i++) {
                this.multiloc[i] = buf.g2();
                if (this.multiloc[i] === 65535) {
                    this.multiloc[i] = -1;
                }
            }
            this.multiloc[count + 1] = defaultLoc;
        } else if (code === 78) {
            this.bgsound_sound = buf.g2();
            this.bgsound_range = buf.g1();
        } else if (code === 79) {
            this.bgsound_mindelay = buf.g2();
            this.bgsound_maxdelay = buf.g2();
            this.bgsound_range = buf.g1();
            const count = buf.g1();
            this.bgsound_random = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.bgsound_random[i] = buf.g2();
            }
        } else if (code === 81) {
            this.skewType = 2;
            this.skewAmount = ((buf.g1() * 256) << 16) >> 16;
        } else if (code === 82 || code === 88) {
        } else if (code === 89) {
            this.randomanimframe = false;
        } else if (code === 90) {
            this.field2799 = true;
        } else if (code === 91) {
            this.members = true;
        } else if (code === 93) {
            this.skewType = 3;
            this.skewAmount = buf.g2b();
        } else if (code === 94) {
            this.skewType = 4;
        } else if (code === 95) {
            this.skewType = 5;
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

    // jag::oldscape::configdecoder::LocType::PostDecode
    postDecode(): void {
        if (this.active === -1) {
            this.active = 0;
            if (this.model !== null && (this.shape === null || this.shape[0] === 10)) {
                this.active = 1;
            }

            for (let i = 0; i < 5; i++) {
                if (this.op![i] !== null) {
                    this.active = 1;
                    break;
                }
            }
        }

        if (this.raiseobject === -1) {
            this.raiseobject = this.blockwalk === 0 ? 0 : 1;
        }
    }

    // jag::oldscape::configdecoder::LocType::CheckModel
    checkModel(arg0: number): boolean {
        if (this.shape !== null) {
            for (let var4 = 0; var4 < this.shape.length; var4++) {
                if (arg0 === this.shape[var4]) {
                    return LocType.models!.requestDownload(this.model![var4] & 0xffff, 0);
                }
            }
            return true;
        } else if (this.model === null) {
            return true;
        } else if (arg0 === 10) {
            let var2 = true;
            for (let var3 = 0; var3 < this.model.length; var3++) {
                var2 = LocType.models!.requestDownload(this.model[var3] & 0xffff, 0) && var2;
            }
            return var2;
        } else {
            return true;
        }
    }

    // jag::oldscape::configdecoder::LocType::CheckModelAll
    checkModelAll(): boolean {
        if (this.model === null) {
            return true;
        }

        let var1 = true;
        for (let var2 = 0; var2 < this.model.length; var2++) {
            var1 = LocType.models!.requestDownload(this.model[var2] & 0xffff, 0) && var1;
        }
        return var1;
    }

    // jag::oldscape::configdecoder::LocType::GetModelLit
    getModel(arg0: number, arg1: Int32Array[] | null, arg2: Int32Array[], arg3: number, arg4: boolean, arg5: number, arg6: number, arg7: number): ModelCacheLit {
        let var9: bigint;
        if (this.shape === null) {
            var9 = BigInt(arg6) + (BigInt(this.id) << 10n);
        } else {
            var9 = BigInt(arg6) + (BigInt(this.id) << 10n) + (BigInt(arg0) << 3n);
        }
        let var11: boolean;
        if (arg4 && this.sharelight) {
            var11 = true;
            var9 |= -9223372036854775808n;
        } else {
            var11 = false;
        }
        let var12 = LocType.modelCacheDynamic.find(var9) as ModelSource | null;
        if (var12 === null) {
            const var13 = this.buildModel(arg6, arg0);
            if (var13 === null) {
                LocType.mc3.model = null;
                return LocType.mc3;
            }
            var13.method563();
            if (var11) {
                var12 = var13;
                var13.contrast = this.contrast * 5 + 768;
                var13.ambient = this.ambient + 64;
                var13.calculateNormals();
            } else {
                var12 = new SoftwareModelLit(var13, this.ambient + 64, 768 - -(this.contrast * 5), -50, -10, -50);
            }
            LocType.modelCacheDynamic.put(var9, var12);
        }
        if (var11) {
            var12 = (var12 as ModelUnlit).copyForShareLight();
        }
        if (this.skewType !== 0) {
            if (var12 instanceof SoftwareModelLit) {
                var12 = var12.hillSkew(this.skewType, this.skewAmount, arg2, arg1, arg3, arg7, arg5, true);
            } else if (var12 instanceof ModelUnlit) {
                var12 = var12.hillSkew(this.skewType, this.skewAmount, arg2, arg1, arg3, arg7, arg5);
            }
        }
        LocType.mc3.model = var12;
        return LocType.mc3;
    }

    // jag::oldscape::configdecoder::LocType::GetTempModel
    getTempModel(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: SeqType | null, arg6: Int32Array[], arg7: Int32Array[] | null, arg8: number): ModelCacheLit | null {
        let var10: bigint;
        if (this.shape === null) {
            var10 = BigInt(arg8) + (BigInt(this.id) << 10n);
        } else {
            var10 = BigInt(arg8) + (BigInt(this.id) << 10n) + (BigInt(arg2) << 3n);
        }
        let var12 = LocType.mc2.find(var10) as SoftwareModelLit | null;
        if (var12 === null) {
            const var13 = this.buildModel(arg8, arg2);
            if (var13 === null) {
                return null;
            }
            var12 = new SoftwareModelLit(var13, this.ambient + 64, this.contrast * 5 + 768, -50, -10, -50);
            LocType.mc2.put(var10, var12);
        }
        if (arg5 !== null) {
            var12 = arg5.animateModel90(arg8, var12, arg4) as SoftwareModelLit;
        }
        if (this.skewType !== 0) {
            if (arg5 === null) {
                var12 = var12.copyForAnim(true, true) as SoftwareModelLit;
            }
            var12 = var12.hillSkew(this.skewType, this.skewAmount, arg6, arg7, arg1, arg0, arg3, false);
        }
        LocType.mc3.model = var12;
        return LocType.mc3;
    }

    // jag::oldscape::configdecoder::LocType::BuildModel
    buildModel(arg0: number, arg1: number): ModelUnlit | null {
        let var3: ModelUnlit | null = null;
        let var4: boolean = this.mirror;
        if (arg1 === 2 && arg0 > 3) {
            var4 = !var4;
        }
        if (this.shape === null) {
            if (arg1 !== 10) {
                return null;
            }
            if (this.model === null) {
                return null;
            }
            const var5: number = this.model.length;
            for (let var6: number = 0; var6 < var5; var6++) {
                let var7: number = this.model[var6];
                if (var4) {
                    var7 += 65536;
                }
                var3 = LocType.mc1.find(BigInt(var7)) as ModelUnlit | null;
                if (var3 === null) {
                    var3 = ModelUnlit.load(LocType.models!, var7 & 0xffff);
                    if (var3 === null) {
                        return null;
                    }
                    if (var4) {
                        var3.mirror();
                    }
                    LocType.mc1.put(BigInt(var7), var3);
                }
                if (var5 > 1) {
                    LocType.temp[var6] = var3;
                }
            }
            if (var5 > 1) {
                var3 = new ModelUnlit(LocType.temp, var5);
            }
        } else {
            let var8: number = -1;
            for (let var9: number = 0; var9 < this.shape.length; var9++) {
                if (arg1 === this.shape[var9]) {
                    var8 = var9;
                    break;
                }
            }
            if (var8 === -1) {
                return null;
            }
            let var10: number = this.model![var8];
            if (var4) {
                var10 += 65536;
            }
            var3 = LocType.mc1.find(BigInt(var10)) as ModelUnlit | null;
            if (var3 === null) {
                var3 = ModelUnlit.load(LocType.models!, var10 & 0xffff);
                if (var3 === null) {
                    return null;
                }
                if (var4) {
                    var3.mirror();
                }
                LocType.mc1.put(BigInt(var10), var3);
            }
        }
        let var11: boolean;
        if (this.resizex === 128 && this.resizey === 128 && this.resizez === 128) {
            var11 = false;
        } else {
            var11 = true;
        }
        let var12: boolean;
        if (this.offsetx === 0 && this.offsety === 0 && this.offsetz === 0) {
            var12 = false;
        } else {
            var12 = true;
        }
        const var13: ModelUnlit = new ModelUnlit(var3!, arg0 === 0 && !var11 && !var12, this.recol_s === null, this.retex_s === null, true);
        if (arg1 === 4 && arg0 > 3) {
            var13.method573();
            var13.translate(45, 0, -45);
        }
        const var14: number = arg0 & 0x3;
        if (var14 === 1) {
            var13.rotate90();
        } else if (var14 === 2) {
            var13.rotate180();
        } else if (var14 === 3) {
            var13.rotate270();
        }
        if (this.recol_s !== null) {
            for (let var15: number = 0; var15 < this.recol_s.length; var15++) {
                if (this.recol_d_palette === null || var15 >= this.recol_d_palette.length) {
                    var13.recolour(this.recol_s[var15], this.recol_d![var15]);
                } else {
                    var13.recolour(this.recol_s[var15], LocType.clientpalette[this.recol_d_palette[var15] & 0xff]);
                }
            }
        }
        if (this.retex_s !== null) {
            for (let var16: number = 0; var16 < this.retex_s.length; var16++) {
                var13.retexture(this.retex_s[var16], this.retex_d![var16]);
            }
        }
        if (var11) {
            var13.resize(this.resizex, this.resizey, this.resizez);
        }
        if (var12) {
            var13.translate(this.offsetx, this.offsety, this.offsetz);
        }
        return var13;
    }

    // jag::oldscape::configdecoder::LocType::GetMultiLoc
    getMultiLoc(): LocType | null {
        let index = -1;
        if (this.multivarbit !== -1) {
            index = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            index = VarCache.var[this.multivarp];
        }

        if (index < 0 || index >= this.multiloc!.length - 1 || this.multiloc![index] === -1) {
            const id = this.multiloc![this.multiloc!.length - 1];
            return id === -1 ? null : LocType.list(id);
        } else {
            return LocType.list(this.multiloc![index]);
        }
    }

    // jag::oldscape::configdecoder::LocType::ResetCache
    static resetCache(): void {
        LocType.recentUse.clear();
        LocType.mc1.clear();
        LocType.modelCacheDynamic.clear();
        LocType.mc2.clear();
    }

    getParamInt(arg0: number, arg1: number): number {
        if (this.params === null) {
            return arg0;
        } else {
            const var3 = this.params.find(BigInt(arg1)) as IntNode | null;
            return var3 === null ? arg0 : var3.value;
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

    // jag::oldscape::configdecoder::LocType::HasBgSound
    hasBgSound(): boolean {
        if (this.multiloc === null) {
            return this.bgsound_sound !== -1 || this.bgsound_random !== null;
        }

        for (let i = 0; i < this.multiloc.length; i++) {
            if (this.multiloc[i] !== -1) {
                const loc = LocType.list(this.multiloc[i]);
                if (loc.bgsound_sound !== -1 || loc.bgsound_random !== null) {
                    return true;
                }
            }
        }

        return false;
    }
}
