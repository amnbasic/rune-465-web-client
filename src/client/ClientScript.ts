import { Client } from '#/client/Client.js';
import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';

// jag::oldscape::ClientScript
export default class ClientScript extends Linkable2 {
    static readonly cache: LruCache<ClientScript> = new LruCache(128);
    instructions: Int32Array | null = null;
    intOperands: Int32Array | null = null;
    stringOperands: (string | null)[] | null = null;
    intLocalCount: number = 0;
    stringLocalCount: number = 0;
    intArgCount: number = 0;
    stringArgCount: number = 0;
    name: string | null = null;
    switchTables: HashTable<IntNode>[] | null = null;

    static get(arg0: number): ClientScript | null {
        const var1 = ClientScript.cache.find(BigInt(arg0));
        if (var1 !== null) {
            return var1;
        }

        const var2 = Client.scripts!.getFile(0, arg0);
        if (var2 === null) {
            return null;
        }

        const var3 = new ClientScript();
        const var4 = new Packet(var2);
        // 465 CS2 format: the header is the FIXED last 12 bytes of the buffer — there is NO
        // trailer-size field and NO switch tables (rev-500 added both). The rev-500 port read a
        // bogus trailer size from the last 2 bytes (really the low half of stringArgCount), so the
        // header offset slid into the opcode stream and intLocalCount came out garbage-huge ->
        // new Int32Array(intLocalCount) at gosub (op 40) threw "Array buffer allocation failed".
        const var6 = var4.data.length - 12;
        var4.pos = var6;
        const var7 = var4.g4();
        var3.intLocalCount = var4.g2();
        var3.stringLocalCount = var4.g2();
        var3.intArgCount = var4.g2();
        var3.stringArgCount = var4.g2();

        let var14 = 0;
        var4.pos = 0;
        var3.name = var4.fastgstr();
        var3.stringOperands = new Array(var7);
        var3.instructions = new Int32Array(var7);
        var3.intOperands = new Int32Array(var7);
        while (var6 > var4.pos) {
            const var15 = var4.g2();
            if (var15 === 3) {
                var3.stringOperands[var14] = var4.gjstr();
            } else if (var15 >= 100 || var15 === 21 || var15 === 38 || var15 === 39) {
                var3.intOperands[var14] = var4.g1();
            } else {
                var3.intOperands[var14] = var4.g4();
            }
            var3.instructions[var14++] = var15;
        }
        ClientScript.cache.put(BigInt(arg0), var3);
        return var3;
    }
}
