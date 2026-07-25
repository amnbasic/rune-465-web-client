import JagException from '#/callstack/JagException.js';
import IntHashTable from '#/datastruct/IntHashTable.js';
import JagString from '#/jstring/JagString.js';

import BZip2 from '#/io/BZip2.js';
import ByteArrayWrapper from '#/io/ByteArrayWrapper.js';
import GZip from '#/io/GZip.js';
import Packet from '#/io/Packet.js';
import ArrayUtil from '#/util/ArrayUtil.js';

export default class Js5 {
    static readonly js5MaxSize: number = 0;
    static readonly strictBounds: boolean = false;
    static readonly gzip: GZip = new GZip();
    static readonly field4281: string = '';

    packed: (Uint8Array | ByteArrayWrapper | null)[] = null!;
    unpacked: ((Uint8Array | ByteArrayWrapper | null)[] | null)[] = null!;
    crc: number = 0;
    size: number = 0;
    groupIds: Int32Array = new Int32Array(0);
    groupChecksums: Int32Array = new Int32Array(0);
    groupVersions: Int32Array = new Int32Array(0);
    groupSizes: Int32Array = new Int32Array(0);
    fileIdLimit: Int32Array = new Int32Array(0);
    groupNameHash: Int32Array | null = null;
    groupNameHashTable: IntHashTable | null = null;
    fileIds: (Int32Array | null)[] = [];
    fileNameHashes: Int32Array[] | null = null;
    fileNameHashTables: (IntHashTable | null)[] | null = null;
    discardPacked: boolean;
    discardUnpacked: boolean;

    constructor(arg0: boolean = false, arg1: boolean = false) {
        this.discardPacked = arg0;
        this.discardUnpacked = arg1;
    }

    static getUncompressedPacket(arg0: Uint8Array): Uint8Array {
        const var1 = new Packet(arg0);
        const var2 = var1.g1();
        const var3 = var1.g4();
        if (var3 < 0 || (Js5.js5MaxSize !== 0 && var3 > Js5.js5MaxSize)) {
            throw new Error();
        } else if (var2 === 0) {
            const var4 = new Uint8Array(var3);
            var1.gdata(var3, var4);
            return var4;
        } else {
            const var5 = var1.g4();
            if (var5 < 0 || (Js5.js5MaxSize !== 0 && Js5.js5MaxSize < var5)) {
                throw new Error();
            }
            const var6 = new Uint8Array(var5);
            if (var2 === 1) {
                BZip2.decompress(var6, var5, arg0, var3);
            } else {
                Js5.gzip.decompress(var1, var6);
            }
            return var6;
        }
    }

    decodeIndex(arg0: Uint8Array): void {
        this.crc = Packet.method541(arg0, arg0.length);
        const var2 = new Packet(Js5.getUncompressedPacket(arg0));
        const var3 = var2.g1();
        if (var3 !== 5 && var3 !== 6) {
            throw new Error('Incorrect JS5 protocol number: ' + var3);
        }
        if (var3 >= 6) {
            var2.g4();
        }
        let var4 = 0;
        const var5 = var2.g1();
        this.size = var2.g2();
        this.groupIds = new Int32Array(this.size);
        let var6 = -1;
        for (let var7 = 0; var7 < this.size; var7++) {
            this.groupIds[var7] = var4 += var2.g2();
            if (var6 < this.groupIds[var7]) {
                var6 = this.groupIds[var7];
            }
        }
        this.fileIdLimit = new Int32Array(var6 + 1);
        this.fileIds = new Array(var6 + 1).fill(null);
        this.unpacked = new Array(var6 + 1).fill(null);
        this.groupChecksums = new Int32Array(var6 + 1);
        this.packed = new Array(var6 + 1).fill(null);
        this.groupSizes = new Int32Array(var6 + 1);
        this.groupVersions = new Int32Array(var6 + 1);
        if (var5 !== 0) {
            this.groupNameHash = new Int32Array(var6 + 1);
            for (let var8 = 0; var8 < var6 + 1; var8++) {
                this.groupNameHash[var8] = -1;
            }
            for (let var9 = 0; var9 < this.size; var9++) {
                this.groupNameHash[this.groupIds[var9]] = var2.g4();
            }
            this.groupNameHashTable = new IntHashTable(this.groupNameHash);
        }
        for (let var10 = 0; var10 < this.size; var10++) {
            this.groupChecksums[this.groupIds[var10]] = var2.g4();
        }
        for (let var11 = 0; var11 < this.size; var11++) {
            this.groupVersions[this.groupIds[var11]] = var2.g4();
        }
        for (let var12 = 0; var12 < this.size; var12++) {
            this.groupSizes[this.groupIds[var12]] = var2.g2();
        }
        for (let var13 = 0; var13 < this.size; var13++) {
            const var14 = this.groupIds[var13];
            const var15 = this.groupSizes[var14];
            let var16 = 0;
            this.fileIds[var14] = new Int32Array(var15);
            let var17 = -1;
            for (let var18 = 0; var18 < var15; var18++) {
                const var19 = (this.fileIds[var14]![var18] = var16 += var2.g2());
                if (var17 < var19) {
                    var17 = var19;
                }
            }
            this.fileIdLimit[var14] = var17 + 1;
            if (var15 === var17 + 1) {
                this.fileIds[var14] = null;
            }
        }
        if (var5 === 0) {
            return;
        }
        this.fileNameHashes = new Array(var6 + 1).fill(null);
        this.fileNameHashTables = new Array(var6 + 1).fill(null);
        for (let var20 = 0; var20 < this.size; var20++) {
            const var21 = this.groupIds[var20];
            const var22 = this.groupSizes[var21];
            this.fileNameHashes[var21] = new Int32Array(this.fileIdLimit[var21]);
            for (let var23 = 0; var23 < this.fileIdLimit[var21]; var23++) {
                this.fileNameHashes[var21][var23] = -1;
            }
            for (let var24 = 0; var24 < var22; var24++) {
                let var25;
                if (this.fileIds[var21] == null) {
                    var25 = var24;
                } else {
                    var25 = this.fileIds[var21]![var24];
                }
                this.fileNameHashes[var21][var25] = var2.g4();
            }
            this.fileNameHashTables[var21] = new IntHashTable(this.fileNameHashes[var21]);
        }
    }

    getGroupCount(): number {
        return this.fileIdLimit.length;
    }

    getFileIdLimit(arg0: number): number {
        return this.isGroupValid(arg0) ? this.fileIdLimit[arg0] : 0;
    }

    getFileList(arg0: number): Int32Array | null {
        if (!this.isGroupValid(arg0)) {
            return null;
        }
        let var2 = this.fileIds[arg0];
        if (var2 == null) {
            var2 = new Int32Array(this.groupSizes[arg0]);
            let var3 = 0;
            while (var2.length > var3) {
                var2[var3] = var3++;
            }
        }
        return var2;
    }

    getGroupId(arg0: string): number {
        const var2 = arg0.toLowerCase();
        const var3 = this.groupNameHashTable!.find(JagString.fromLatin1String(var2).computeCp1252HashFromUtf8());
        return this.isGroupValid(var3) ? var3 : -1;
    }

    getFileId(arg0: string, arg1: number): number {
        if (!this.isGroupValid(arg1)) {
            return -1;
        }
        const var3 = arg0.toLowerCase();
        const var4 = this.fileNameHashTables![arg1]!.find(JagString.fromLatin1String(var3).computeCp1252HashFromUtf8());
        return this.isFileValid(var4, arg1) ? var4 : -1;
    }

    getFile(file: number): Uint8Array | null;
    getFile(file: number, group: number): Uint8Array | null;
    getFile(group: string, file: string): Uint8Array | null;
    getFile(file: number | string, group?: number | string): Uint8Array | null {
        if (typeof file === 'string' || typeof group === 'string') {
            if (typeof file !== 'string' || typeof group !== 'string') {
                return null;
            }
            const groupId = this.getGroupId(file);
            if (groupId < 0) {
                return null;
            }
            const fileId = this.getFileId(group, groupId);
            return fileId < 0 ? null : this.getFile(fileId, groupId);
        }

        if (typeof group === 'undefined') {
            if (this.fileIdLimit.length === 1) {
                return this.fetchFile(null, 0, file);
            }

            if (!this.isGroupValid(file)) {
                return null;
            }

            if (this.fileIdLimit[file] === 1) {
                return this.fetchFile(null, file, 0);
            }

            throw new Error();
        }

        return this.fetchFile(null, group, file);
    }

    peekFile(arg0: number, arg1: number): Uint8Array | null {
        if (!this.isFileValid(arg0, arg1)) {
            return null;
        }
        if (this.unpacked[arg1] == null || this.unpacked[arg1]![arg0] == null) {
            const var3 = this.unpackGroupData(arg1, null);
            if (!var3) {
                this.requestGroupDownload2(arg1);
                const var4 = this.unpackGroupData(arg1, null);
                if (!var4) {
                    return null;
                }
            }
        }
        return ByteArrayWrapper.unwrap(false, this.unpacked[arg1]![arg0]);
    }

    requestDownload(file: number): boolean;
    requestDownload(group: number, file: number): boolean;
    requestDownload(group: string): boolean;
    requestDownload(group: string, file: string): boolean;
    requestDownload(group: number | string, file?: number | string): boolean {
        if (typeof file === 'undefined') {
            if (typeof group === 'string') {
                return this.getGroupId('') === -1 ? this.requestDownload(group, '') : this.requestDownload('', group);
            }
            if (this.fileIdLimit.length === 1) {
                return this.requestDownload(0, group);
            }
            if (!this.isGroupValid(group)) {
                return false;
            }
            if (this.fileIdLimit[group] === 1) {
                return this.requestDownload(group, 0);
            }
            throw new Error();
        }

        if (typeof group === 'string' || typeof file === 'string') {
            if (typeof group !== 'string' || typeof file !== 'string') {
                return false;
            }

            const groupId = this.getGroupId(group);
            if (groupId < 0) {
                return false;
            }

            const fileId = this.getFileId(file, groupId);
            if (fileId < 0) {
                return false;
            }

            return this.requestDownload(groupId, fileId);
        }

        if (!this.isFileValid(file, group)) {
            return false;
        }

        if (this.unpacked[group] != null && this.unpacked[group]![file] != null) {
            return true;
        }

        if (this.packed[group] == null) {
            this.requestGroupDownload2(group);
            return this.packed[group] != null;
        }

        return true;
    }

    requestFullDownload(): boolean {
        let ready = true;
        for (let i = 0; i < this.groupIds.length; i++) {
            const group = this.groupIds[i];
            if (this.packed[group] == null) {
                this.requestGroupDownload2(group);
                if (this.packed[group] == null) {
                    ready = false;
                }
            }
        }
        return ready;
    }

    requestGroupDownload(group: number | string): boolean {
        if (typeof group === 'string') {
            return this.requestGroupDownload(this.getGroupId(group));
        }
        if (!this.isGroupValid(group)) {
            return false;
        }
        if (this.packed[group] == null) {
            this.requestGroupDownload2(group);
        }
        return this.packed[group] != null;
    }

    requestGroupDownload2(group: number): void {}

    updateCacheHint(group: number): void;
    updateCacheHint(group: string): void;
    updateCacheHint(group: number | string): void {
        if (typeof group === 'string') {
            this.updateCacheHint(this.groupNameHashTable!.find(JagString.fromLatin1String(group.toLowerCase()).computeCp1252HashFromUtf8()));
        }
    }

    getGroupLoadProgress(group: number): number;
    getGroupLoadProgress(group: string): number;
    getGroupLoadProgress(group: number | string): number {
        if (typeof group === 'string') {
            return this.getGroupLoadProgress(this.getGroupId(group));
        }
        if (!this.isGroupValid(group)) {
            return 0;
        }

        return this.packed[group] == null ? 0 : 100;
    }

    getTotalLoadProgress(): number {
        let var1 = 0;
        let var2 = 0;
        for (let var3 = 0; var3 < this.packed.length; var3++) {
            if (this.groupSizes[var3] > 0) {
                var2 += this.getGroupLoadProgress(var3);
                var1 += 100;
            }
        }
        if (var1 === 0) {
            return 100;
        } else {
            return ((var2 * 100) / var1) | 0;
        }
    }

    discardFiles(arg0: number): void {
        if (this.isGroupValid(arg0)) {
            this.unpacked[arg0] = null;
        }
    }

    discardAllFiles(): void {
        for (let i = 0; i < this.unpacked.length; i++) {
            this.unpacked[i] = null;
        }
    }

    fetchFile(arg0: ArrayLike<number> | null, arg1: number, arg2: number): Uint8Array | null {
        if (!this.isFileValid(arg2, arg1)) {
            return null;
        }
        if (this.unpacked[arg1] == null || this.unpacked[arg1]![arg2] == null) {
            const var4 = this.unpackGroupData(arg1, arg0);
            if (!var4) {
                this.requestGroupDownload2(arg1);
                const var5 = this.unpackGroupData(arg1, arg0);
                if (!var5) {
                    return null;
                }
            }
        }
        const var6 = ByteArrayWrapper.unwrap(false, this.unpacked[arg1]![arg2]);
        if (this.discardUnpacked) {
            this.unpacked[arg1]![arg2] = null;
            if (this.fileIdLimit[arg1] === 1) {
                this.unpacked[arg1] = null;
            }
        }
        return var6;
    }

    unpackGroupData(arg0: number, arg1: ArrayLike<number> | null): boolean {
        if (!this.isGroupValid(arg0)) {
            return false;
        } else if (this.packed[arg0] == null) {
            return false;
        } else {
            const var3 = this.groupSizes[arg0];
            const var4 = this.fileIds[arg0];
            if (this.unpacked[arg0] == null) {
                this.unpacked[arg0] = new Array(this.fileIdLimit[arg0]).fill(null);
            }
            let var5 = true;
            const var6 = this.unpacked[arg0]!;
            for (let var7 = 0; var7 < var3; var7++) {
                let var8;
                if (var4 == null) {
                    var8 = var7;
                } else {
                    var8 = var4[var7];
                }
                if (var6[var8] == null) {
                    var5 = false;
                    break;
                }
            }
            if (var5) {
                return true;
            }
            let var9: Uint8Array;
            if (arg1 == null || (arg1[0] === 0 && arg1[1] === 0 && arg1[2] === 0 && arg1[3] === 0)) {
                var9 = ByteArrayWrapper.unwrap(false, this.packed[arg0])!;
            } else {
                var9 = ByteArrayWrapper.unwrap(true, this.packed[arg0])!;
                const var10 = new Packet(var9);
                var10.tinydec(var10.data.length, arg1);
            }
            let var11: Uint8Array;
            try {
                var11 = Js5.getUncompressedPacket(var9);
            } catch (var30) {
                throw JagException.report(
                    var30,
                    'T3 - ' + (arg1 != null) + ',' + arg0 + ',' + var9.length + ',' + Packet.method541(var9, var9.length) + ',' + Packet.method541(var9, var9.length - 2) + ',' + this.groupChecksums[arg0] + ',' + this.crc
                );
            }
            if (this.discardPacked) {
                this.packed[arg0] = null;
            }
            if (var3 > 1) {
                const var13 = var11.length;
                const var31 = var13 - 1;
                const var14 = var11[var31] & 0xff;
                const var15 = var31 - Math.imul(Math.imul(var3, var14), 4);
                const var16 = new Packet(var11);
                const var17 = new Int32Array(var3);
                var16.pos = var15;
                for (let var18 = 0; var18 < var14; var18++) {
                    let var19 = 0;
                    for (let var20 = 0; var20 < var3; var20++) {
                        var19 = (var19 + var16.g4()) | 0;
                        var17[var20] = (var17[var20] + var19) | 0;
                    }
                }
                const var21 = new Array<Uint8Array>(var3);
                for (let var22 = 0; var22 < var3; var22++) {
                    var21[var22] = new Uint8Array(var17[var22]);
                    var17[var22] = 0;
                }
                var16.pos = var15;
                let var23 = 0;
                for (let var24 = 0; var24 < var14; var24++) {
                    let var25 = 0;
                    for (let var26 = 0; var26 < var3; var26++) {
                        var25 = (var25 + var16.g4()) | 0;
                        ArrayUtil.copy(var11, var23, var21[var26], var17[var26], var25);
                        var23 = (var23 + var25) | 0;
                        var17[var26] = (var17[var26] + var25) | 0;
                    }
                }
                for (let var27 = 0; var27 < var3; var27++) {
                    let var28;
                    if (var4 == null) {
                        var28 = var27;
                    } else {
                        var28 = var4[var27];
                    }
                    if (this.discardUnpacked) {
                        var6[var28] = var21[var27];
                    } else {
                        var6[var28] = ByteArrayWrapper.wrap(var21[var27]);
                    }
                }
            } else {
                let var29;
                if (var4 == null) {
                    var29 = 0;
                } else {
                    var29 = var4[0];
                }
                if (this.discardUnpacked) {
                    var6[var29] = var11;
                } else {
                    var6[var29] = ByteArrayWrapper.wrap(var11);
                }
            }
            return true;
        }
    }

    discardNames(arg0: boolean): void {
        this.fileNameHashTables = null;
        this.fileNameHashes = null;
        if (arg0) {
            this.groupNameHash = null;
            this.groupNameHashTable = null;
        }
    }

    isGroupValid(arg0: number): boolean {
        if (arg0 >= 0 && arg0 < this.fileIdLimit.length && this.fileIdLimit[arg0] !== 0) {
            return true;
        } else if (Js5.strictBounds) {
            throw new Error(String(arg0));
        } else {
            return false;
        }
    }

    isFileValid(arg0: number, arg1: number): boolean {
        if (arg1 >= 0 && arg0 >= 0 && this.fileIdLimit.length > arg1 && arg0 < this.fileIdLimit[arg1]) {
            return true;
        } else if (Js5.strictBounds) {
            throw new Error(arg1 + ',' + arg0);
        } else {
            return false;
        }
    }
}
