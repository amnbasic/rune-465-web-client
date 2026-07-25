import Linkable from '#/datastruct/Linkable.js';
import EnvelopeSet from '#/midi2/EnvelopeSet.js';
import Patch from '#/midi2/Patch.js';
import Wave from '#/sound/Wave.js';
import WaveStream from '#/sound/WaveStream.js';

// jag::oldscape::midi2::MidiNote
export default class MidiNote extends Linkable {
    channel = 0;
    patch: Patch | null = null;
    sound: Wave | null = null;
    envelope: EnvelopeSet | null = null;
    secondaryNote = 0;
    noteKey = 0;
    volume = 0;
    pan = 0;
    pitch = 0;
    portamentoDelta = 0;
    portamentoAmount = 0;
    decayProgress = 0;
    attackProgress = 0;
    attackEnvelopeProgress = 0;
    releaseProgress = 0;
    releaseEnvelopeProgress = 0;
    vibratoRampProgress = 0;
    vibratoProgress = 0;
    stream: WaveStream | null = null;
    volumeChangeDuration = 0;
    field1766 = 0;

    dropData(): void {
        this.stream = null;
        this.patch = null;
        this.envelope = null;
        this.sound = null;
    }
}
