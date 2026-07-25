import QuickChatPhraseType from '#/config/QuickChatPhraseType.js';
import type Packet from '#/io/Packet.js';

export default class QuickChatPhrase {
    id: number = 0;
    type: QuickChatPhraseType | null = null;
    dynamics: Int32Array | null = null;

    static create(arg0: Packet): QuickChatPhrase {
        const var1 = new QuickChatPhrase();
        var1.id = arg0.g2();
        var1.type = QuickChatPhraseType.list(var1.id);
        return var1;
    }
}
