import SeqType from '#/config/SeqType.js';

import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import type ModelLit from '#/dash3d/ModelLit.js';
import ModelUnlit from '#/dash3d/ModelUnlit.js';
import ModelSourceCache from '#/dash3d/ModelSourceCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::SpotType
export default class SpotType extends Linkable2 {
    // jag::oldscape::configdecoder::SpotType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::SpotType::m_pModels
    static models: Js5;

    // jag::oldscape::configdecoder::SpotType::m_recentUse
    static readonly recentUse: LruCache<SpotType> = new LruCache(64);

    // jag::oldscape::configdecoder::SpotType::m_modelCache
    static readonly modelCache: ModelSourceCache = new ModelSourceCache(30);

    id: number = 0;
    model: number = 0;
    anim: number = -1;
    recol_s: Int16Array | null = null;
    recol_d: Int16Array | null = null;
    retex_s: Int16Array | null = null;
    retex_d: Int16Array | null = null;
    resizeh: number = 128;
    resizev: number = 128;
    angle: number = 0;
    ambient: number = 0;
    contrast: number = 0;
    hillskew: boolean = false;

    static init(models: Js5, config: Js5): void {
        SpotType.models = models;
        SpotType.configClient = config;
    }

    // 465: spotanims are a flat group in idx2 (group 13). getFile(file=id, group=13).
    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 13;
    }

    static list(id: number): SpotType {
        const cached = SpotType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = SpotType.configClient.getFile(SpotType.getGroupId(id), SpotType.getFileId(id));
        const type = new SpotType();
        type.id = id;
        if (data !== null) {
            type.decode(new Packet(data));
        }

        SpotType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::SpotType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // 464 spotanim decode (Java SpotAnimType.method365 — VERIFIED): recolours are INDIVIDUAL
    // opcodes — 40+i = src slot i, 50+i = dst slot i (u16 each), NO count byte / pairs. Fixed
    // 10-slot arrays defaulting 0; applied only when src[0] != 0. rev-500's count+pairs read
    // consumed wrong bytes and scrambled the whole def (red air-spell projectiles).
    decodeInner(code: number, buf: Packet): void {
        if (code === 1) {
            this.model = buf.g2();
        } else if (code === 2) {
            this.anim = buf.g2();
        } else if (code === 4) {
            this.resizeh = buf.g2();
        } else if (code === 5) {
            this.resizev = buf.g2();
        } else if (code === 6) {
            this.angle = buf.g2();
        } else if (code === 7) {
            this.ambient = buf.g1();
        } else if (code === 8) {
            this.contrast = buf.g1();
        } else if (code >= 40 && code < 50) {
            if (this.recol_s === null) {
                this.recol_s = new Int16Array(10);
                this.recol_d = new Int16Array(10);
            }
            this.recol_s[code - 40] = buf.g2();
        } else if (code >= 50 && code < 60) {
            if (this.recol_d === null) {
                this.recol_s = new Int16Array(10);
                this.recol_d = new Int16Array(10);
            }
            this.recol_d![code - 50] = buf.g2();
        }
    }

    // jag::oldscape::configdecoder::SpotType::GetTempModel2
    getTempModel2(arg0: number): ModelLit | null {
        let var2 = SpotType.modelCache.find(BigInt(this.id)) as ModelLit | null;
        if (var2 === null) {
            const var3 = ModelUnlit.load(SpotType.models, this.model);
            if (var3 === null) {
                return null;
            }

            // Java method371: apply all slots only when src[0] != 0
            if (this.recol_s !== null && this.recol_s[0] !== 0) {
                for (let var4 = 0; var4 < this.recol_s.length; var4++) {
                    var3.recolour(this.recol_s[var4], this.recol_d![var4]);
                }
            }

            var2 = var3.light(this.ambient + 64, this.contrast + 850, -30, -50, -30);
            SpotType.modelCache.put(BigInt(this.id), var2);
        }

        let var6: ModelLit;
        if (this.anim === -1 || arg0 === -1) {
            var6 = var2.copyForAnim2(true, true);
        } else {
            var6 = SeqType.list(this.anim).animateModel2(var2, arg0);
        }

        if (this.resizeh !== 128 || this.resizev !== 128) {
            var6.resize(this.resizeh, this.resizev, this.resizeh);
        }

        if (this.angle !== 0) {
            if (this.angle === 90) {
                var6.rotate90();
            }
            if (this.angle === 180) {
                var6.rotate180();
            }
            if (this.angle === 270) {
                var6.rotate270();
            }
        }

        return var6;
    }

    static resetCache(): void {
        SpotType.recentUse.clear();
        SpotType.modelCache.clear();
    }
}
