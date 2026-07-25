import ModelUnlit from '#/dash3d/ModelUnlit.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::IdkType
export default class IdkType extends Linkable2 {
    // jag::oldscape::configdecoder::IdkType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::IdkType::m_pModels
    static models: Js5;

    // jag::oldscape::configdecoder::IdkType::m_numDefinitions
    static numDefinitions: number = 0;

    // jag::oldscape::configdecoder::IdkType::m_recentUse
    static readonly recentUse: LruCache<IdkType> = new LruCache(64);

    type: number = -1;
    model: Int32Array | null = null;
    recol_s: Int16Array | null = null;
    recol_d: Int16Array | null = null;
    retex_s: Int16Array | null = null;
    retex_d: Int16Array | null = null;
    readonly head: Int32Array = new Int32Array(5).fill(-1);
    disable: boolean = false;

    // jag::oldscape::configdecoder::IdkType::Init
    static init(models: Js5, config: Js5): void {
        IdkType.models = models;
        IdkType.configClient = config;
        IdkType.numDefinitions = IdkType.configClient.getFileIdLimit(3);
    }

    // jag::oldscape::configdecoder::IdkType::List
    static list(id: number): IdkType {
        const cached = IdkType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = IdkType.configClient.getFile(id, 3);
        const type = new IdkType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        IdkType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::IdkType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(buf, code);
        }
    }

    // jag::oldscape::configdecoder::IdkType::Decode
    decodeInner(buf: Packet, code: number): void {
        // This 464 server re-encodes 465 IDKit body parts into NpcType binary format
        // (js5-update-server.ts convertIdkitBinaryToNpcType), which the 464 Java client reads with
        // the NpcType decoder. Opcodes: 1 = models (u8 count + u16 each), 12 = bodyPartType (u8),
        // 40 = recolour pairs (u8 count + (u16 src, u16 dst)), 60 = head models (u8 count + u16 each).
        // (rev-500 idkit was op1=type / op2=models / op40+41=retex+recol / op60-69=per-index head —
        // reading that against this data gave garbage model ids -> empty body -> no player model.)
        if (code === 1) {
            const count = buf.g1();
            this.model = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.model[i] = buf.g2();
            }
        } else if (code === 12) {
            this.type = buf.g1();
        } else if (code === 3) {
            this.disable = true;
        } else if (code === 40) {
            const count = buf.g1();
            this.recol_s = new Int16Array(count);
            this.recol_d = new Int16Array(count);
            for (let i = 0; i < count; i++) {
                this.recol_s[i] = buf.g2();
                this.recol_d[i] = buf.g2();
            }
        } else if (code === 60) {
            const count = buf.g1();
            for (let i = 0; i < count; i++) {
                const headModel = buf.g2();
                if (i < this.head.length) {
                    this.head[i] = headModel;
                }
            }
        }
    }

    // jag::oldscape::configdecoder::IdkType::CheckModel
    checkModel(): boolean {
        let ready = true;
        for (let i = 0; i < 5; i++) {
            if (this.head[i] !== -1 && !IdkType.models.requestDownload(this.head[i], 0)) {
                ready = false;
            }
        }
        return ready;
    }

    // jag::oldscape::configdecoder::IdkType::GetModelNoCheck
    getModelNoCheck(): ModelUnlit | null {
        if (this.model === null) {
            return null;
        }

        const models = new Array<ModelUnlit | null>(this.model.length).fill(null);
        for (let i = 0; i < this.model.length; i++) {
            models[i] = ModelUnlit.load(IdkType.models, this.model[i]);
        }

        let built: ModelUnlit | null;
        if (models.length === 1) {
            built = models[0];
        } else {
            built = new ModelUnlit(models, models.length);
        }

        if (this.retex_d !== null) {
            for (let i = 0; i < this.retex_d.length; i++) {
                built!.recolour(this.retex_d[i], this.recol_d![i]);
            }
        }

        if (this.retex_s !== null) {
            for (let i = 0; i < this.retex_s.length; i++) {
                built!.retexture(this.retex_s[i], this.recol_s![i]);
            }
        }

        return built;
    }

    // jag::oldscape::configdecoder::IdkType::CheckHead
    checkHead(): boolean {
        if (this.model === null) {
            return true;
        }

        let ready = true;
        for (let i = 0; i < this.model.length; i++) {
            if (!IdkType.models.requestDownload(this.model[i], 0)) {
                ready = false;
            }
        }
        return ready;
    }

    // jag::oldscape::configdecoder::IdkType::GetHeadNoCheck
    getHeadNoCheck(): ModelUnlit {
        let count = 0;
        const models = new Array<ModelUnlit | null>(5).fill(null);
        for (let i = 0; i < 5; i++) {
            if (this.head[i] !== -1) {
                models[count++] = ModelUnlit.load(IdkType.models, this.head[i]);
            }
        }

        const built = new ModelUnlit(models, count);

        if (this.retex_d !== null) {
            for (let i = 0; i < this.retex_d.length; i++) {
                built.recolour(this.retex_d[i], this.recol_d![i]);
            }
        }

        if (this.retex_s !== null) {
            for (let i = 0; i < this.retex_s.length; i++) {
                built.retexture(this.retex_s[i], this.recol_s![i]);
            }
        }

        return built;
    }

    // jag::oldscape::configdecoder::IdkType::ResetCache
    static resetCache(): void {
        IdkType.recentUse.clear();
    }
}
