import { Client } from '#/client/Client.js';
import LocType from '#/config/LocType.js';

import Linkable from '#/datastruct/Linkable.js';
import LinkList from '#/datastruct/LinkList.js';

import JagFX from '#/sound/JagFX.js';
import WaveStream from '#/sound/WaveStream.js';

// jag::oldscape::bgsound
export default class BgSound extends Linkable {
    // jag::oldscape::bgsound::m_soundlist
    static soundlist: LinkList<BgSound> = new LinkList();

    level: number = 0;
    minX: number = 0;
    minZ: number = 0;
    maxX: number = 0;
    maxZ: number = 0;
    range: number = 0;
    sound: number = 0;
    mindelay: number = 0;
    continuousStream: WaveStream | null = null;
    maxdelay: number = 0;
    random: Int32Array | null = null;
    randomSoundTimer: number = 0;
    randomStream: WaveStream | null = null;
    multiloc: LocType | null = null;

    // jag::oldscape::bgsound::RecalculateMultilocs
    static recalculateMultilocs(): void {
        for (let bg = BgSound.soundlist.head(); bg !== null; bg = BgSound.soundlist.next()) {
            if (bg.multiloc !== null) {
                bg.recalcSound();
            }
        }
    }

    // jag::oldscape::bgsound::Reset
    static reset(): void {
        for (let bg = BgSound.soundlist.head(); bg !== null; bg = BgSound.soundlist.next()) {
            if (bg.continuousStream !== null) {
                Client.mixer!.stopStream(bg.continuousStream);
                bg.continuousStream = null;
            }
            if (bg.randomStream !== null) {
                Client.mixer!.stopStream(bg.randomStream);
                bg.randomStream = null;
            }
        }
        BgSound.soundlist.clear();
    }

    // jag::oldscape::bgsound::RecalcSound
    recalcSound(): void {
        const sound = this.sound;
        const loc = this.multiloc!.getMultiLoc();
        if (loc === null) {
            this.random = null;
            this.mindelay = 0;
            this.sound = -1;
            this.range = 0;
            this.maxdelay = 0;
        } else {
            this.range = loc.bgsound_range * 128;
            this.random = loc.bgsound_random;
            this.mindelay = loc.bgsound_mindelay;
            this.sound = loc.bgsound_sound;
            this.maxdelay = loc.bgsound_maxdelay;
        }
        if (sound !== this.sound && this.continuousStream !== null) {
            Client.mixer!.stopStream(this.continuousStream);
            this.continuousStream = null;
        }
    }

    // jag::oldscape::bgsound::AddSound
    static addSound(arg0: number, arg1: number, arg2: number, arg3: number, arg4: LocType): void {
        const bg = new BgSound();
        bg.range = arg4.bgsound_range * 128;
        bg.random = arg4.bgsound_random;
        bg.level = arg1;
        bg.sound = arg4.bgsound_sound;
        let var6 = arg4.width;
        bg.minX = arg3 * 128;
        bg.minZ = arg0 * 128;
        bg.maxdelay = arg4.bgsound_maxdelay;
        bg.mindelay = arg4.bgsound_mindelay;
        let var7 = arg4.length;
        if (arg2 === 1 || arg2 === 3) {
            var7 = arg4.width;
            var6 = arg4.length;
        }
        bg.maxZ = (var6 + arg0) * 128;
        bg.maxX = (arg3 + var7) * 128;
        if (arg4.multiloc !== null) {
            bg.multiloc = arg4;
            bg.recalcSound();
        }
        BgSound.soundlist.push(bg);
        if (bg.random !== null) {
            bg.randomSoundTimer = bg.mindelay + (((bg.maxdelay - bg.mindelay) * Math.random()) | 0);
        }
    }

    // jag::oldscape::bgsound::DoMix
    static doMix(arg0: number, arg1: number, arg2: number, arg3: number): void {
        for (let var4 = BgSound.soundlist.head(); var4 !== null; var4 = BgSound.soundlist.next()) {
            if (var4.sound !== -1 || var4.random !== null) {
                let var5 = 0;
                if (var4.maxZ < arg2) {
                    var5 = arg2 - var4.maxZ;
                } else if (arg2 < var4.minZ) {
                    var5 = var4.minZ - arg2;
                }
                if (arg0 > var4.maxX) {
                    var5 += arg0 - var4.maxX;
                } else if (arg0 < var4.minX) {
                    var5 += var4.minX - arg0;
                }

                if (var4.range < var5 - 64 || Client.ambientVolume === 0 || var4.level !== arg3) {
                    if (var4.continuousStream !== null) {
                        Client.mixer!.stopStream(var4.continuousStream);
                        var4.continuousStream = null;
                    }
                    if (var4.randomStream !== null) {
                        Client.mixer!.stopStream(var4.randomStream);
                        var4.randomStream = null;
                    }
                } else {
                    var5 -= 64;
                    if (var5 < 0) {
                        var5 = 0;
                    }
                    if (var4.range === 0) {
                        throw new Error();
                    }
                    const var6 = (Math.imul(Client.ambientVolume, var4.range - var5) / var4.range) | 0;
                    if (var4.continuousStream !== null) {
                        var4.continuousStream.applyVolume(var6);
                    } else if (var4.sound >= 0) {
                        const var7 = JagFX.load(Client.jagFX!, var4.sound, 0);
                        if (var7 !== null) {
                            const var8 = var7.toWave().decimate(Client.decimator!);
                            const var9 = WaveStream.newRatePercent(var8, var6)!;
                            var9.setLoopCount(-1);
                            Client.mixer!.playStream(var9);
                            var4.continuousStream = var9;
                        }
                    }

                    if (var4.randomStream !== null) {
                        var4.randomStream.applyVolume(var6);
                        if (!var4.randomStream.isLinked()) {
                            var4.randomStream = null;
                        }
                    } else if (var4.random !== null && (var4.randomSoundTimer -= arg1) <= 0) {
                        const var10 = (var4.random.length * Math.random()) | 0;
                        const var11 = JagFX.load(Client.jagFX!, var4.random[var10], 0);
                        if (var11 !== null) {
                            const var12 = var11.toWave().decimate(Client.decimator!);
                            const var13 = WaveStream.newRatePercent(var12, var6)!;
                            var13.setLoopCount(0);
                            Client.mixer!.playStream(var13);
                            var4.randomSoundTimer = (((var4.maxdelay - var4.mindelay) * Math.random()) | 0) + var4.mindelay;
                            var4.randomStream = var13;
                        }
                    }
                }
            }
        }
    }
}
