import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable from '#/datastruct/Linkable.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import StringNode from '#/datastruct/StringNode.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';
import IntMath from '#/util/IntMath.js';

// jag::oldscape::configdecoder::EnumType
export default class EnumType extends Linkable2 {
    // jag::oldscape::configdecoder::EnumType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::EnumType::m_recentUse
    static readonly recentUse: LruCache<EnumType> = new LruCache(128);

    inputtype: number = 0;
    outputtype: number = 0;
    defaultString: string = 'null';
    defaultInt: number = 0;
    values: HashTable<Linkable> | null = null;

    // jag::oldscape::configdecoder::EnumType::Init
    static init(config: Js5): void {
        EnumType.configClient = config;
    }

    // 465: enums are a flat group in idx2 (group 8). getFile(file=id, group=8).
    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 8;
    }

    static list(id: number): EnumType {
        const cached = EnumType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = EnumType.configClient.getFile(EnumType.getGroupId(id), EnumType.getFileId(id));
        const type = new EnumType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        EnumType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::EnumType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::EnumType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 1) {
            this.inputtype = buf.g1();
        } else if (code === 2) {
            this.outputtype = buf.g1();
        } else if (code === 3) {
            this.defaultString = buf.gjstr();
        } else if (code === 4) {
            this.defaultInt = buf.g4();
        } else if (code === 5 || code === 6) {
            const count = buf.g2();

            this.values = new HashTable(IntMath.bitceil(count));
            for (let i = 0; i < count; i++) {
                const key = buf.g4();

                let value: Linkable;
                if (code === 5) {
                    value = new StringNode(buf.gjstr());
                } else {
                    value = new IntNode(buf.g4());
                }

                this.values.put(BigInt(key), value);
            }
        }
    }

    getValueInt(key: number): number {
        if (this.values === null) {
            return this.defaultInt;
        } else {
            const node = this.values.find(BigInt(key)) as IntNode | null;
            return node === null ? this.defaultInt : node.value;
        }
    }

    getValueString(key: number): string {
        if (this.values === null) {
            return this.defaultString;
        } else {
            const node = this.values.find(BigInt(key)) as StringNode | null;
            return node === null ? this.defaultString : (node.value as string);
        }
    }
}
