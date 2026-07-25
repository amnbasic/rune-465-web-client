// jag::oldscape::midi2::EnvelopeSet
export default class EnvelopeSet {
    attackVolume: Int8Array | null = null;
    releaseVolume: Int8Array | null = null;
    decayVolume: number = 0;
    attackSpeed: number = 0;
    releaseSpeed: number = 0;
    decaySpeed: number = 0;
    vibratoAmplitude: number = 0;
    vibratoFrequency: number = 0;
    vibratoRampTime: number = 0;
}
