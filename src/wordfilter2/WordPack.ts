import Packet from '#/io/Packet.js';
import Huffman from '#/wordfilter2/Huffman.js';

// jag::game::WordPack
export default class WordPack {
    static huffman: Huffman | null = null;

    static setHuffman(h: Huffman): void {
        WordPack.huffman = h;
    }

    // todo: replace with native string
    // jag::game::WordPack::PackUTF8AsCP1252
    static pack(dst: Packet, str: string | { length: number; chars: Uint8Array }): number {
        const start = dst.pos;
        const length = typeof str === 'string' ? str.length : str.length;
        const chars = typeof str === 'string' ? new Uint8Array(length) : str.chars;
        if (typeof str === 'string') {
            for (let i = 0; i < length; i++) {
                chars[i] = str.charCodeAt(i) & 0xff;
            }
        }
        dst.psmart(length);
        dst.pos += WordPack.huffman!.encode(chars, dst.pos, length, 0, dst.data);
        return dst.pos - start;
    }

    // jag::game::WordPack::UnpackCP1252AsUTF8
    static unpack(buf: Packet): string {
        try {
            let len = buf.gsmart();
            if (len > 32767) {
                len = 32767;
            }
            const chars = new Uint8Array(len);
            buf.pos += WordPack.huffman!.decode(0, chars, buf.data, len, buf.pos);
            return String.fromCharCode(...chars);
        } catch {
            return 'Cabbage';
        }
    }

    // jag::game::WordPack::UnpackCP1252AsUTF8
    static unpack2(arg0: Packet): string {
        return WordPack.unpack(arg0);
    }
}
