import HashTable from '#/datastruct/HashTable.js';
import Js5 from '#/js5/Js5.js';
import JagFX from '#/sound/JagFX.js';
import JagVorbis from '#/sound/JagVorbis.js';
import Wave from '#/sound/Wave.js';

// jag::oldscape::sound::WaveCache
export default class WaveCache {
    synthArchive: Js5;
    vorbisArchive: Js5;
    vorbisCache: HashTable<JagVorbis> = new HashTable(256);
    waveCache: HashTable<Wave> = new HashTable(256);

    constructor(arg0: Js5, arg1: Js5) {
        this.vorbisArchive = arg1;
        this.synthArchive = arg0;
    }

    getJagFx(arg0: number, arg1: Int32Array | number[] | null, arg2?: number): Wave | null {
        if (arg2 === undefined) {
            if (this.synthArchive.getGroupCount() === 1) {
                return this.getJagFx(arg0, arg1, 0);
            } else if (this.synthArchive.getFileIdLimit(arg0) === 1) {
                return this.getJagFx(0, arg1, arg0);
            } else {
                throw new Error();
            }
        }

        const var4 = (((arg2 << 4) & 0xfff4) | (arg2 >>> 12)) ^ arg0;
        const var5 = var4 | (arg2 << 16) | 0;
        const var6 = BigInt(var5);
        const var8 = this.waveCache.find(var6);
        if (var8 !== null) {
            return var8;
        } else if (arg1 === null || arg1[0] > 0) {
            const var9 = JagFX.load(this.synthArchive, arg2, arg0);
            if (var9 === null) {
                return null;
            }
            const var10 = var9.toWave();
            this.waveCache.put(var6, var10);
            if (arg1 !== null) {
                arg1[0] -= var10.samples.length;
            }
            return var10;
        } else {
            return null;
        }
    }

    // jag::oldscape::sound::WaveCache::GetJagVorbis
    getJagVorbis(arg0: Int32Array | number[] | null, arg1: number, arg2?: number): Wave | null {
        if (arg2 === undefined) {
            if (this.vorbisArchive.getGroupCount() === 1) {
                return this.getJagVorbis(arg0, 0, arg1);
            } else if (this.vorbisArchive.getFileIdLimit(arg1) === 1) {
                return this.getJagVorbis(arg0, arg1, 0);
            } else {
                throw new Error();
            }
        }

        const var4 = (arg2 ^ (((arg1 & 0xd0000fff) << 4) | (arg1 >>> 12))) | 0;
        const var5 = var4 | (arg1 << 16) | 0;
        const var6 = BigInt(var5) ^ 0x100000000n;
        const var8 = this.waveCache.find(var6);
        if (var8 !== null) {
            return var8;
        } else if (arg0 === null || arg0[0] > 0) {
            let var9 = this.vorbisCache.find(var6);
            if (var9 === null) {
                var9 = JagVorbis.load(this.vorbisArchive, arg1, arg2);
                if (var9 === null) {
                    return null;
                }
                this.vorbisCache.put(var6, var9);
            }
            const var10 = var9.toWave(arg0);
            if (var10 === null) {
                return null;
            } else {
                var9.unlink();
                this.waveCache.put(var6, var10);
                return var10;
            }
        } else {
            return null;
        }
    }
}
