import EnumType from '#/config/EnumType.js';
import ObjType from '#/config/ObjType.js';
import type QuickChatDynamicProvider from '#/config/QuickChatDynamicProvider.js';

export default class ClientDynamicProvider implements QuickChatDynamicProvider {
    formatDynamicValue(arg0: Int32Array | null, arg1: number, arg2: bigint): string | null {
        if (arg1 === 0) {
            const var5 = EnumType.list(arg0![0]);
            return var5.getValueString(Number(BigInt.asIntN(32, BigInt(arg2))));
        } else if (arg1 === 1 || arg1 === 10) {
            const var6 = ObjType.list(Number(BigInt.asIntN(32, BigInt(arg2))));
            return var6.name;
        } else if (arg1 === 6 || arg1 === 7) {
            return EnumType.list(arg0![0]).getValueString(Number(BigInt.asIntN(32, BigInt(arg2))));
        } else {
            return null;
        }
    }
}
