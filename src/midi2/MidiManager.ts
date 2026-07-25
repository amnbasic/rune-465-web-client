import Js5 from '#/js5/Js5.js';
import MidiFile from '#/midi2/MidiFile.js';
import MidiPlayer from '#/midi2/MidiPlayer.js';
import WaveCache from '#/sound/WaveCache.js';

// jag::oldscape::midi2::MidiManager
export default class MidiManager {
    // jag::oldscape::midi2::MidiManager::m_pPatches
    static patches: Js5 | null = null;

    // jag::oldscape::midi2::MidiManager::m_pVorbis
    static vorbis: Js5 | null = null;

    // jag::oldscape::midi2::MidiManager::m_pJagFX
    static jagFX: Js5 | null = null;

    // jag::oldscape::midi2::MidiManager::m_midiPlayers
    static midiPlayer: MidiPlayer | null = null;

    static state: number = 0;
    static midis: Js5 | null = null;
    static pendingGroupId: number = 0;
    static pendingFileId: number = 0;
    static pendingVolume: number = 0;
    static fadeOutRate: number = 0;
    static pendingLoop: boolean = false;
    static loadingMidiFile: MidiFile | null = null;
    static loadingWaveCache: WaveCache | null = null;

    // jag::oldscape::midi2::MidiManager::Init
    static init(arg0: Js5, arg1: MidiPlayer, arg2: Js5, arg3: Js5): boolean {
        MidiManager.midiPlayer = arg1;
        MidiManager.vorbis = arg0;
        MidiManager.jagFX = arg2;
        MidiManager.patches = arg3;
        return true;
    }

    // jag::oldscape::midi2::MidiManager::Play
    static play(arg0: Js5, arg1: number, arg2: number): void {
        MidiManager.pendingVolume = arg2;
        MidiManager.midis = arg0;
        MidiManager.pendingGroupId = arg1;
        MidiManager.fadeOutRate = 10000;
        MidiManager.state = 1;
        MidiManager.pendingFileId = 0;
        MidiManager.pendingLoop = false;
    }

    // jag::oldscape::midi2::MidiManager::SetVolume
    static setVolume(arg0: number): void {
        if (MidiManager.state === 0) {
            MidiManager.midiPlayer!.setGlobalVolume(arg0);
        } else {
            MidiManager.pendingVolume = arg0;
        }
    }

    // jag::oldscape::midi2::MidiManager::Stop
    static stop(): void {
        MidiManager.midiPlayer!.stop();
        MidiManager.midis = null;
        MidiManager.state = 1;
    }

    // jag::oldscape::midi2::MidiManager::SwapSongs
    static swapSongs(arg0: number, arg1: number, arg2: Js5): void {
        MidiManager.fadeOutRate = 2;
        MidiManager.pendingFileId = 0;
        MidiManager.pendingVolume = arg0;
        MidiManager.pendingLoop = false;
        MidiManager.midis = arg2;
        MidiManager.state = 1;
        MidiManager.pendingGroupId = arg1;
    }

    // jag::oldscape::midi2::MidiManager::IsInitialised
    static isInitialised(): boolean {
        return MidiManager.state === 0 ? MidiManager.midiPlayer!.loaded() : true;
    }

    static updateFadeOut(): void {
        try {
            if (MidiManager.state === 1) {
                const var0 = MidiManager.midiPlayer!.getGlobalVolume();
                if (var0 > 0 && MidiManager.midiPlayer!.loaded()) {
                    let var1 = var0 - MidiManager.fadeOutRate;
                    if (var1 < 0) {
                        var1 = 0;
                    }
                    MidiManager.midiPlayer!.setGlobalVolume(var1);
                } else {
                    MidiManager.midiPlayer!.stop();
                    MidiManager.midiPlayer!.clearPatches();
                    MidiManager.loadingWaveCache = null;
                    MidiManager.loadingMidiFile = null;
                    if (MidiManager.midis === null) {
                        MidiManager.state = 0;
                    } else {
                        MidiManager.state = 2;
                    }
                }
            }
        } catch (var3) {
            console.error(var3);
            MidiManager.midiPlayer!.stop();
            MidiManager.loadingWaveCache = null;
            MidiManager.midis = null;
            MidiManager.loadingMidiFile = null;
            MidiManager.state = 0;
        }
    }

    static updateLoading(): boolean {
        try {
            if (MidiManager.state === 2) {
                if (MidiManager.loadingMidiFile === null) {
                    MidiManager.loadingMidiFile = MidiFile.load(MidiManager.midis!, MidiManager.pendingGroupId, MidiManager.pendingFileId);
                    if (MidiManager.loadingMidiFile === null) {
                        return false;
                    }
                }
                if (MidiManager.loadingWaveCache === null) {
                    MidiManager.loadingWaveCache = new WaveCache(MidiManager.jagFX!, MidiManager.vorbis!);
                }
                if (MidiManager.midiPlayer!.loadAndQueuePatches(MidiManager.loadingWaveCache, MidiManager.loadingMidiFile, MidiManager.patches!)) {
                    MidiManager.midiPlayer!.freeWaveIds();
                    MidiManager.midiPlayer!.setGlobalVolume(MidiManager.pendingVolume);
                    MidiManager.midiPlayer!.start(MidiManager.loadingMidiFile, MidiManager.pendingLoop);
                    MidiManager.midis = null;
                    MidiManager.loadingMidiFile = null;
                    MidiManager.state = 0;
                    MidiManager.loadingWaveCache = null;
                    return true;
                }
            }
        } catch (var1) {
            console.error(var1);
            MidiManager.midiPlayer!.stop();
            MidiManager.loadingWaveCache = null;
            MidiManager.midis = null;
            MidiManager.state = 0;
            MidiManager.loadingMidiFile = null;
        }
        return false;
    }

    // todo: rename?
    // jag::oldscape::midi2::MidiManager::Stop
    static fadeStop(): void {
        MidiManager.pendingFileId = -1;
        MidiManager.pendingVolume = 0;
        MidiManager.fadeOutRate = 2;
        MidiManager.midis = null;
        MidiManager.pendingLoop = false;
        MidiManager.state = 1;
        MidiManager.pendingGroupId = -1;
    }
}
