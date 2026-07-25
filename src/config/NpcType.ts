import LruCache from '#/datastruct/LruCache.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable from '#/datastruct/Linkable.js';
import StringNode from '#/datastruct/StringNode.js';

import SeqType from '#/config/SeqType.js';
import Text from '#/constants/Text.js';
import type ModelLit from '#/dash3d/ModelLit.js';
import ModelUnlit from '#/dash3d/ModelUnlit.js';
import ModelSourceCache from '#/dash3d/ModelSourceCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import IntMath from '#/util/IntMath.js';
import VarCache from '#/var/VarCache.js';

// jag::oldscape::configdecoder::NpcType
export default class NpcType extends Linkable2 {
    static clientpalette: Int16Array = new Int16Array(256);

    // jag::oldscape::configdecoder::NpcType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::NpcType::m_pModels
    static models: Js5;

    // jag::oldscape::configdecoder::NpcType::m_recentUse
    static readonly recentUse: LruCache<NpcType> = new LruCache(64);

    // jag::oldscape::configdecoder::NpcType::m_modelCache
    static readonly modelCache: ModelSourceCache = new ModelSourceCache(50);

    id: number = 0;
    name: string = 'null';
    size: number = 1;
    model: Int32Array | null = null;
    head: Int32Array | null = null;
    readyanim: number = -1;
    turnleftanim: number = -1;
    turnrightanim: number = -1;
    walkanim: number = -1;
    walkanim_b: number = -1;
    walkanim_r: number = -1;
    walkanim_l: number = -1;
    recol_s: Int16Array | null = null;
    recol_d: Int16Array | null = null;
    retex_s: Int16Array | null = null;
    retex_d: Int16Array | null = null;
    recol_d_palette: Int8Array | null = null;
    readonly op: (string | null)[] = new Array(5).fill(null);
    minimap: boolean = true;
    vislevel: number = -1;
    resizeh: number = 128;
    resizev: number = 128;
    alwaysontop: boolean = false;
    ambient: number = 0;
    contrast: number = 0;
    headicon: number = -1;
    turnspeed: number = 32;
    multinpc: Int32Array | null = null;
    multivarbit: number = -1;
    multivarp: number = -1;
    active: boolean = true;
    walksmoothing: boolean = true;
    field2350: number = 0;
    field2329: number = 0;
    params: HashTable<Linkable> | null = null;

    // todo: sort
    static readonly headModelCache: ModelSourceCache = new ModelSourceCache(5);

    // jag::oldscape::configdecoder::NpcType::Init
    static init(config: Js5, models: Js5): void {
        NpcType.configClient = config;
        NpcType.models = models;
    }

    // This 464 server serves NPC entity configs as flat files in config group 7 (re-encoded to
    // LocType binary), file = npc id. getFile(a,b) reads unpacked[b][a], so the FILE is id and the
    // GROUP is 7. (rev-500 used nested addressing id&0x7f / id>>>7 — wrong group entirely here.)
    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 7;
    }

    // jag::oldscape::configdecoder::NpcType::List
    static list(id: number): NpcType {
        const cached = NpcType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = NpcType.configClient.getFile(NpcType.getGroupId(id), NpcType.getFileId(id));
        const type = new NpcType();
        type.id = id;
        if (data !== null) {
            type.decode(new Packet(data));
        }
        type.postDecode();

        NpcType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::NpcType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::NpcType::Decode
    decodeInner(code: number, buf: Packet): void {
        // This 464 server serves NPC entities as LocType binary (js5-update-server.ts
        // convertNpcEntries) — the 464 client renders every NPC via the LocType path. So NPC configs
        // use LOCTYPE opcodes, NOT NpcType opcodes. Handle exactly the opcodes the server writes
        // (5,2,14,24,28,29,30-34,40,64,65,66,68,73,79,80) or the stream desyncs. (rev-500 read
        // NpcType opcodes 1/12/13-17/... against this LocType data -> garbage -> no NPC.)
        if (code === 5) {
            // models (u8 count + u16 each, no shape byte)
            const count = buf.g1();
            this.model = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.model[i] = buf.g2();
            }
        } else if (code === 2) {
            this.name = buf.gjstr();
        } else if (code === 14) {
            this.size = buf.g1();
        } else if (code === 24) {
            this.readyanim = buf.g2();
            if (this.readyanim === 65535) {
                this.readyanim = -1;
            }
        } else if (code === 28) {
            this.turnspeed = buf.g1();
        } else if (code === 29) {
            this.ambient = buf.g1b();
        } else if (code === 64) {
            // not clickable — no data
        } else if (code === 65) {
            this.resizeh = buf.g2();
        } else if (code === 66) {
            this.resizev = buf.g2();
        } else if (code === 68) {
            this.vislevel = buf.g2();
        } else if (code === 73) {
            // visible on minimap — no data
        } else if (code === 79) {
            // head models: u16, u16, u8 (all unused), then u8 count + u16 each
            buf.g2();
            buf.g2();
            buf.g1();
            const headCount = buf.g1();
            this.head = new Int32Array(headCount);
            for (let i = 0; i < headCount; i++) {
                this.head[i] = buf.g2();
            }
        } else if (code === 80) {
            // walk/turn anims (6 × u16): turnLeft, turnRight, walkForward, walkBackward, walkLeft, walkRight
            this.turnleftanim = buf.g2();
            if (this.turnleftanim === 65535) {
                this.turnleftanim = -1;
            }
            this.turnrightanim = buf.g2();
            if (this.turnrightanim === 65535) {
                this.turnrightanim = -1;
            }
            this.walkanim = buf.g2();
            if (this.walkanim === 65535) {
                this.walkanim = -1;
            }
            this.walkanim_b = buf.g2();
            if (this.walkanim_b === 65535) {
                this.walkanim_b = -1;
            }
            this.walkanim_l = buf.g2();
            if (this.walkanim_l === 65535) {
                this.walkanim_l = -1;
            }
            this.walkanim_r = buf.g2();
            if (this.walkanim_r === 65535) {
                this.walkanim_r = -1;
            }
        } else if (code >= 30 && code < 35) {
            this.op[code - 30] = buf.gjstr();
            if (this.op[code - 30]!.toLowerCase() === Text.hidden.toLowerCase()) {
                this.op[code - 30] = null;
            }
        } else if (code === 40) {
            const count = buf.g1();
            this.recol_d = new Int16Array(count);
            this.recol_s = new Int16Array(count);
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
            const count = buf.g1();
            this.head = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.head[i] = buf.g2();
            }
        } else if (code === 93) {
            this.minimap = false;
        } else if (code === 95) {
            this.vislevel = buf.g2();
        } else if (code === 97) {
            this.resizeh = buf.g2();
        } else if (code === 98) {
            this.resizev = buf.g2();
        } else if (code === 99) {
            this.alwaysontop = true;
        } else if (code === 100) {
            this.ambient = buf.g1b();
        } else if (code === 101) {
            this.contrast = buf.g1b() * 5;
        } else if (code === 102) {
            this.headicon = buf.g2();
        } else if (code === 103) {
            this.turnspeed = buf.g2();
        } else if (code === 106 || code === 118) {
            let var13 = -1;
            this.multivarbit = buf.g2();
            if (this.multivarbit === 65535) {
                this.multivarbit = -1;
            }
            this.multivarp = buf.g2();
            if (this.multivarp === 65535) {
                this.multivarp = -1;
            }
            if (code === 118) {
                var13 = buf.g2();
                if (var13 === 65535) {
                    var13 = -1;
                }
            }
            const var14 = buf.g1();
            this.multinpc = new Int32Array(var14 + 2);
            for (let var15 = 0; var15 <= var14; var15++) {
                this.multinpc[var15] = buf.g2();
                if (this.multinpc[var15] === 65535) {
                    this.multinpc[var15] = -1;
                }
            }
            this.multinpc[var14 + 1] = var13;
        } else if (code === 107) {
            this.active = false;
        } else if (code === 109) {
            this.walksmoothing = false;
        } else if (code === 111) {
            // spotshadow
        } else if (code === 113) {
            // spotshadowcolour
            buf.g2();
            buf.g2();
        } else if (code === 114) {
            // spotshadowtrans
            buf.g1b();
            buf.g1b();
        } else if (code === 115) {
            // shadow related?
            this.field2350 = buf.g1() * 4;
            this.field2329 = buf.g1() * 4;
        } else if (code === 119) {
            // walkflags
            buf.g1b();
        } else if (code === 249) {
            const var7 = buf.g1();
            if (this.params === null) {
                const var8 = IntMath.bitceil(var7);
                this.params = new HashTable(var8);
            }
            for (let var9 = 0; var9 < var7; var9++) {
                const var10 = buf.g1() === 1;
                const var11 = buf.g3();
                let var12: Linkable;
                if (var10) {
                    var12 = new StringNode(buf.gjstr());
                } else {
                    var12 = new IntNode(buf.g4());
                }
                this.params.put(BigInt(var11), var12);
            }
        }
    }

    // jag::oldscape::configdecoder::NpcType::PostDecode
    postDecode(): void {}

    // jag::oldscape::configdecoder::NpcType::GetTempModel
    getTempModel(arg0: SeqType | null, arg1: number, arg2: number, arg3: SeqType | null): ModelLit | null {
        if (this.multinpc !== null) {
            const var5 = this.getMultiNpc();
            return var5 === null ? null : var5.getTempModel(arg0, arg1, arg2, arg3);
        }

        let var6 = NpcType.modelCache.find(BigInt(this.id)) as ModelLit | null;

        if (var6 === null) {
            let var7 = false;
            for (let var8 = 0; var8 < this.model!.length; var8++) {
                if (!NpcType.models.requestDownload(this.model![var8], 0)) {
                    var7 = true;
                }
            }
            if (var7) {
                return null;
            }

            const var9: ModelUnlit[] = new Array(this.model!.length);
            for (let var10: number = 0; var10 < this.model!.length; var10++) {
                var9[var10] = ModelUnlit.load(NpcType.models, this.model![var10])!;
            }

            let var11: ModelUnlit;
            if (var9.length === 1) {
                var11 = var9[0];
            } else {
                var11 = new ModelUnlit(var9, var9.length);
            }

            if (this.recol_s !== null) {
                for (let var12: number = 0; var12 < this.recol_s.length; var12++) {
                    if (this.recol_d_palette === null || var12 >= this.recol_d_palette.length) {
                        var11.recolour(this.recol_s[var12], this.recol_d![var12]);
                    } else {
                        var11.recolour(this.recol_s[var12], NpcType.clientpalette[this.recol_d_palette[var12] & 0xff]);
                    }
                }
            }

            if (this.retex_s !== null) {
                for (let var13: number = 0; var13 < this.retex_s.length; var13++) {
                    var11.retexture(this.retex_s[var13], this.retex_d![var13]);
                }
            }

            var6 = var11.light(this.ambient + 64, 850 - -this.contrast, -30, -50, -30);
            NpcType.modelCache.put(BigInt(this.id), var6);
        }

        let var14: ModelLit;
        if (arg3 !== null && arg0 !== null) {
            var14 = arg3.splitAnimateModel(arg2, arg0, arg1, var6);
        } else if (arg3 !== null) {
            var14 = arg3.animateModel(arg2, var6);
        } else if (arg0 === null) {
            var14 = var6.copyForAnim(true, true);
        } else {
            var14 = arg0.animateModel(arg1, var6);
        }

        if (this.resizeh !== 128 || this.resizev !== 128) {
            var14.resize(this.resizeh, this.resizev, this.resizeh);
        }

        return var14;
    }

    // jag::oldscape::configdecoder::NpcType::GetHead
    getHead(arg0: number, arg1: SeqType | null): ModelLit | null {
        if (this.multinpc !== null) {
            const var3 = this.getMultiNpc();
            return var3 === null ? null : var3.getHead(arg0, arg1);
        } else if (this.head === null) {
            return null;
        } else {
            let var4 = NpcType.headModelCache.find(BigInt(this.id)) as ModelLit | null;
            if (var4 === null) {
                let var5 = false;
                for (let var6 = 0; var6 < this.head.length; var6++) {
                    if (!NpcType.models.requestDownload(this.head[var6], 0)) {
                        var5 = true;
                    }
                }
                if (var5) {
                    return null;
                }

                const var7: ModelUnlit[] = new Array(this.head.length);
                for (let var8: number = 0; var8 < this.head.length; var8++) {
                    var7[var8] = ModelUnlit.load(NpcType.models, this.head[var8])!;
                }

                let var9: ModelUnlit;
                if (var7.length === 1) {
                    var9 = var7[0];
                } else {
                    var9 = new ModelUnlit(var7, var7.length);
                }

                if (this.recol_s !== null) {
                    for (let var10: number = 0; var10 < this.recol_s.length; var10++) {
                        if (this.recol_d_palette === null || this.recol_d_palette.length <= var10) {
                            var9.recolour(this.recol_s[var10], this.recol_d![var10]);
                        } else {
                            var9.recolour(this.recol_s[var10], NpcType.clientpalette[this.recol_d_palette[var10] & 0xff]);
                        }
                    }
                }

                if (this.retex_s !== null) {
                    for (let var11: number = 0; var11 < this.retex_s.length; var11++) {
                        var9.retexture(this.retex_s[var11], this.retex_d![var11]);
                    }
                }

                var4 = var9.light(64, 768, -50, -10, -50);
                NpcType.headModelCache.put(BigInt(this.id), var4);
            }
            if (arg1 !== null) {
                var4 = arg1.animateModelWithExtra(arg0, var4);
            }
            return var4;
        }
    }

    getParamInt(arg0: number, arg1: number): number {
        if (this.params === null) {
            return arg0;
        } else {
            const var3 = this.params.find(BigInt(arg1)) as IntNode | null;
            return var3 === null ? arg0 : var3.value;
        }
    }

    getParamString(arg0: number, arg1: string | null): string | null {
        if (this.params === null) {
            return arg1;
        } else {
            const var3 = this.params.find(BigInt(arg0)) as StringNode | null;
            return var3 === null ? arg1 : (var3.value as string);
        }
    }

    // jag::oldscape::configdecoder::NpcType::GetMultiNpc
    getMultiNpc(): NpcType | null {
        let var1 = -1;
        if (this.multivarbit !== -1) {
            var1 = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            var1 = VarCache.var[this.multivarp];
        }

        if (var1 < 0 || this.multinpc!.length - 1 <= var1 || this.multinpc![var1] === -1) {
            const var2 = this.multinpc![this.multinpc!.length - 1];
            return var2 === -1 ? null : NpcType.list(var2);
        } else {
            return NpcType.list(this.multinpc![var1]);
        }
    }

    // jag::oldscape::configdecoder::NpcType::IsMultiNpcVisible
    isMultiNpcVisible(): boolean {
        if (this.multinpc === null) {
            return true;
        }
        let var1 = -1;
        if (this.multivarbit !== -1) {
            var1 = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            var1 = VarCache.var[this.multivarp];
        }
        if (var1 < 0 || var1 >= this.multinpc.length - 1 || this.multinpc[var1] === -1) {
            const var2 = this.multinpc[this.multinpc.length - 1];
            return var2 !== -1;
        } else {
            return true;
        }
    }

    // jag::oldscape::configdecoder::NpcType::ResetCache
    static resetCache(): void {
        NpcType.recentUse.clear();
        NpcType.modelCache.clear();
        NpcType.headModelCache.clear();
    }

    static resetModelCache(): void {
        NpcType.modelCache.clear();
    }

    static resetHeadModelCache(): void {
        NpcType.headModelCache.clear();
    }
}
