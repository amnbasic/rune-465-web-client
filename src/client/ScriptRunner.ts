import { Client } from '#/client/Client.js';
import ClientGosubFrame from '#/client/ClientGosubFrame.js';
import ClientInvCache from '#/client/ClientInvCache.js';
import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';
import QuickChatPhrase from '#/client/QuickChatPhrase.js';
import JagException from '#/callstack/JagException.js';
import ClientScript from '#/client/ClientScript.js';
import HookReq from '#/client/HookReq.js';
import SubInterface from '#/client/SubInterface.js';
import IntNode from '#/datastruct/IntNode.js';
import Packet from '#/io/Packet.js';
import JagString from '#/jstring/JagString.js';
import IfType from '#/config/IfType.js';
import EnumType from '#/config/EnumType.js';
import FloType from '#/config/FloType.js';
import InvType from '#/config/InvType.js';
import LocType from '#/config/LocType.js';
import NpcType from '#/config/NpcType.js';
import ObjType from '#/config/ObjType.js';
import ParamType from '#/config/ParamType.js';
import QuickChatCatType from '#/config/QuickChatCatType.js';
import QuickChatPhraseType from '#/config/QuickChatPhraseType.js';
import ServerActive from '#/config/ServerActive.js';
import StructType from '#/config/StructType.js';
import VarCache from '#/var/VarCache.js';
import WordPack from '#/wordfilter2/WordPack.js';
import PixfontGeneric from '#/graphics/PixfontGeneric.js';
import SoftwarePixFont from '#/graphics/SoftwarePixFont.js';
import Text from '#/constants/Text.js';
import TitleScreen from '#/client/TitleScreen.js';
import { ClientProt } from '#/client/ClientProt.js';

// jag::oldscape::ScriptRunner
export default class ScriptRunner {
    static intLocals: Int32Array = new Int32Array(0);
    static stringLocals: (string | null)[] = [];
    static arrayLengths: Int32Array = new Int32Array(5);
    static arrays: Int32Array[] = Array.from({ length: 5 }, () => new Int32Array(5000));
    static intStack: Int32Array = new Int32Array(1000);
    static stringStack: (string | null)[] = new Array(1000).fill(null);
    static fp: number = 0;
    static frames: (ClientGosubFrame | null)[] = new Array(50).fill(null);
    static activeComponent: IfType | null = null;
    static activeComponent2: IfType | null = null;
    static readonly calendar: Date = new Date(0);
    static readonly months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // todo: sort
    static varcStr: (string | null)[] = new Array(1000).fill(null);
    static field226: QuickChatPhrase | null = null;

    static executeScript(req: HookReq, opcount: number = 200000): void {
        const onop = req.onop!;
        const id = onop[0] as number;

        let script = ClientScript.get(id);
        if (script === null) {
            return;
        }

        let isp = 0;
        let ssp = 0;
        this.fp = 0;
        let pc = -1;
        let intOperands = script.intOperands!;
        let lastOp: number = -1;
        let instructions = script.instructions!;

        try {
            this.intLocals = new Int32Array(script.intLocalCount);
            this.stringLocals = new Array(script.stringLocalCount).fill(null);
            let stringCount = 0;
            let intCount = 0;

            for (let i = 1; i < onop.length; i++) {
                if (typeof onop[i] === 'number') {
                    let op = onop[i] as number;
                    if (op === -2147483647) {
                        op = req.mouseX;
                    }
                    if (op === -2147483646) {
                        op = req.mouseY;
                    }
                    if (op === -2147483645) {
                        op = req.component === null ? -1 : req.component.parentId;
                    }
                    if (op === -2147483644) {
                        op = req.opindex;
                    }
                    if (op === -2147483643) {
                        op = req.component === null ? -1 : req.component.subId;
                    }
                    if (op === -2147483642) {
                        op = req.drop === null ? -1 : req.drop.parentId;
                    }
                    if (op === -2147483641) {
                        op = req.drop === null ? -1 : req.drop.subId;
                    }
                    if (op === -2147483640) {
                        op = req.keyCode;
                    }
                    if (op === -2147483639) {
                        op = req.keyChar;
                    }
                    this.intLocals[intCount++] = op;
                } else if (typeof onop[i] === 'string') {
                    let op: string | null = onop[i] as string;
                    if (op === 'event_opbase') {
                        op = req.opbase;
                    }
                    this.stringLocals[stringCount++] = op;
                }
            }

            let opcount = 0;
            while (true) {
                opcount++;
                if (opcount < opcount) {
                    throw new Error('slow');
                }

                pc++;
                let opcode = instructions[pc];
                lastOp = opcode;

                if (opcode < 100) {
                    if (opcode === 0) {
                        // push_constant_int
                        this.intStack[isp++] = intOperands[pc];
                        continue;
                    }
                    if (opcode === 1) {
                        // push_varp
                        const var17 = intOperands[pc];
                        this.intStack[isp++] = VarCache.var[var17];
                        continue;
                    }
                    if (opcode === 2) {
                        // pop_varp
                        const var18 = intOperands[pc];
                        isp--;
                        VarCache.var[var18] = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 3) {
                        // push_constant_string
                        this.stringStack[ssp++] = script.stringOperands![pc];
                        continue;
                    }
                    if (opcode === 6) {
                        // branch
                        pc += intOperands[pc];
                        continue;
                    }
                    if (opcode === 7) {
                        // branch_not
                        isp -= 2;
                        if (this.intStack[isp] !== this.intStack[isp + 1]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 8) {
                        // branch_equals
                        isp -= 2;
                        if (this.intStack[isp + 1] === this.intStack[isp]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 9) {
                        // branch_less_than
                        isp -= 2;
                        if (this.intStack[isp + 1] > this.intStack[isp]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 10) {
                        // branch_greater_than
                        isp -= 2;
                        if (this.intStack[isp] > this.intStack[isp + 1]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 21) {
                        // return
                        if (this.fp === 0) {
                            return;
                        }
                        const frame = this.frames[--this.fp]!;
                        this.stringLocals = frame.stringLocals!;
                        this.intLocals = frame.intLocals!;
                        script = frame.script!;
                        pc = frame.pc;
                        intOperands = script.intOperands!;
                        instructions = script.instructions!;
                        continue;
                    }
                    if (opcode === 25) {
                        // push_varbit
                        const var20 = intOperands[pc];
                        this.intStack[isp++] = VarCache.getVarbit(var20);
                        continue;
                    }
                    if (opcode === 27) {
                        // pop_varbit
                        const var21 = intOperands[pc];
                        isp--;
                        VarCache.setVarbit(var21, this.intStack[isp]);
                        continue;
                    }
                    if (opcode === 31) {
                        // branch_less_than_or_equals
                        isp -= 2;
                        if (this.intStack[isp + 1] >= this.intStack[isp]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 32) {
                        // branch_greater_than_or_equals
                        isp -= 2;
                        if (this.intStack[isp] >= this.intStack[isp + 1]) {
                            pc += intOperands[pc];
                        }
                        continue;
                    }
                    if (opcode === 33) {
                        // push_int_local
                        this.intStack[isp++] = this.intLocals[intOperands[pc]];
                        continue;
                    }
                    if (opcode === 34) {
                        // pop_int_local
                        const var10001 = intOperands[pc];
                        isp--;
                        this.intLocals[var10001] = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 35) {
                        // push_string_local
                        this.stringStack[ssp++] = this.stringLocals[intOperands[pc]];
                        continue;
                    }
                    if (opcode === 36) {
                        // pop_string_local
                        const var10001 = intOperands[pc];
                        ssp--;
                        this.stringLocals[var10001] = this.stringStack[ssp];
                        continue;
                    }
                    if (opcode === 37) {
                        // join_string
                        const var22 = intOperands[pc];
                        ssp -= var22;
                        const var23Strings = new Array<JagString>(var22);
                        for (let var23Index = 0; var23Index < var22; var23Index++) {
                            const var23Part = this.stringStack[ssp + var23Index];
                            var23Strings[var23Index] = var23Part == null ? JagString.STRING_NULL : JagString.wrap(var23Part);
                        }
                        // todo: StringTools.join
                        const var23 = JagString.joinRange(var22, var23Strings, 0).toString();
                        this.stringStack[ssp++] = var23;
                        continue;
                    }
                    if (opcode === 38) {
                        // pop_int_discard
                        isp--;
                        continue;
                    }
                    if (opcode === 39) {
                        // pop_string_discard
                        ssp--;
                        continue;
                    }
                    if (opcode === 40) {
                        // gosub_with_params
                        const procId = intOperands[pc];
                        const proc = ClientScript.get(procId)!;
                        const procStringLocals = new Array(proc.stringLocalCount).fill(null);
                        const procIntLocals = new Int32Array(proc.intLocalCount);
                        for (let i = 0; i < proc.intArgCount; i++) {
                            procIntLocals[i] = this.intStack[i + isp - proc.intArgCount];
                        }
                        for (let i = 0; i < proc.stringArgCount; i++) {
                            procStringLocals[i] = this.stringStack[i + ssp - proc.stringArgCount];
                        }
                        isp -= proc.intArgCount;
                        ssp -= proc.stringArgCount;
                        const frame = new ClientGosubFrame();
                        frame.script = script;
                        frame.stringLocals = this.stringLocals;
                        frame.pc = pc;
                        frame.intLocals = this.intLocals;
                        if (this.fp >= this.frames.length) {
                            throw new Error();
                        }
                        script = proc;
                        pc = -1;
                        this.frames[this.fp++] = frame;
                        instructions = proc.instructions!;
                        this.intLocals = procIntLocals;
                        intOperands = proc.intOperands!;
                        this.stringLocals = procStringLocals;
                        continue;
                    }
                    if (opcode === 42) {
                        // push_varc_int
                        this.intStack[isp++] = VarCache.varcInt[intOperands[pc]];
                        continue;
                    }
                    if (opcode === 43) {
                        // pop_varc_int
                        const var10001 = intOperands[pc];
                        isp--;
                        VarCache.varcInt[var10001] = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 44) {
                        // define_array
                        const var31 = intOperands[pc] >> 16;
                        isp--;
                        const var32 = this.intStack[isp];
                        const var33 = intOperands[pc] & 0xffff;
                        if (var32 < 0 || var32 > 5000) {
                            throw new Error();
                        }
                        this.arrayLengths[var31] = var32;
                        let var34 = -1;
                        if (var33 === 105) {
                            var34 = 0;
                        }
                        for (let var35 = 0; var35 < var32; var35++) {
                            this.arrays[var31][var35] = var34;
                        }
                        continue;
                    }
                    if (opcode === 45) {
                        // push_array_int
                        const var36 = intOperands[pc];
                        isp--;
                        const var37 = this.intStack[isp];
                        if (var37 < 0 || var37 >= this.arrayLengths[var36]) {
                            throw new Error();
                        }
                        this.intStack[isp++] = this.arrays[var36][var37];
                        continue;
                    }
                    if (opcode === 46) {
                        // pop_array_int
                        isp -= 2;
                        const var38 = this.intStack[isp];
                        const var39 = intOperands[pc];
                        if (var38 < 0 || var38 >= this.arrayLengths[var39]) {
                            throw new Error();
                        }
                        this.arrays[var39][var38] = this.intStack[isp + 1];
                        continue;
                    }
                    if (opcode === 47) {
                        // push_varc_str
                        let var40 = this.varcStr[intOperands[pc]];
                        if (var40 === null) {
                            var40 = 'null';
                        }
                        this.stringStack[ssp++] = var40;
                        continue;
                    }
                    if (opcode === 48) {
                        // pop_varc_str
                        const var10001 = intOperands[pc];
                        ssp--;
                        this.varcStr[var10001] = this.stringStack[ssp];
                        continue;
                    }
                    if (opcode === 51) {
                        const var41 = script.switchTables![intOperands[pc]];
                        isp--;
                        const var42 = var41.find(BigInt(this.intStack[isp])) as IntNode | null;
                        if (var42 !== null) {
                            pc += var42.value;
                        }
                        continue;
                    }
                }

                let secondary = false;
                if (intOperands[pc] === 1) {
                    secondary = true;
                } else {
                    secondary = false;
                }

                if (opcode < 300) {
                    if (opcode === 100) {
                        // cc_create
                        isp -= 3;
                        const var44 = this.intStack[isp];
                        const var45 = this.intStack[isp + 1];
                        const var46 = this.intStack[isp + 2];
                        if (var45 === 0) {
                            throw new Error();
                        }
                        const var47 = IfType.get(var44)!;
                        if (var47.subcomponents === null) {
                            var47.subcomponents = new Array(var46 + 1).fill(null) as unknown as IfType[];
                        }
                        if (var46 >= var47.subcomponents.length) {
                            const var48 = new Array(var46 + 1).fill(null) as unknown as IfType[];
                            for (let var49 = 0; var49 < var47.subcomponents.length; var49++) {
                                var48[var49] = var47.subcomponents[var49];
                            }
                            var47.subcomponents = var48;
                        }
                        if (var46 > 0 && var47.subcomponents[var46 - 1] === null) {
                            throw new Error('Gap at:' + (var46 - 1));
                        }
                        const var50 = new IfType();
                        var50.v3 = true;
                        var50.subId = var46;
                        var50.type = var45;
                        var50.layerId = var50.parentId = var47.parentId;
                        var47.subcomponents[var46] = var50;
                        if (secondary) {
                            this.activeComponent2 = var50;
                        } else {
                            this.activeComponent = var50;
                        }
                        Client.componentUpdated(var47);
                        continue;
                    }
                    if (opcode === 101) {
                        // cc_delete
                        const var51 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                        if (var51.subId === -1) {
                            if (secondary) {
                                throw new Error('Tried to .cc_delete static .active-component!');
                            } else {
                                throw new Error('Tried to cc_delete static active-component!');
                            }
                        }
                        const var52 = IfType.get(var51.parentId)!;
                        var52.subcomponents![var51.subId] = null as unknown as IfType;
                        Client.componentUpdated(var52);
                        continue;
                    }
                    if (opcode === 102) {
                        // cc_deleteall
                        isp--;
                        const var53 = IfType.get(this.intStack[isp])!;
                        var53.subcomponents = null;
                        Client.componentUpdated(var53);
                        continue;
                    }
                    if (opcode === 200) {
                        // cc_find
                        isp -= 2;
                        const var54 = this.intStack[isp + 1];
                        const var55 = this.intStack[isp];
                        const var56 = IfType.get(var54, var55);
                        if (var56 !== null && var54 !== -1) {
                            this.intStack[isp++] = 1;
                            if (secondary) {
                                this.activeComponent2 = var56;
                            } else {
                                this.activeComponent = var56;
                            }
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 201) {
                        isp--;
                        const var57 = this.intStack[isp];
                        const var58 = IfType.get(var57);
                        if (var58 === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = 1;
                            if (secondary) {
                                this.activeComponent2 = var58;
                            } else {
                                this.activeComponent = var58;
                            }
                        }
                        continue;
                    }
                } else if (opcode < 500) {
                    if (opcode === 403) {
                        isp -= 2;
                        let var372 = this.intStack[isp];
                        if (var372 >= 7) {
                            var372 -= 7;
                        }
                        const var373 = this.intStack[isp + 1];
                        Client.localPlayer!.model!.idkChangePart(var372, var373);
                        continue;
                    }
                    if (opcode === 404) {
                        isp -= 2;
                        const var374 = this.intStack[isp + 1];
                        const var375 = this.intStack[isp];
                        Client.localPlayer!.model!.idkChangeColour(var374, var375);
                        continue;
                    }
                    if (opcode === 410) {
                        isp--;
                        const var376 = this.intStack[isp] !== 0;
                        Client.localPlayer!.model!.idkChangeGender(var376);
                        continue;
                    }
                } else if ((opcode >= 1000 && opcode < 1100) || (opcode >= 2000 && opcode < 2100)) {
                    let var368: IfType;
                    if (opcode < 2000) {
                        var368 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    } else {
                        opcode -= 1000;
                        isp--;
                        var368 = IfType.get(this.intStack[isp])!;
                    }
                    if (opcode === 1000) {
                        // if/cc_setposition
                        var368.xAlignment = 0;
                        isp -= 2;
                        var368.renderX = var368.x = this.intStack[isp];
                        var368.yAlignment = 0;
                        var368.renderY = var368.y = this.intStack[isp + 1];
                        Client.componentUpdated(var368);
                        continue;
                    }
                    if (opcode === 1001) {
                        // if/cc_setsize
                        var368.widthAlignment = 0;
                        isp -= 2;
                        var368.renderWidth = var368.width = this.intStack[isp];
                        var368.modelBaseWidth = 0;
                        var368.heightAlignment = 0;
                        var368.renderHeight = var368.height = this.intStack[isp + 1];
                        var368.modelBaseHeight = 0;
                        Client.componentUpdated(var368);
                        if (var368.type === 0) {
                            Client.computeLayerLayout(false, var368);
                        }
                        Client.computeComponentLayout(var368);
                        continue;
                    }
                    if (opcode === 1003) {
                        // if/cc_sethide
                        isp--;
                        const var369 = this.intStack[isp] === 1;
                        if (var368.hide !== var369) {
                            var368.hide = var369;
                            Client.componentUpdated(var368);
                        }
                        continue;
                    }
                    if (opcode === 1004) {
                        isp -= 4;
                        var368.x = this.intStack[isp];
                        var368.y = this.intStack[isp + 1];
                        let var370 = this.intStack[isp + 2];
                        let var371 = this.intStack[isp + 3];
                        if (var371 < 0) {
                            var371 = 0;
                        } else if (var371 > 2) {
                            var371 = 2;
                        }
                        var368.yAlignment = var371 + 3;
                        if (var370 < 0) {
                            var370 = 0;
                        } else if (var370 > 2) {
                            var370 = 2;
                        }
                        var368.xAlignment = var370 + 3;
                        Client.componentUpdated(var368);
                        Client.computeComponentLayout(var368);
                        continue;
                    }
                    if (opcode === 1005) {
                        var368.xAlignment = 2;
                        isp -= 2;
                        var368.x = this.intStack[isp];
                        var368.yAlignment = 2;
                        var368.y = this.intStack[isp + 1];
                        Client.componentUpdated(var368);
                        if (var368.type === 0) {
                            Client.computeLayerLayout(false, var368);
                        }
                        Client.computeComponentLayout(var368);
                        continue;
                    }
                } else if ((opcode >= 1100 && opcode < 1200) || (opcode >= 2100 && opcode < 2200)) {
                    let var365: IfType;
                    if (opcode >= 2000) {
                        isp--;
                        var365 = IfType.get(this.intStack[isp])!;
                        opcode -= 1000;
                    } else {
                        var365 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    }
                    if (opcode === 1100) {
                        // if/cc_setscrollpos
                        isp -= 2;
                        var365.scrollPosX = this.intStack[isp];
                        if (var365.scrollWidth - var365.renderWidth < var365.scrollPosX) {
                            var365.scrollPosX = var365.scrollWidth - var365.renderWidth;
                        }
                        if (var365.scrollPosX < 0) {
                            var365.scrollPosX = 0;
                        }
                        var365.scrollPosY = this.intStack[isp + 1];
                        if (var365.scrollPosY > var365.scrollHeight - var365.renderHeight) {
                            var365.scrollPosY = var365.scrollHeight - var365.renderHeight;
                        }
                        if (var365.scrollPosY < 0) {
                            var365.scrollPosY = 0;
                        }
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1101) {
                        // if/cc_setcolour
                        isp--;
                        var365.colour = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1102) {
                        // if/cc_setfill
                        isp--;
                        var365.fill = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1103) {
                        // if/cc_settrans
                        isp--;
                        var365.trans = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1104) {
                        // if/cc_setlinewid
                        isp--;
                        var365.lineWidth = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1105) {
                        // if/cc_setgraphic
                        isp--;
                        var365.graphic = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1106) {
                        // if/cc_set2dangle
                        isp--;
                        var365.rotate = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1107) {
                        // if/cc_settiling
                        isp--;
                        var365.tiling = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1108) {
                        // if/cc_setmodel
                        var365.model1Type = 1;
                        isp--;
                        var365.model1Id = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1109) {
                        // if/cc_setmodelangle
                        isp -= 6;
                        var365.field3365 = this.intStack[isp];
                        var365.field3498 = this.intStack[isp + 1];
                        var365.modelXAn = this.intStack[isp + 2];
                        var365.modelYAn = this.intStack[isp + 3];
                        var365.modelZAn = this.intStack[isp + 4];
                        var365.modelZoom = this.intStack[isp + 5];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1110) {
                        // if/cc_setmodelanim
                        isp--;
                        const var366 = this.intStack[isp];
                        if (var365.modelAnim !== var366) {
                            var365.animCycle = 0;
                            var365.modelAnim = var366;
                            var365.animFrame = 0;
                            Client.componentUpdated(var365);
                        }
                        continue;
                    }
                    if (opcode === 1111) {
                        // if/cc_setmodelorthog
                        isp--;
                        var365.orthog = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1112) {
                        // if/cc_settext
                        ssp--;
                        const var367 = this.stringStack[ssp];
                        if (!JagString.wrap(var367!).strEquals(var365.text === null ? null : JagString.wrap(var365.text))) {
                            var365.text = var367;
                            Client.componentUpdated(var365);
                        }
                        continue;
                    }
                    if (opcode === 1113) {
                        // if/cc_settextfont
                        isp--;
                        var365.font = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1114) {
                        // if/cc_settextalign
                        isp -= 3;
                        var365.hAlign = this.intStack[isp];
                        var365.vAlign = this.intStack[isp + 1];
                        var365.lineHeight = this.intStack[isp + 2];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1115) {
                        // if/cc_settextshadow
                        isp--;
                        var365.shadow = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1116) {
                        // if/cc_setoutline
                        isp--;
                        var365.outline = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1117) {
                        // if/cc_setgraphicshadow
                        isp--;
                        var365.shadowColour = this.intStack[isp];
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1118) {
                        // if/cc_setvflip
                        isp--;
                        var365.vFlip = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1119) {
                        // if/cc_sethflip
                        isp--;
                        var365.hFlip = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                    if (opcode === 1120) {
                        // if/cc_setscrollsize
                        isp -= 2;
                        var365.scrollWidth = this.intStack[isp];
                        var365.scrollHeight = this.intStack[isp + 1];
                        Client.componentUpdated(var365);
                        if (var365.type === 0) {
                            Client.computeLayerLayout(false, var365);
                        }
                        continue;
                    }
                    if (opcode === 1121) {
                        Client.componentUpdated(var365);
                        isp--;
                        continue;
                    }
                    if (opcode === 1122) {
                        isp--;
                        var365.field3477 = this.intStack[isp] === 1;
                        Client.componentUpdated(var365);
                        continue;
                    }
                } else if ((opcode >= 1200 && opcode < 1300) || (opcode >= 2200 && opcode < 2300)) {
                    let var59: IfType;
                    if (opcode >= 2000) {
                        opcode -= 1000;
                        isp--;
                        var59 = IfType.get(this.intStack[isp])!;
                    } else {
                        var59 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    }
                    Client.componentUpdated(var59);
                    if (opcode === 1200 || opcode === 1205) {
                        // if/cc_setobject || todo
                        isp -= 2;
                        const var60 = this.intStack[isp + 1];
                        const var61 = this.intStack[isp];
                        if (var61 === -1) {
                            var59.invobject = -1;
                            var59.model1Id = -1;
                            var59.model1Type = 1;
                        } else {
                            var59.invobject = var61;
                            var59.invcount = var60;
                            const var62 = ObjType.list(var61);
                            var59.field3365 = var62.xof2d;
                            var59.modelYAn = var62.yan2d;
                            var59.field3498 = var62.yof2d;
                            if (opcode === 1205) {
                                var59.showCount = false;
                            } else {
                                var59.showCount = true;
                            }
                            var59.modelXAn = var62.xan2d;
                            var59.modelZAn = var62.zan2d;
                            var59.modelZoom = var62.zoom2d;
                            if (var59.modelBaseWidth > 0) {
                                var59.modelZoom = (Math.imul(var59.modelZoom, 32) / var59.modelBaseWidth) | 0;
                            } else if (var59.width > 0) {
                                var59.modelZoom = (Math.imul(var59.modelZoom, 32) / var59.width) | 0;
                            }
                        }
                        continue;
                    }
                    if (opcode === 1201) {
                        // if/cc_setnpchead
                        var59.model1Type = 2;
                        isp--;
                        var59.model1Id = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 1202) {
                        // if/cc_setplayerhead_self
                        var59.model1Type = 3;
                        var59.model1Id = Client.localPlayer!.model!.method1427();
                        continue;
                    }
                    if (opcode === 1203) {
                        var59.model1Type = 6;
                        isp--;
                        var59.model1Id = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 1204) {
                        var59.model1Type = 5;
                        isp--;
                        var59.model1Id = this.intStack[isp];
                        continue;
                    }
                } else if ((opcode >= 1300 && opcode < 1400) || (opcode >= 2300 && opcode < 2400)) {
                    let var361: IfType;
                    if (opcode < 2000) {
                        var361 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    } else {
                        isp--;
                        var361 = IfType.get(this.intStack[isp])!;
                        opcode -= 1000;
                    }
                    if (opcode === 1300) {
                        // if/cc_setop
                        isp--;
                        const var362 = this.intStack[isp] - 1;
                        if (var362 >= 0 && var362 <= 9) {
                            ssp--;
                            var361.setOpName(this.stringStack[ssp], var362);
                            continue;
                        }
                        ssp--;
                        continue;
                    }
                    if (opcode === 1301) {
                        // if/cc_setdraggable
                        isp -= 2;
                        const var363 = this.intStack[isp];
                        const var364 = this.intStack[isp + 1];
                        var361.draggable = IfType.get(var364, var363);
                        continue;
                    }
                    if (opcode === 1302) {
                        // if/cc_setdraggablebehavior
                        isp--;
                        var361.draggablebehavior = this.intStack[isp] === 1;
                        continue;
                    }
                    if (opcode === 1303) {
                        // if/cc_setdragdeadzone
                        isp--;
                        var361.dragdeadzone = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 1304) {
                        // if/cc_setdragdeadtime
                        isp--;
                        var361.dragdeadtime = this.intStack[isp];
                        continue;
                    }
                    if (opcode === 1305) {
                        // if/cc_setopbase
                        ssp--;
                        var361.baseOpName = this.stringStack[ssp];
                        continue;
                    }
                    if (opcode === 1306) {
                        // if/cc_settargetverb
                        ssp--;
                        var361.targetVerb = this.stringStack[ssp];
                        continue;
                    }
                    if (opcode === 1307) {
                        // if/cc_clearops
                        var361.opNames = null;
                        continue;
                    }
                } else if ((opcode >= 1400 && opcode < 1500) || (opcode >= 2400 && opcode < 2500)) {
                    let var63: Int32Array | null = null;
                    let var64: IfType;
                    if (opcode < 2000) {
                        var64 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    } else {
                        isp--;
                        var64 = IfType.get(this.intStack[isp])!;
                        opcode -= 1000;
                    }
                    ssp--;
                    let var65 = JagString.wrap(this.stringStack[ssp]!);
                    if (Number(var65.length) > 0 && var65.charAt(Number(var65.length) - 1) === 89) {
                        isp--;
                        let var66 = this.intStack[isp];
                        if (var66 > 0) {
                            var63 = new Int32Array(var66);
                            while (var66-- > 0) {
                                isp--;
                                var63[var66] = this.intStack[isp];
                            }
                        }
                        var65 = var65.substring(0, Number(var65.length) - 1);
                    }
                    let var67: (number | string | null)[] | null = new Array(Number(var65.length) + 1).fill(null);
                    for (let var68 = var67.length - 1; var68 >= 1; var68--) {
                        if (var65.charAt(var68 - 1) === 115) {
                            ssp--;
                            var67[var68] = this.stringStack[ssp];
                        } else {
                            isp--;
                            var67[var68] = this.intStack[isp];
                        }
                    }
                    isp--;
                    const var69 = this.intStack[isp];
                    if (var69 === -1) {
                        var67 = null;
                    } else {
                        var67[0] = var69;
                    }
                    if (opcode === 1400) {
                        // if/cc_setonclick
                        var64.onclick = var67;
                    }
                    if (opcode === 1401) {
                        // if/cc_setonhold
                        var64.onhold = var67;
                    }
                    if (opcode === 1402) {
                        // if/cc_setonrelease
                        var64.onrelease = var67;
                    }
                    if (opcode === 1403) {
                        // if/cc_setonmouseover
                        var64.onmouseover = var67;
                    }
                    if (opcode === 1404) {
                        // if/cc_setonmouseleave
                        var64.onmouseleave = var67;
                    }
                    if (opcode === 1405) {
                        // if/cc_setondrag
                        var64.ondrag = var67;
                    }
                    if (opcode === 1406) {
                        // if/cc_setontargetleave
                        var64.ontargetleave = var67;
                    }
                    if (opcode === 1407) {
                        // if/cc_setonvartransmit
                        var64.onvartransmit = var67;
                        var64.onvartransmitlist = var63;
                    }
                    if (opcode === 1408) {
                        // if/cc_setontimer
                        var64.ontimer = var67;
                    }
                    if (opcode === 1409) {
                        // if/cc_setonop
                        var64.onop = var67;
                    }
                    if (opcode === 1410) {
                        // if/cc_setondragcomplete
                        var64.ondragcomplete = var67;
                    }
                    if (opcode === 1411) {
                        // if/cc_setonclickrepeat
                        var64.onclickrepeat = var67;
                    }
                    if (opcode === 1412) {
                        // if/cc_setonmouserepeat
                        var64.onmouserepeat = var67;
                    }
                    if (opcode === 1414) {
                        // if/cc_setoninvtransmit
                        var64.oninvtransmit = var67;
                        var64.oninvtransmitlist = var63;
                    }
                    if (opcode === 1415) {
                        // if/cc_setonstattransmit
                        var64.onstattransmitlist = var63;
                        var64.onstattransmit = var67;
                    }
                    if (opcode === 1416) {
                        // if/cc_setontargetenter
                        var64.ontargetenter = var67;
                    }
                    if (opcode === 1417) {
                        // if/cc_setonscrollwheel
                        var64.onscrollwheel = var67;
                    }
                    if (opcode === 1418) {
                        // if/cc_setonchattransmit
                        var64.onchattransmit = var67;
                    }
                    if (opcode === 1419) {
                        // if/cc_setonkey
                        var64.onkey = var67;
                    }
                    if (opcode === 1420) {
                        // if/cc_setonfriendtransmit
                        var64.onfriendtransmit = var67;
                    }
                    if (opcode === 1421) {
                        // if/cc_setonclantransmit
                        var64.onclantransmit = var67;
                    }
                    if (opcode === 1422) {
                        // if/cc_setonmisctransmit
                        var64.onmisctransmit = var67;
                    }
                    if (opcode === 1423) {
                        // if/cc_setondialogabort
                        var64.ondialogabort = var67;
                    }
                    if (opcode === 1424) {
                        // if/cc_setonsubchange
                        var64.onsubchange = var67;
                    }
                    if (opcode === 1425) {
                        var64.onstocktransmit = var67;
                    }
                    if (opcode === 1427) {
                        var64.onresize = var67;
                    }
                    var64.hashook = true;
                    continue;
                } else if (opcode < 1600) {
                    const var70 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    if (opcode === 1500) {
                        // cc_x
                        this.intStack[isp++] = var70.renderX;
                        continue;
                    }
                    if (opcode === 1501) {
                        // cc_y
                        this.intStack[isp++] = var70.renderY;
                        continue;
                    }
                    if (opcode === 1502) {
                        // cc_getwidth
                        this.intStack[isp++] = var70.renderWidth;
                        continue;
                    }
                    if (opcode === 1503) {
                        // cc_getheight
                        this.intStack[isp++] = var70.renderHeight;
                        continue;
                    }
                    if (opcode === 1504) {
                        // cc_gethide
                        this.intStack[isp++] = var70.hide ? 1 : 0;
                        continue;
                    }
                    if (opcode === 1505) {
                        // cc_getlayer
                        this.intStack[isp++] = var70.layerId;
                        continue;
                    }
                } else if (opcode < 1700) {
                    const var71 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    if (opcode === 1600) {
                        // cc_getscrollx
                        this.intStack[isp++] = var71.scrollPosX;
                        continue;
                    }
                    if (opcode === 1601) {
                        // cc_getscrolly
                        this.intStack[isp++] = var71.scrollPosY;
                        continue;
                    }
                    if (opcode === 1602) {
                        // cc_gettext
                        this.stringStack[ssp++] = var71.text;
                        continue;
                    }
                    if (opcode === 1603) {
                        // cc_getscrollwidth
                        this.intStack[isp++] = var71.scrollWidth;
                        continue;
                    }
                    if (opcode === 1604) {
                        // cc_getscrollheight
                        this.intStack[isp++] = var71.scrollHeight;
                        continue;
                    }
                    if (opcode === 1605) {
                        // cc_getmodelzoom
                        this.intStack[isp++] = var71.modelZoom;
                        continue;
                    }
                    if (opcode === 1606) {
                        // cc_getmodelangle_x
                        this.intStack[isp++] = var71.modelXAn;
                        continue;
                    }
                    if (opcode === 1607) {
                        // cc_getmodelangle_z
                        this.intStack[isp++] = var71.modelZAn;
                        continue;
                    }
                    if (opcode === 1608) {
                        // cc_getmodelangle_y
                        this.intStack[isp++] = var71.modelYAn;
                        continue;
                    }
                    if (opcode === 1609) {
                        this.intStack[isp++] = var71.trans;
                        continue;
                    }
                } else if (opcode < 1800) {
                    const var72 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    if (opcode === 1700) {
                        // cc_getinvobject
                        this.intStack[isp++] = var72.invobject;
                        continue;
                    }
                    if (opcode === 1701) {
                        // cc_getinvcount
                        if (var72.invobject === -1) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = var72.invcount;
                        }
                        continue;
                    }
                    if (opcode === 1702) {
                        // cc_getid
                        this.intStack[isp++] = var72.subId;
                        continue;
                    }
                } else if (opcode < 1900) {
                    const var73 = (secondary ? this.activeComponent2 : this.activeComponent)!;
                    if (opcode === 1800) {
                        // cc_gettargetmask
                        this.intStack[isp++] = ServerActive.targetMask(Client.getActive(var73));
                        continue;
                    }
                    if (opcode === 1801) {
                        // cc_getop
                        isp--;
                        const var74 = this.intStack[isp];
                        const var383 = var74 - 1;
                        if (var73.opNames !== null && var73.opNames.length > var383 && var73.opNames[var383] !== null) {
                            this.stringStack[ssp++] = var73.opNames[var383];
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 1802) {
                        // cc_getopbase
                        if (var73.baseOpName === null) {
                            this.stringStack[ssp++] = '';
                        } else {
                            this.stringStack[ssp++] = var73.baseOpName;
                        }
                        continue;
                    }
                } else if (opcode < 2600) {
                    isp--;
                    const var75 = IfType.get(this.intStack[isp])!;
                    if (opcode === 2500) {
                        // if_getx
                        this.intStack[isp++] = var75.renderX;
                        continue;
                    }
                    if (opcode === 2501) {
                        // if_gety
                        this.intStack[isp++] = var75.renderY;
                        continue;
                    }
                    if (opcode === 2502) {
                        // if_getwidth
                        this.intStack[isp++] = var75.renderWidth;
                        continue;
                    }
                    if (opcode === 2503) {
                        // if_getheight
                        this.intStack[isp++] = var75.renderHeight;
                        continue;
                    }
                    if (opcode === 2504) {
                        // if_gethide
                        this.intStack[isp++] = var75.hide ? 1 : 0;
                        continue;
                    }
                    if (opcode === 2505) {
                        // if_getlayer
                        this.intStack[isp++] = var75.layerId;
                        continue;
                    }
                } else if (opcode < 2700) {
                    isp--;
                    const var76 = IfType.get(this.intStack[isp])!;
                    if (opcode === 2600) {
                        // if_getscrollx
                        this.intStack[isp++] = var76.scrollPosX;
                        continue;
                    }
                    if (opcode === 2601) {
                        // if_getscrolly
                        this.intStack[isp++] = var76.scrollPosY;
                        continue;
                    }
                    if (opcode === 2602) {
                        // if_gettext
                        this.stringStack[ssp++] = var76.text;
                        continue;
                    }
                    if (opcode === 2603) {
                        // if_getscrollwidth
                        this.intStack[isp++] = var76.scrollWidth;
                        continue;
                    }
                    if (opcode === 2604) {
                        // if_getscrollheight
                        this.intStack[isp++] = var76.scrollHeight;
                        continue;
                    }
                    if (opcode === 2605) {
                        // if_getmodelzoom
                        this.intStack[isp++] = var76.modelZoom;
                        continue;
                    }
                    if (opcode === 2606) {
                        // if_getmodelangle_x
                        this.intStack[isp++] = var76.modelXAn;
                        continue;
                    }
                    if (opcode === 2607) {
                        // if_getmodelangle_z
                        this.intStack[isp++] = var76.modelZAn;
                        continue;
                    }
                    if (opcode === 2608) {
                        // if_getmodelangle_y
                        this.intStack[isp++] = var76.modelYAn;
                        continue;
                    }
                    if (opcode === 2609) {
                        this.intStack[isp++] = var76.trans;
                        continue;
                    }
                } else if (opcode < 2800) {
                    if (opcode === 2700) {
                        // if_getinvobject
                        isp--;
                        const var351 = IfType.get(this.intStack[isp])!;
                        this.intStack[isp++] = var351.invobject;
                        continue;
                    }
                    if (opcode === 2701) {
                        // if_getinvcount
                        isp--;
                        const var352 = IfType.get(this.intStack[isp])!;
                        if (var352.invobject === -1) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = var352.invcount;
                        }
                        continue;
                    }
                    if (opcode === 2702) {
                        // if_hassub
                        isp--;
                        const var353 = this.intStack[isp];
                        const var354 = Client.subinterfaces.find(BigInt(var353)) as SubInterface | null;
                        if (var354 === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = 1;
                        }
                        continue;
                    }
                    if (opcode === 2703) {
                        isp--;
                        const var355 = IfType.get(this.intStack[isp])!;
                        if (var355.subcomponents === null) {
                            this.intStack[isp++] = 0;
                            continue;
                        }
                        let var356 = var355.subcomponents.length;
                        for (let var357 = 0; var357 < var355.subcomponents.length; var357++) {
                            if (var355.subcomponents[var357] === null) {
                                var356 = var357;
                                break;
                            }
                        }
                        this.intStack[isp++] = var356;
                        continue;
                    }
                    if (opcode === 2704 || opcode === 2705) {
                        isp -= 2;
                        const var358 = this.intStack[isp];
                        const var359 = this.intStack[isp + 1];
                        const var360 = Client.subinterfaces.find(BigInt(var358)) as SubInterface | null;
                        if (var360 !== null && var360.id === var359) {
                            this.intStack[isp++] = 1;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                } else if (opcode < 2900) {
                    isp--;
                    const var77 = IfType.get(this.intStack[isp])!;
                    if (opcode === 2800) {
                        // if_gettargetmask
                        this.intStack[isp++] = ServerActive.targetMask(Client.getActive(var77));
                        continue;
                    }
                    if (opcode === 2801) {
                        // if_getop
                        isp--;
                        const var78 = this.intStack[isp];
                        const var384 = var78 - 1;
                        if (var77.opNames !== null && var77.opNames.length > var384 && var77.opNames[var384] !== null) {
                            this.stringStack[ssp++] = var77.opNames[var384];
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 2802) {
                        // if_getopbase
                        if (var77.baseOpName === null) {
                            this.stringStack[ssp++] = '';
                        } else {
                            this.stringStack[ssp++] = var77.baseOpName;
                        }
                        continue;
                    }
                } else if (opcode < 3200) {
                    if (opcode === 3100) {
                        // mes
                        ssp--;
                        const var336 = this.stringStack[ssp]!;
                        Client.addChat(var336, 0, '');
                        continue;
                    }
                    if (opcode === 3101) {
                        // anim
                        isp -= 2;
                        Client.triggerPlayerAnim(this.intStack[isp], this.intStack[isp + 1], Client.localPlayer!);
                        continue;
                    }
                    if (opcode === 3103) {
                        // if_close
                        Client.closeModal();
                        continue;
                    }
                    if (opcode === 3104) {
                        // resume_countdialog
                        ssp--;
                        const var337 = JagString.wrap(this.stringStack[ssp]!);
                        let var338 = 0;
                        if (var337.isDecimal()) {
                            var338 = var337.toInt();
                        }
                        Client.out.p1Enc(ClientProt.RESUME_P_COUNTDIALOG);
                        Client.out.p4(var338);
                        continue;
                    }
                    if (opcode === 3105) {
                        // resume_namedialog — 464 op 150 (var-byte): [u8 len+1][string chars][NUL]
                        // (rev-500 sent an 8-byte userhash; server reads byte + NUL-string)
                        ssp--;
                        const var339 = this.stringStack[ssp]!;
                        Client.out.p1Enc(ClientProt.RESUME_P_NAMEDIALOG);
                        Client.out.p1(Packet.pjstrlen(var339));
                        Client.out.pjstr(var339);
                        continue;
                    }
                    if (opcode === 3106) {
                        // resume_stringdialog — 464 op 150 (var-byte): [u8 len+1][string chars][NUL],
                        // same channel as the name dialog; the server routes both to text input.
                        ssp--;
                        const var340 = this.stringStack[ssp]!;
                        Client.out.p1Enc(ClientProt.RESUME_P_STRINGDIALOG);
                        Client.out.p1(Packet.pjstrlen(var340));
                        Client.out.pjstr(var340);
                        continue;
                    }
                    if (opcode === 3107) {
                        // opplayer
                        isp--;
                        const var341 = this.intStack[isp];
                        ssp--;
                        const var342 = this.stringStack[ssp]!;
                        Client.opPlayer(var342, var341);
                        continue;
                    }
                    if (opcode === 3108) {
                        // if_dragpickup
                        isp -= 3;
                        const var343 = this.intStack[isp];
                        const var344 = this.intStack[isp + 1];
                        const var345 = this.intStack[isp + 2];
                        const var346 = IfType.get(var345);
                        Client.dragTryPickup(var343, var344, var346);
                        continue;
                    }
                    if (opcode === 3109) {
                        // cc_dragpickup
                        isp -= 2;
                        const var347 = this.intStack[isp];
                        const var348 = this.intStack[isp + 1];
                        const var349 = secondary ? this.activeComponent2 : this.activeComponent;
                        Client.dragTryPickup(var347, var348, var349);
                        continue;
                    }
                    if (opcode === 3110) {
                        // resume_objdialog — DO NOT SEND: aliased to 202 (server size 0).
                        isp--;
                        continue;
                    }
                } else if (opcode < 3300) {
                    if (opcode === 3200) {
                        // sound_synth
                        isp -= 3;
                        Client.playSynth(this.intStack[isp + 1], this.intStack[isp + 2], this.intStack[isp]);
                        continue;
                    }
                    if (opcode === 3201) {
                        // sound_song
                        isp--;
                        Client.playSongs(this.intStack[isp]);
                        continue;
                    }
                    if (opcode === 3202) {
                        // sound_jingle
                        isp -= 2;
                        Client.playJingle(this.intStack[isp], this.intStack[isp + 1]);
                        continue;
                    }
                } else if (opcode < 3400) {
                    if (opcode === 3300) {
                        // clientclock
                        this.intStack[isp++] = Client.loopCycle;
                        continue;
                    }
                    if (opcode === 3301) {
                        // inv_getobj
                        isp -= 2;
                        const var314 = this.intStack[isp + 1];
                        const var315 = this.intStack[isp];
                        this.intStack[isp++] = ClientInvCache.getType(var314, var315);
                        continue;
                    }
                    if (opcode === 3302) {
                        // inv_getnum
                        isp -= 2;
                        const var316 = this.intStack[isp];
                        const var317 = this.intStack[isp + 1];
                        this.intStack[isp++] = ClientInvCache.getCount(var316, var317);
                        continue;
                    }
                    if (opcode === 3303) {
                        // inv_total
                        isp -= 2;
                        const var318 = this.intStack[isp + 1];
                        const var319 = this.intStack[isp];
                        this.intStack[isp++] = ClientInvCache.invTotal(var319, var318);
                        continue;
                    }
                    if (opcode === 3304) {
                        // inv_size
                        isp--;
                        const var320 = this.intStack[isp];
                        this.intStack[isp++] = InvType.list(var320).size;
                        continue;
                    }
                    if (opcode === 3305) {
                        // stat
                        isp--;
                        const var321 = this.intStack[isp];
                        this.intStack[isp++] = Client.statEffectiveLevel[var321];
                        continue;
                    }
                    if (opcode === 3306) {
                        // stat_base
                        isp--;
                        const var322 = this.intStack[isp];
                        this.intStack[isp++] = Client.statBaseLevel[var322];
                        continue;
                    }
                    if (opcode === 3307) {
                        // stat_xp
                        isp--;
                        const var323 = this.intStack[isp];
                        this.intStack[isp++] = Client.statXP[var323];
                        continue;
                    }
                    if (opcode === 3308) {
                        // coord
                        const var324 = Client.minusedlevel;
                        const var325 = (Client.localPlayer!.z >> 7) + Client.mapBuildBaseZ;
                        const var326 = Client.mapBuildBaseX + (Client.localPlayer!.x >> 7);
                        this.intStack[isp++] = (var325 + (var326 << 14) + (var324 << 28)) | 0;
                        continue;
                    }
                    if (opcode === 3309) {
                        // coordx
                        isp--;
                        const var327 = this.intStack[isp];
                        this.intStack[isp++] = (var327 >> 14) & 0x3fff;
                        continue;
                    }
                    if (opcode === 3310) {
                        // coordy
                        isp--;
                        const var328 = this.intStack[isp];
                        this.intStack[isp++] = var328 >> 28;
                        continue;
                    }
                    if (opcode === 3311) {
                        // coordz
                        isp--;
                        const var329 = this.intStack[isp];
                        this.intStack[isp++] = var329 & 0x3fff;
                        continue;
                    }
                    if (opcode === 3312) {
                        // map_members
                        this.intStack[isp++] = Client.memServer ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3313) {
                        // invother_getobj
                        isp -= 2;
                        const var330 = this.intStack[isp + 1];
                        const var331 = this.intStack[isp] + 32768;
                        this.intStack[isp++] = ClientInvCache.getType(var330, var331);
                        continue;
                    }
                    if (opcode === 3314) {
                        // invother_getnum
                        isp -= 2;
                        const var332 = this.intStack[isp] + 32768;
                        const var333 = this.intStack[isp + 1];
                        this.intStack[isp++] = ClientInvCache.getCount(var332, var333);
                        continue;
                    }
                    if (opcode === 3315) {
                        // invother_total
                        isp -= 2;
                        const var334 = this.intStack[isp] + 32768;
                        const var335 = this.intStack[isp + 1];
                        this.intStack[isp++] = ClientInvCache.invTotal(var334, var335);
                        continue;
                    }
                    if (opcode === 3316) {
                        // staffmodlevel
                        if (Client.staffmodlevel < 2) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = Client.staffmodlevel;
                        }
                        continue;
                    }
                    if (opcode === 3317) {
                        // reboottimer
                        this.intStack[isp++] = Client.rebootTimer;
                        continue;
                    }
                    if (opcode === 3318) {
                        // map_world
                        this.intStack[isp++] = Client.worldid;
                        continue;
                    }
                    if (opcode === 3321) {
                        // runenergy_visible
                        this.intStack[isp++] = Client.runenergy;
                        continue;
                    }
                    if (opcode === 3322) {
                        // runweight_visible
                        this.intStack[isp++] = Client.runweight;
                        continue;
                    }
                    if (opcode === 3323) {
                        // playermod
                        if (Client.playermod >= 5 && Client.playermod <= 9) {
                            this.intStack[isp++] = 1;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3324) {
                        if (Client.playermod >= 5 && Client.playermod <= 9) {
                            this.intStack[isp++] = Client.playermod;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3325) {
                        if (Client.membersAccount > 0) {
                            this.intStack[isp++] = 1;
                        } else {
                            this.intStack[isp++] = 0;
                        }
                        continue;
                    }
                    if (opcode === 3326) {
                        this.intStack[isp++] = Client.localPlayer!.combatLevel;
                        continue;
                    }
                    if (opcode === 3327) {
                        this.intStack[isp++] = Client.localPlayer!.model!.gender ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3328) {
                        this.intStack[isp++] = Client.underage;
                        continue;
                    }
                    if (opcode === 3329) {
                        this.intStack[isp++] = Client.mapQuickchat;
                        continue;
                    }
                } else if (opcode < 3500) {
                    if (opcode === 3400) {
                        // enum_string
                        isp -= 2;
                        const var306 = this.intStack[isp];
                        const var307 = this.intStack[isp + 1];
                        const var308 = EnumType.list(var306);
                        this.stringStack[ssp++] = var308.getValueString(var307);
                        continue;
                    }
                    if (opcode === 3408) {
                        // enum
                        isp -= 4;
                        const var309 = this.intStack[isp + 1];
                        const var310 = this.intStack[isp + 2];
                        const var311 = this.intStack[isp + 3];
                        const var312 = this.intStack[isp];
                        const var313 = EnumType.list(var310);
                        if (var312 === var313.inputtype && var309 === var313.outputtype) {
                            if (var309 === 115) {
                                this.stringStack[ssp++] = var313.getValueString(var311);
                            } else {
                                this.intStack[isp++] = var313.getValueInt(var311);
                            }
                            continue;
                        }
                        if (var309 === 115) {
                            this.stringStack[ssp++] = 'null';
                        } else {
                            this.intStack[isp++] = 0;
                        }
                        continue;
                    }
                } else if (opcode < 3700) {
                    if (opcode === 3600) {
                        // friend_count
                        if (Client.friendServerStatus === 0) {
                            this.intStack[isp++] = -2;
                        } else if (Client.friendServerStatus === 1) {
                            this.intStack[isp++] = -1;
                        } else {
                            this.intStack[isp++] = Client.friendCount;
                        }
                        continue;
                    }
                    if (opcode === 3601) {
                        // friend_getname
                        isp--;
                        const var79 = this.intStack[isp];
                        if (Client.friendServerStatus === 2 && var79 < Client.friendCount) {
                            this.stringStack[ssp++] = Client.field370[var79]!.toString();
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 3602) {
                        // friend_getworld
                        isp--;
                        const var80 = this.intStack[isp];
                        if (Client.friendServerStatus === 2 && var80 < Client.friendCount) {
                            this.intStack[isp++] = Client.field3092[var80];
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3603) {
                        // friend_getrank
                        isp--;
                        const var81 = this.intStack[isp];
                        if (Client.friendServerStatus === 2 && var81 < Client.friendCount) {
                            this.intStack[isp++] = Client.field845[var81];
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3604) {
                        // friend_setrank
                        ssp--;
                        const var82 = this.stringStack[ssp]!;
                        isp--;
                        const var83 = this.intStack[isp];
                        Client.setFriendRank(var82, var83);
                        continue;
                    }
                    if (opcode === 3605) {
                        // friend_add
                        ssp--;
                        const var84 = this.stringStack[ssp]!;
                        Client.addFriend(JagString.fromLatin1String(var84).toUserhash());
                        continue;
                    }
                    if (opcode === 3606) {
                        // friend_del
                        ssp--;
                        const var85 = this.stringStack[ssp]!;
                        Client.delFriend(JagString.fromLatin1String(var85).toUserhash());
                        continue;
                    }
                    if (opcode === 3607) {
                        // ignore_add
                        ssp--;
                        const var86 = this.stringStack[ssp]!;
                        Client.addIgnore(JagString.fromLatin1String(var86).toUserhash());
                        continue;
                    }
                    if (opcode === 3608) {
                        // ignore_del
                        ssp--;
                        const var87 = this.stringStack[ssp]!;
                        Client.delIgnore(JagString.fromLatin1String(var87).toUserhash());
                        continue;
                    }
                    if (opcode === 3609) {
                        // friend_test
                        ssp--;
                        let var88 = this.stringStack[ssp]!;
                        // todo: StringConstants.TAG_IMG
                        if (var88.startsWith('<img=0>') || var88.startsWith('<img=1>')) {
                            var88 = var88.substring(7);
                        }
                        this.intStack[isp++] = Client.isFriend(var88) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3610) {
                        isp--;
                        const var89 = this.intStack[isp];
                        if (Client.friendServerStatus === 2 && Client.friendCount > var89) {
                            this.stringStack[ssp++] = Client.field3238[var89];
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 3611) {
                        // clan_getchatdisplayname
                        if (Client.chatDisplayName === null) {
                            this.stringStack[ssp++] = '';
                        } else {
                            this.stringStack[ssp++] = JagString.fromLatin1String(Client.chatDisplayName).toScreenName().toString();
                        }
                        continue;
                    }
                    if (opcode === 3612) {
                        // clan_getchatcount
                        if (Client.chatDisplayName === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = Client.friendChatCount;
                        }
                        continue;
                    }
                    if (opcode === 3613) {
                        // clan_getchatusername
                        isp--;
                        const var90 = this.intStack[isp];
                        if (Client.chatDisplayName !== null && Client.friendChatCount > var90) {
                            this.stringStack[ssp++] = Client.friendChatList![var90]!.name!.toScreenName().toString();
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 3614) {
                        // clan_getchatuserworld
                        isp--;
                        const var91 = this.intStack[isp];
                        if (Client.chatDisplayName !== null && Client.friendChatCount > var91) {
                            this.intStack[isp++] = Client.friendChatList![var91]!.world;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3615) {
                        // clan_getchatuserrank
                        isp--;
                        const var92 = this.intStack[isp];
                        if (Client.chatDisplayName !== null && Client.friendChatCount > var92) {
                            this.intStack[isp++] = Client.friendChatList![var92]!.rank;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3616) {
                        // clan_getchatminkick
                        this.intStack[isp++] = Client.chatMinKick;
                        continue;
                    }
                    if (opcode === 3617) {
                        // clan_kickuser
                        ssp--;
                        const var93 = this.stringStack[ssp]!;
                        Client.friendsChatKickUser(var93);
                        continue;
                    }
                    if (opcode === 3618) {
                        // clan_getchatrank
                        this.intStack[isp++] = Client.chatRank;
                        continue;
                    }
                    if (opcode === 3619) {
                        // clan_joinchat
                        ssp--;
                        const var94 = this.stringStack[ssp]!;
                        Client.friendsChatJoinChat(JagString.fromLatin1String(var94).toUserhash());
                        continue;
                    }
                    if (opcode === 3620) {
                        // clan_leavechat
                        Client.friendsChatLeaveChat();
                        continue;
                    }
                    if (opcode === 3621) {
                        // ignore_count
                        if (Client.friendServerStatus === 0) {
                            this.intStack[isp++] = -1;
                        } else {
                            this.intStack[isp++] = Client.privateMessageCount;
                        }
                        continue;
                    }
                    if (opcode === 3622) {
                        // ignore_getname
                        isp--;
                        const var95 = this.intStack[isp];
                        if (Client.friendServerStatus !== 0 && var95 < Client.privateMessageCount) {
                            this.stringStack[ssp++] = JagString.toRawUsername(Client.messageIds[var95])!.toScreenName().toString();
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 3623) {
                        // ignore_test
                        ssp--;
                        let var96 = this.stringStack[ssp]!;
                        if (var96.startsWith('<img=0>') || var96.startsWith('<img=1>')) {
                            var96 = var96.substring(7);
                        }
                        this.intStack[isp++] = Client.isIgnored(var96) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3624) {
                        // clan_isself
                        isp--;
                        const var97 = this.intStack[isp];
                        if (Client.friendChatList !== null && Client.friendChatCount > var97 && Client.friendChatList![var97]!.name!.equalsIgnoreCase(Client.localPlayer!.name === null ? null : JagString.wrap(Client.localPlayer!.name))) {
                            this.intStack[isp++] = 1;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3625) {
                        // clan_getchatownername
                        if (Client.chatOwnerName === null) {
                            this.stringStack[ssp++] = '';
                        } else {
                            this.stringStack[ssp++] = JagString.fromLatin1String(Client.chatOwnerName).toScreenName().toString();
                        }
                        continue;
                    }
                    if (opcode === 3626) {
                        isp--;
                        const var98 = this.intStack[isp];
                        if (Client.chatDisplayName !== null && Client.friendChatCount > var98) {
                            this.stringStack[ssp++] = Client.friendChatList![var98]!.displayName;
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 3627) {
                        isp--;
                        const var99 = this.intStack[isp];
                        if (Client.friendServerStatus === 2 && var99 >= 0 && var99 < Client.friendCount) {
                            this.intStack[isp++] = Client.field1120[var99] ? 1 : 0;
                            continue;
                        }
                        this.intStack[isp++] = 0;
                        continue;
                    }
                    if (opcode === 3628) {
                        ssp--;
                        let var100 = this.stringStack[ssp]!;
                        if (var100.startsWith('<img=0>') || var100.startsWith('<img=1>')) {
                            var100 = var100.substring(7);
                        }
                        this.intStack[isp++] = Client.getFriendIndex(var100);
                        continue;
                    }
                } else if (opcode < 4000) {
                    if (opcode === 3903) {
                        isp--;
                        const var101 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var101].getType();
                        continue;
                    }
                    if (opcode === 3904) {
                        isp--;
                        const var102 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var102].item;
                        continue;
                    }
                    if (opcode === 3905) {
                        isp--;
                        const var103 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var103].price;
                        continue;
                    }
                    if (opcode === 3906) {
                        isp--;
                        const var104 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var104].count;
                        continue;
                    }
                    if (opcode === 3907) {
                        isp--;
                        const var105 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var105].completedCount;
                        continue;
                    }
                    if (opcode === 3908) {
                        isp--;
                        const var106 = this.intStack[isp];
                        this.intStack[isp++] = Client.field140[var106].completedGold;
                        continue;
                    }
                    if (opcode === 3910) {
                        isp--;
                        const var107 = this.intStack[isp];
                        const var108 = Client.field140[var107].getState();
                        this.intStack[isp++] = var108 === 0 ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3911) {
                        isp--;
                        const var109 = this.intStack[isp];
                        const var110 = Client.field140[var109].getState();
                        this.intStack[isp++] = var110 === 2 ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3912) {
                        isp--;
                        const var111 = this.intStack[isp];
                        const var112 = Client.field140[var111].getState();
                        this.intStack[isp++] = var112 === 5 ? 1 : 0;
                        continue;
                    }
                    if (opcode === 3913) {
                        isp--;
                        const var113 = this.intStack[isp];
                        const var114 = Client.field140[var113].getState();
                        this.intStack[isp++] = var114 === 1 ? 1 : 0;
                        continue;
                    }
                } else if (opcode < 4100) {
                    if (opcode === 4000) {
                        // add
                        isp -= 2;
                        const var115 = this.intStack[isp];
                        const var116 = this.intStack[isp + 1];
                        this.intStack[isp++] = (var115 + var116) | 0;
                        continue;
                    }
                    if (opcode === 4001) {
                        // sub
                        isp -= 2;
                        const var117 = this.intStack[isp];
                        const var118 = this.intStack[isp + 1];
                        this.intStack[isp++] = (var117 - var118) | 0;
                        continue;
                    }
                    if (opcode === 4002) {
                        // multiply
                        isp -= 2;
                        const var119 = this.intStack[isp + 1];
                        const var120 = this.intStack[isp];
                        this.intStack[isp++] = Math.imul(var120, var119);
                        continue;
                    }
                    if (opcode === 4003) {
                        // divide
                        isp -= 2;
                        const var121 = this.intStack[isp];
                        const var122 = this.intStack[isp + 1];
                        if (var122 === 0) {
                            throw new Error();
                        }
                        this.intStack[isp++] = (var121 / var122) | 0;
                        continue;
                    }
                    if (opcode === 4004) {
                        // random
                        isp--;
                        const var123 = this.intStack[isp];
                        this.intStack[isp++] = (Math.random() * var123) | 0;
                        continue;
                    }
                    if (opcode === 4005) {
                        // randominc
                        isp--;
                        const var124 = this.intStack[isp];
                        this.intStack[isp++] = (((var124 + 1) | 0) * Math.random()) | 0;
                        continue;
                    }
                    if (opcode === 4006) {
                        // interpolate
                        isp -= 5;
                        const var125 = this.intStack[isp];
                        const var126 = this.intStack[isp + 1];
                        const var127 = this.intStack[isp + 2];
                        const var128 = this.intStack[isp + 3];
                        const var129 = this.intStack[isp + 4];
                        if (var128 - var127 === 0) {
                            throw new Error();
                        }
                        this.intStack[isp++] = (var125 + ((Math.imul(var129 - var127, -var125 + var126) / (var128 - var127)) | 0)) | 0;
                        continue;
                    }
                    if (opcode === 4007) {
                        // addpercent
                        isp -= 2;
                        const var130: bigint = BigInt(this.intStack[isp + 1]);
                        const var132: bigint = BigInt(this.intStack[isp]);
                        this.intStack[isp++] = Number(BigInt.asIntN(32, BigInt.asIntN(64, var130 * var132) / 100n + var132));
                        continue;
                    }
                    if (opcode === 4008) {
                        // setbit
                        isp -= 2;
                        const var134 = this.intStack[isp];
                        const var135 = this.intStack[isp + 1];
                        this.intStack[isp++] = (0x1 << var135) | var134;
                        continue;
                    }
                    if (opcode === 4009) {
                        // clearbit
                        isp -= 2;
                        const var136 = this.intStack[isp + 1];
                        const var137 = this.intStack[isp];
                        this.intStack[isp++] = var137 & (-(0x1 << var136) - 1);
                        continue;
                    }
                    if (opcode === 4010) {
                        // testbit
                        isp -= 2;
                        const var138 = this.intStack[isp + 1];
                        const var139 = this.intStack[isp];
                        this.intStack[isp++] = (var139 & (0x1 << var138)) === 0 ? 0 : 1;
                        continue;
                    }
                    if (opcode === 4011) {
                        // modulo
                        isp -= 2;
                        const var140 = this.intStack[isp + 1];
                        const var141 = this.intStack[isp];
                        if (var140 === 0) {
                            throw new Error();
                        }
                        this.intStack[isp++] = var141 % var140;
                        continue;
                    }
                    if (opcode === 4012) {
                        // pow
                        isp -= 2;
                        const var142 = this.intStack[isp];
                        const var143 = this.intStack[isp + 1];
                        if (var142 === 0) {
                            this.intStack[isp++] = 0;
                        } else {
                            const value = Math.pow(var142, var143);
                            this.intStack[isp++] = Number.isNaN(value) ? 0 : value > 0x7fffffff ? 0x7fffffff : value < -0x80000000 ? -0x80000000 : Math.trunc(value);
                        }
                        continue;
                    }
                    if (opcode === 4013) {
                        // invpow
                        isp -= 2;
                        const var144 = this.intStack[isp];
                        const var145 = this.intStack[isp + 1];
                        if (var144 === 0) {
                            this.intStack[isp++] = 0;
                        } else if (var145 === 0) {
                            this.intStack[isp++] = 0x7fffffff;
                        } else {
                            const result = Math.pow(var144, 1.0 / var145);
                            this.intStack[isp++] = Number.isNaN(result) ? 0 : result > 0x7fffffff ? 0x7fffffff : result < -0x80000000 ? -0x80000000 : Math.trunc(result);
                        }
                        continue;
                    }
                    if (opcode === 4014) {
                        // and
                        isp -= 2;
                        const var146 = this.intStack[isp + 1];
                        const var147 = this.intStack[isp];
                        this.intStack[isp++] = var146 & var147;
                        continue;
                    }
                    if (opcode === 4015) {
                        // or
                        isp -= 2;
                        const var148 = this.intStack[isp + 1];
                        const var149 = this.intStack[isp];
                        this.intStack[isp++] = var149 | var148;
                        continue;
                    }
                    if (opcode === 4016) {
                        isp -= 2;
                        const var150 = this.intStack[isp];
                        const var151 = this.intStack[isp + 1];
                        this.intStack[isp++] = var150 < var151 ? var150 : var151;
                        continue;
                    }
                    if (opcode === 4017) {
                        isp -= 2;
                        const var152 = this.intStack[isp];
                        const var153 = this.intStack[isp + 1];
                        this.intStack[isp++] = var152 <= var153 ? var153 : var152;
                        continue;
                    }
                    if (opcode === 4018) {
                        isp -= 3;
                        const var154: bigint = BigInt(this.intStack[isp]);
                        const var156: bigint = BigInt(this.intStack[isp + 1]);
                        const var158: bigint = BigInt(this.intStack[isp + 2]);
                        this.intStack[isp++] = Number(BigInt.asIntN(32, BigInt.asIntN(64, var158 * var154) / var156));
                        continue;
                    }
                } else if (opcode < 4200) {
                    if (opcode === 4100) {
                        // append_num
                        ssp--;
                        let var254 = this.stringStack[ssp];
                        isp--;
                        const var255 = this.intStack[isp];
                        this.stringStack[ssp++] = JagString.join([var254 === null ? JagString.STRING_NULL : JagString.wrap(var254), JagString.parseInt(var255)]).toString();
                        continue;
                    }
                    if (opcode === 4101) {
                        // append
                        ssp -= 2;
                        let var256 = this.stringStack[ssp + 1];
                        let var257 = this.stringStack[ssp];
                        this.stringStack[ssp++] = JagString.join([var257 === null ? JagString.STRING_NULL : JagString.wrap(var257), var256 === null ? JagString.STRING_NULL : JagString.wrap(var256)]).toString();
                        continue;
                    }
                    if (opcode === 4102) {
                        // append_signnum
                        ssp--;
                        let var258 = this.stringStack[ssp];
                        isp--;
                        const var259 = this.intStack[isp];
                        this.stringStack[ssp++] = JagString.join([var258 === null ? JagString.STRING_NULL : JagString.wrap(var258), JagString.formatIntSigned(var259)]).toString();
                        continue;
                    }
                    if (opcode === 4103) {
                        // lowercase
                        ssp--;
                        const var260 = JagString.wrap(this.stringStack[ssp]!);
                        this.stringStack[ssp++] = var260.toLowerCase().toString();
                        continue;
                    }
                    if (opcode === 4104) {
                        // fromdate
                        isp--;
                        const var261 = this.intStack[isp];
                        const var262 = Number(BigInt.asIntN(64, (BigInt(var261) + 11745n) * 86400000n));
                        const var263 = new Date(var262);
                        const var264 = var263.getDate();
                        const var265 = var263.getMonth();
                        const var266 = var263.getFullYear();
                        this.stringStack[ssp++] = JagString.join([JagString.parseInt(var264), JagString.wrap('-'), JagString.wrap(this.months[var265]), JagString.wrap('-'), JagString.parseInt(var266)]).toString();
                        continue;
                    }
                    if (opcode === 4105) {
                        // text_gender
                        ssp -= 2;
                        const var267 = this.stringStack[ssp];
                        const var268 = this.stringStack[ssp + 1];
                        if (Client.localPlayer!.model! !== null && Client.localPlayer!.model!.gender) {
                            this.stringStack[ssp++] = var268;
                            continue;
                        }
                        this.stringStack[ssp++] = var267;
                        continue;
                    }
                    if (opcode === 4106) {
                        // tostring
                        isp--;
                        const var269 = this.intStack[isp];
                        this.stringStack[ssp++] = JagString.parseInt(var269).toString();
                        continue;
                    }
                    if (opcode === 4107) {
                        // compare
                        ssp -= 2;
                        // todo: StringTools.compare
                        this.intStack[isp++] = JagString.wrap(this.stringStack[ssp]!).compareSorted(JagString.wrap(this.stringStack[ssp + 1]!));
                        continue;
                    }
                    if (opcode === 4108) {
                        // paraheight
                        isp -= 2;
                        const var270 = this.intStack[isp];
                        ssp--;
                        const var271 = this.stringStack[ssp]!;
                        const var272 = this.intStack[isp + 1];
                        const var273 = Client.fontmetrics!.getFile(0, var272)!;
                        const var274 = new SoftwarePixFont(var273);
                        var274.setIcons(Client.modIcons, null);
                        this.intStack[isp++] = var274.predictLinesMultiline(var271, var270);
                        continue;
                    }
                    if (opcode === 4109) {
                        // parawidth
                        isp -= 2;
                        ssp--;
                        const var275 = this.stringStack[ssp]!;
                        const var276 = this.intStack[isp + 1];
                        const var277 = this.intStack[isp];
                        const var278 = Client.fontmetrics!.getFile(0, var276)!;
                        const var279 = new SoftwarePixFont(var278);
                        var279.setIcons(Client.modIcons, null);
                        this.intStack[isp++] = var279.predictWidthMultiline(var275, var277);
                        continue;
                    }
                    if (opcode === 4110) {
                        // text_switch
                        ssp -= 2;
                        const var280 = this.stringStack[ssp + 1];
                        const var281 = this.stringStack[ssp];
                        isp--;
                        if (this.intStack[isp] === 1) {
                            this.stringStack[ssp++] = var281;
                        } else {
                            this.stringStack[ssp++] = var280;
                        }
                        continue;
                    }
                    if (opcode === 4111) {
                        // escape
                        ssp--;
                        const var282 = JagString.wrap(this.stringStack[ssp]!);
                        this.stringStack[ssp++] = PixfontGeneric.escape(var282.toString());
                        continue;
                    }
                    if (opcode === 4112) {
                        // append_char
                        isp--;
                        const var283 = this.intStack[isp];
                        ssp--;
                        const var284 = this.stringStack[ssp];
                        if (var283 === -1) {
                            throw new Error('null char');
                        }
                        this.stringStack[ssp++] = JagString.wrap(var284!).appendChar(var283).toString();
                        continue;
                    }
                    if (opcode === 4113) {
                        // char_isprintable
                        isp--;
                        const var285 = this.intStack[isp];
                        this.intStack[isp++] = JagString.isPrintableChar(var285) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4114) {
                        // char_isalphanumeric
                        isp--;
                        const var286 = this.intStack[isp];
                        this.intStack[isp++] = JagString.isAlphanumericChar(var286) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4115) {
                        // char_isalpha
                        isp--;
                        const var287 = this.intStack[isp];
                        this.intStack[isp++] = JagString.isLetterChar(var287) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4116) {
                        // char_isnumeric
                        isp--;
                        const var288 = this.intStack[isp];
                        this.intStack[isp++] = JagString.isDigitChar(var288) ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4117) {
                        // string_length
                        ssp--;
                        const var289 = this.stringStack[ssp];
                        if (var289 === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = Number(JagString.wrap(var289).length);
                        }
                        continue;
                    }
                    if (opcode === 4118) {
                        // substring
                        isp -= 2;
                        ssp--;
                        const var290 = JagString.wrap(this.stringStack[ssp]!);
                        const var291 = this.intStack[isp + 1];
                        const var292 = this.intStack[isp];
                        this.stringStack[ssp++] = var290.substring(var292, var291).toString();
                        continue;
                    }
                    if (opcode === 4119) {
                        // removetags
                        ssp--;
                        const var293 = JagString.wrap(this.stringStack[ssp]!);
                        const var294 = JagString.newStringBuilder(Number(var293.length));
                        let var295 = false;
                        for (let var296 = 0; var293.length > var296; var296++) {
                            const var297 = var293.charAt(var296);
                            if (var297 === 60) {
                                var295 = true;
                            } else if (var297 === 62) {
                                var295 = false;
                            } else if (!var295) {
                                var294.append(var297);
                            }
                        }
                        var294.compact();
                        this.stringStack[ssp++] = var294.toString();
                        continue;
                    }
                    if (opcode === 4120) {
                        // string_indexof_char
                        isp -= 2;
                        ssp--;
                        const var298 = JagString.wrap(this.stringStack[ssp]!);
                        const var299 = this.intStack[isp];
                        const var300 = this.intStack[isp + 1];
                        this.intStack[isp++] = var298.indexOfChar(var299, var300);
                        continue;
                    }
                    if (opcode === 4121) {
                        ssp -= 2;
                        const var301 = JagString.wrap(this.stringStack[ssp + 1]!);
                        isp--;
                        const var302 = this.intStack[isp];
                        const var303 = JagString.wrap(this.stringStack[ssp]!);
                        this.intStack[isp++] = var303.indexOfFrom(var302, var301);
                        continue;
                    }
                    if (opcode === 4122) {
                        isp--;
                        const var304 = this.intStack[isp];
                        this.intStack[isp++] = JagString.toLowerCaseChar(var304);
                        continue;
                    }
                    if (opcode === 4123) {
                        isp--;
                        const var305 = this.intStack[isp];
                        this.intStack[isp++] = JagString.toUpperCaseChar(var305);
                        continue;
                    }
                } else if (opcode < 4300) {
                    if (opcode === 4200) {
                        // oc_name
                        isp--;
                        const var160 = this.intStack[isp];
                        this.stringStack[ssp++] = ObjType.list(var160).name;
                        continue;
                    }
                    if (opcode === 4201) {
                        // oc_op
                        isp -= 2;
                        const var161 = this.intStack[isp];
                        const var162 = this.intStack[isp + 1];
                        const var163 = ObjType.list(var161);
                        if (var162 >= 1 && var162 <= 5 && var163.op![var162 - 1] !== null) {
                            this.stringStack[ssp++] = var163.op![var162 - 1];
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 4202) {
                        // oc_iop
                        isp -= 2;
                        const var164 = this.intStack[isp + 1];
                        const var165 = this.intStack[isp];
                        const var166 = ObjType.list(var165);
                        if (var164 >= 1 && var164 <= 5 && var166.iop![var164 - 1] !== null) {
                            this.stringStack[ssp++] = var166.iop![var164 - 1];
                            continue;
                        }
                        this.stringStack[ssp++] = '';
                        continue;
                    }
                    if (opcode === 4203) {
                        // oc_cost
                        isp--;
                        const var167 = this.intStack[isp];
                        this.intStack[isp++] = ObjType.list(var167).cost;
                        continue;
                    }
                    if (opcode === 4204) {
                        // oc_stackable
                        isp--;
                        const var168 = this.intStack[isp];
                        this.intStack[isp++] = ObjType.list(var168).stackable === 1 ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4205) {
                        // oc_cert
                        isp--;
                        const var169 = this.intStack[isp];
                        const var170 = ObjType.list(var169);
                        if (var170.certtemplate === -1 && var170.certlink >= 0) {
                            this.intStack[isp++] = var170.certlink;
                            continue;
                        }
                        this.intStack[isp++] = var169;
                        continue;
                    }
                    if (opcode === 4206) {
                        // oc_uncert
                        isp--;
                        const var171 = this.intStack[isp];
                        const var172 = ObjType.list(var171);
                        if (var172.certtemplate >= 0 && var172.certlink >= 0) {
                            this.intStack[isp++] = var172.certlink;
                            continue;
                        }
                        this.intStack[isp++] = var171;
                        continue;
                    }
                    if (opcode === 4207) {
                        // oc_members
                        isp--;
                        const var173 = this.intStack[isp];
                        this.intStack[isp++] = ObjType.list(var173).members ? 1 : 0;
                        continue;
                    }
                    if (opcode === 4208) {
                        isp -= 2;
                        const var174 = this.intStack[isp + 1];
                        const var175 = this.intStack[isp];
                        const var176 = ParamType.list(var174);
                        if (var176.isString()) {
                            this.stringStack[ssp++] = ObjType.list(var175).getParamString(var176.defaultString, var174);
                        } else {
                            this.intStack[isp++] = ObjType.list(var175).getParamInt(var174, var176.defaultInt);
                        }
                        continue;
                    }
                    if (opcode === 4210) {
                        isp--;
                        const var177 = this.intStack[isp];
                        ssp--;
                        const var178 = this.stringStack[ssp]!;
                        ObjType.method467(var177 === 1, var178);
                        this.intStack[isp++] = ObjType.field3893;
                        continue;
                    }
                    if (opcode === 4211) {
                        if (ObjType.field1210 !== null && ObjType.field3893 > ObjType.field2107) {
                            this.intStack[isp++] = ObjType.field1210[ObjType.field2107++] & 0xffff;
                            continue;
                        }
                        this.intStack[isp++] = -1;
                        continue;
                    }
                    if (opcode === 4212) {
                        ObjType.field2107 = 0;
                        continue;
                    }
                } else if (opcode < 4400) {
                    if (opcode === 4300) {
                        isp -= 2;
                        const var179 = this.intStack[isp];
                        const var180 = this.intStack[isp + 1];
                        const var181 = ParamType.list(var180);
                        if (var181.isString()) {
                            this.stringStack[ssp++] = NpcType.list(var179).getParamString(var180, var181.defaultString);
                        } else {
                            this.intStack[isp++] = NpcType.list(var179).getParamInt(var181.defaultInt, var180);
                        }
                        continue;
                    }
                } else if (opcode < 4500) {
                    if (opcode === 4400) {
                        isp -= 2;
                        const var251 = this.intStack[isp];
                        const var252 = this.intStack[isp + 1];
                        const var253 = ParamType.list(var252);
                        if (var253.isString()) {
                            this.stringStack[ssp++] = LocType.list(var251).getParamString(var253.defaultString, var252);
                        } else {
                            this.intStack[isp++] = LocType.list(var251).getParamInt(var253.defaultInt, var252);
                        }
                        continue;
                    }
                } else if (opcode < 4600) {
                    if (opcode === 4500) {
                        isp -= 2;
                        const var248 = this.intStack[isp + 1];
                        const var249 = this.intStack[isp];
                        const var250 = ParamType.list(var248);
                        if (var250.isString()) {
                            this.stringStack[ssp++] = StructType.list(var249).getParamString(var250.defaultString, var248);
                        } else {
                            this.intStack[isp++] = StructType.list(var249).getParamInt(var250.defaultInt, var248);
                        }
                        continue;
                    }
                } else if (opcode < 5100) {
                    if (opcode === 5000) {
                        // chat_getfilter_public
                        this.intStack[isp++] = Client.chatPublicMode;
                        continue;
                    }
                    if (opcode === 5001) {
                        // chat_setfilter
                        isp -= 3;
                        Client.chatPublicMode = this.intStack[isp];
                        Client.chatPrivateMode = this.intStack[isp + 1];
                        Client.chatTradeMode = this.intStack[isp + 2];
                        Client.out.p1Enc(ClientProt.SET_CHATFILTERSETTINGS);
                        Client.out.p1(Client.chatPublicMode);
                        Client.out.p1(Client.chatPrivateMode);
                        Client.out.p1(Client.chatTradeMode);
                        continue;
                    }
                    if (opcode === 5002) {
                        // chat_sendabusereport
                        isp -= 2;
                        const var182 = this.intStack[isp];
                        ssp--;
                        const var183 = this.stringStack[ssp]!;
                        const var184 = this.intStack[isp + 1];
                        // DO NOT SEND abuse report: server 99 = 4-byte mouse tracker; the
                        // rev-500 10-byte body poisons the stream. (No server handler anyway.)
                        void var182;
                        void var183;
                        void var184;
                        continue;
                    }
                    if (opcode === 5003) {
                        // chat_gethistory_bytypeandline
                        isp--;
                        const var185 = this.intStack[isp];
                        let var186: string | null = null;
                        if (var185 < 100) {
                            var186 = Client.chatText[var185];
                        }
                        if (var186 === null) {
                            var186 = '';
                        }
                        this.stringStack[ssp++] = var186;
                        continue;
                    }
                    if (opcode === 5004) {
                        // chat_gethistory_byuid
                        let var187 = -1;
                        isp--;
                        const var188 = this.intStack[isp];
                        if (var188 < 100 && Client.chatText[var188] !== null) {
                            var187 = Client.chatType[var188];
                        }
                        this.intStack[isp++] = var187;
                        continue;
                    }
                    if (opcode === 5005) {
                        // chat_getfilter_private
                        this.intStack[isp++] = Client.chatPrivateMode;
                        continue;
                    }
                    if (opcode === 5008) {
                        // chat_sendpublic
                        ssp--;
                        let var189 = this.stringStack[ssp]!;
                        if (var189.startsWith('::')) {
                            Client.doCheat(var189);
                            continue;
                        }
                        if (Client.staffmodlevel === 0 && (Client.underage === 1 || Client.mapQuickchat === 1)) {
                            continue;
                        }
                        const var190 = var189.toLowerCase();
                        let var191 = 0;
                        if (var190.startsWith(Text.chatcol0)) {
                            var189 = var189.substring(Text.chatcol0.length);
                            var191 = 0;
                        } else if (var190.startsWith(Text.chatcol1)) {
                            var191 = 1;
                            var189 = var189.substring(Text.chatcol1.length);
                        } else if (var190.startsWith(Text.chatcol2)) {
                            var189 = var189.substring(Text.chatcol2.length);
                            var191 = 2;
                        } else if (var190.startsWith(Text.chatcol3)) {
                            var191 = 3;
                            var189 = var189.substring(Text.chatcol3.length);
                        } else if (var190.startsWith(Text.chatcol4)) {
                            var189 = var189.substring(Text.chatcol4.length);
                            var191 = 4;
                        } else if (var190.startsWith(Text.chatcol5)) {
                            var189 = var189.substring(Text.chatcol5.length);
                            var191 = 5;
                        } else if (var190.startsWith(Text.chatcol6)) {
                            var189 = var189.substring(Text.chatcol6.length);
                            var191 = 6;
                        } else if (var190.startsWith(Text.chatcol7)) {
                            var191 = 7;
                            var189 = var189.substring(Text.chatcol7.length);
                        } else if (var190.startsWith(Text.chatcol8)) {
                            var189 = var189.substring(Text.chatcol8.length);
                            var191 = 8;
                        } else if (var190.startsWith(Text.chatcol9)) {
                            var189 = var189.substring(Text.chatcol9.length);
                            var191 = 9;
                        } else if (var190.startsWith(Text.chatcol10)) {
                            var191 = 10;
                            var189 = var189.substring(Text.chatcol10.length);
                        } else if (var190.startsWith(Text.chatcol11)) {
                            var189 = var189.substring(Text.chatcol11.length);
                            var191 = 11;
                        } else if (Client.lang !== 0) {
                            if (var190.startsWith(Text.chatcol0_ger)) {
                                var191 = 0;
                                var189 = var189.substring(Text.chatcol0_ger.length);
                            } else if (var190.startsWith(Text.chatcol1_ger)) {
                                var189 = var189.substring(Text.chatcol1_ger.length);
                                var191 = 1;
                            } else if (var190.startsWith(Text.chatcol2_ger)) {
                                var191 = 2;
                                var189 = var189.substring(Text.chatcol2_ger.length);
                            } else if (var190.startsWith(Text.chatcol3_ger)) {
                                var191 = 3;
                                var189 = var189.substring(Text.chatcol3_ger.length);
                            } else if (var190.startsWith(Text.chatcol4_ger)) {
                                var189 = var189.substring(Text.chatcol4_ger.length);
                                var191 = 4;
                            } else if (var190.startsWith(Text.chatcol5_ger)) {
                                var189 = var189.substring(Text.chatcol5_ger.length);
                                var191 = 5;
                            } else if (var190.startsWith(Text.chatcol6_ger)) {
                                var189 = var189.substring(Text.chatcol6_ger.length);
                                var191 = 6;
                            } else if (var190.startsWith(Text.chatcol7_ger)) {
                                var191 = 7;
                                var189 = var189.substring(Text.chatcol7_ger.length);
                            } else if (var190.startsWith(Text.chatcol8_ger)) {
                                var189 = var189.substring(Text.chatcol8_ger.length);
                                var191 = 8;
                            } else if (var190.startsWith(Text.chatcol9_ger)) {
                                var189 = var189.substring(Text.chatcol9_ger.length);
                                var191 = 9;
                            } else if (var190.startsWith(Text.chatcol10_ger)) {
                                var191 = 10;
                                var189 = var189.substring(Text.chatcol10_ger.length);
                            } else if (var190.startsWith(Text.chatcol11_ger)) {
                                var189 = var189.substring(Text.chatcol11_ger.length);
                                var191 = 11;
                            }
                        }
                        const var192 = var189.toLowerCase();
                        let var193 = 0;
                        if (var192.startsWith(Text.chateffect1)) {
                            var193 = 1;
                            var189 = var189.substring(Text.chateffect1.length);
                        } else if (var192.startsWith(Text.chateffect2)) {
                            var189 = var189.substring(Text.chateffect2.length);
                            var193 = 2;
                        } else if (var192.startsWith(Text.chateffect3)) {
                            var193 = 3;
                            var189 = var189.substring(Text.chateffect3.length);
                        } else if (var192.startsWith(Text.chateffect4)) {
                            var193 = 4;
                            var189 = var189.substring(Text.chateffect4.length);
                        } else if (var192.startsWith(Text.chateffect5)) {
                            var189 = var189.substring(Text.chateffect5.length);
                            var193 = 5;
                        } else if (Client.lang !== 0) {
                            if (var192.startsWith(Text.chateffect1_ger)) {
                                var193 = 1;
                                var189 = var189.substring(Text.chateffect1_ger.length);
                            } else if (var192.startsWith(Text.chateffect2_ger)) {
                                var189 = var189.substring(Text.chateffect2_ger.length);
                                var193 = 2;
                            } else if (var192.startsWith(Text.chateffect3_ger)) {
                                var189 = var189.substring(Text.chateffect3_ger.length);
                                var193 = 3;
                            } else if (var192.startsWith(Text.chateffect4_ger)) {
                                var193 = 4;
                                var189 = var189.substring(Text.chateffect4_ger.length);
                            } else if (var192.startsWith(Text.chateffect5_ger)) {
                                var193 = 5;
                                var189 = var189.substring(Text.chateffect5_ger.length);
                            }
                        }
                        // MESSAGE_PUBLIC
                        Client.out.p1Enc(ClientProt.MESSAGE_PUBLIC);
                        Client.out.p1(0);
                        const var194 = Client.out.pos;
                        Client.out.p1(var191);
                        Client.out.p1(var193);
                        WordPack.pack(Client.out, var189);
                        Client.out.psize1(Client.out.pos - var194);
                        continue;
                    }
                    if (opcode === 5009) {
                        // chat_sendprivate
                        ssp -= 2;
                        const var195 = this.stringStack[ssp]!;
                        const var196 = this.stringStack[ssp + 1]!;
                        if (Client.staffmodlevel !== 0 || (Client.underage !== 1 && Client.mapQuickchat !== 1)) {
                            // MESSAGE_PRIVATE — 464 body: [u8 version/junk][i64 recipient][huffman].
                            // The server skips the leading byte; without it the name reads shifted
                            // and the recipient lookup silently fails.
                            Client.out.p1Enc(ClientProt.MESSAGE_PRIVATE);
                            Client.out.p1(0);
                            const var197 = Client.out.pos;
                            Client.out.p1(0);
                            Client.out.p8(JagString.fromLatin1String(var195).toUserhash());
                            WordPack.pack(Client.out, var196);
                            Client.out.psize1(Client.out.pos - var197);
                        }
                        continue;
                    }
                    if (opcode === 5010) {
                        // chat_sendclan
                        isp--;
                        const var198 = this.intStack[isp];
                        let var199: string | null = null;
                        if (var198 < 100) {
                            var199 = Client.chatUsername[var198];
                        }
                        if (var199 === null) {
                            var199 = '';
                        }
                        this.stringStack[ssp++] = var199;
                        continue;
                    }
                    if (opcode === 5011) {
                        let var200: string | null = null;
                        isp--;
                        const var201 = this.intStack[isp];
                        if (var201 < 100) {
                            var200 = Client.chatScreenName[var201];
                        }
                        if (var200 === null) {
                            var200 = '';
                        }
                        this.stringStack[ssp++] = var200;
                        continue;
                    }
                    if (opcode === 5012) {
                        let var202 = -1;
                        isp--;
                        const var203 = this.intStack[isp];
                        if (var203 < 100) {
                            var202 = Client.field2483[var203];
                        }
                        this.intStack[isp++] = var202;
                        continue;
                    }
                    if (opcode === 5015) {
                        // chat_playername
                        let var204;
                        if (Client.localPlayer === null || Client.localPlayer!.name === null) {
                            var204 = TitleScreen.loginUser;
                        } else {
                            var204 = Client.localPlayer!.name;
                        }
                        this.stringStack[ssp++] = var204;
                        continue;
                    }
                    if (opcode === 5016) {
                        // chat_getfilter_trade
                        this.intStack[isp++] = Client.chatTradeMode;
                        continue;
                    }
                    if (opcode === 5017) {
                        // chat_gethistorylength
                        this.intStack[isp++] = Client.chatHistoryLength;
                        continue;
                    }
                    if (opcode === 5050) {
                        isp--;
                        const var205 = this.intStack[isp];
                        this.stringStack[ssp++] = QuickChatCatType.list(var205).description;
                        continue;
                    }
                    if (opcode === 5051) {
                        isp--;
                        const var206 = this.intStack[isp];
                        const var207 = QuickChatCatType.list(var206);
                        if (var207.subcategoryIds === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = var207.subcategoryIds.length;
                        }
                        continue;
                    }
                    if (opcode === 5052) {
                        isp -= 2;
                        const var208 = this.intStack[isp];
                        const var209 = this.intStack[isp + 1];
                        const var210 = QuickChatCatType.list(var208);
                        const var211 = var210.subcategoryIds![var209];
                        this.intStack[isp++] = var211;
                        continue;
                    }
                    if (opcode === 5053) {
                        isp--;
                        const var212 = this.intStack[isp];
                        const var213 = QuickChatCatType.list(var212);
                        if (var213.phraseIds === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = var213.phraseIds.length;
                        }
                        continue;
                    }
                    if (opcode === 5054) {
                        isp -= 2;
                        const var214 = this.intStack[isp];
                        const var215 = this.intStack[isp + 1];
                        this.intStack[isp++] = QuickChatCatType.list(var214).phraseIds![var215];
                        continue;
                    }
                    if (opcode === 5055) {
                        isp--;
                        const var216 = this.intStack[isp];
                        this.stringStack[ssp++] = QuickChatPhraseType.list(var216).getTextDisplay();
                        continue;
                    }
                    if (opcode === 5056) {
                        isp--;
                        const var217 = this.intStack[isp];
                        const var218 = QuickChatPhraseType.list(var217);
                        if (var218.autoResponses === null) {
                            this.intStack[isp++] = 0;
                        } else {
                            this.intStack[isp++] = var218.autoResponses.length;
                        }
                        continue;
                    }
                    if (opcode === 5057) {
                        isp -= 2;
                        const var219 = this.intStack[isp + 1];
                        const var220 = this.intStack[isp];
                        this.intStack[isp++] = QuickChatPhraseType.list(var220).autoResponses![var219];
                        continue;
                    }
                    if (opcode === 5058) {
                        this.field226 = new QuickChatPhrase();
                        isp--;
                        this.field226.id = this.intStack[isp];
                        this.field226.type = QuickChatPhraseType.list(this.field226.id);
                        this.field226.dynamics = new Int32Array(this.field226.type.length());
                        continue;
                    }
                    // 5059/5060/5061 quickchat — DO NOT SEND: aliased to 202 (server size 0);
                    // the var-byte body poisons the stream. No 464 quickchat exists.
                    if (opcode === 5059) {
                        continue;
                    }
                    if (opcode === 5060) {
                        ssp--;
                        continue;
                    }
                    if (opcode === 5061) {
                        continue;
                    }
                    if (opcode === 5062) {
                        isp -= 2;
                        const var225 = this.intStack[isp + 1];
                        const var226 = this.intStack[isp];
                        this.intStack[isp++] = QuickChatCatType.list(var226).subcategoryShortcuts![var225];
                        continue;
                    }
                    if (opcode === 5063) {
                        isp -= 2;
                        const var227 = this.intStack[isp + 1];
                        const var228 = this.intStack[isp];
                        this.intStack[isp++] = QuickChatCatType.list(var228).phraseShortcuts![var227];
                        continue;
                    }
                    if (opcode === 5064) {
                        isp -= 2;
                        const var229 = this.intStack[isp];
                        const var230 = this.intStack[isp + 1];
                        if (var230 === -1) {
                            this.intStack[isp++] = -1;
                        } else {
                            this.intStack[isp++] = QuickChatCatType.list(var229).getSubcategoryByShortcut(var230);
                        }
                        continue;
                    }
                    if (opcode === 5065) {
                        isp -= 2;
                        const var231 = this.intStack[isp];
                        const var232 = this.intStack[isp + 1];
                        if (var232 === -1) {
                            this.intStack[isp++] = -1;
                        } else {
                            this.intStack[isp++] = QuickChatCatType.list(var231).getPhraseByShortcut(var232);
                        }
                        continue;
                    }
                    if (opcode === 5066) {
                        isp--;
                        const var233 = this.intStack[isp];
                        this.intStack[isp++] = QuickChatPhraseType.list(var233).length();
                        continue;
                    }
                    if (opcode === 5067) {
                        isp -= 2;
                        const var234 = this.intStack[isp];
                        const var235 = this.intStack[isp + 1];
                        const var236 = QuickChatPhraseType.list(var234).getDynamicCommand(var235);
                        this.intStack[isp++] = var236;
                        continue;
                    }
                    if (opcode === 5068) {
                        isp -= 2;
                        const var237 = this.intStack[isp + 1];
                        const var238 = this.intStack[isp];
                        this.field226!.dynamics![var238] = var237;
                        continue;
                    }
                    if (opcode === 5069) {
                        isp -= 2;
                        const var239 = this.intStack[isp];
                        const var240 = this.intStack[isp + 1];
                        this.field226!.dynamics![var239] = var240;
                        continue;
                    }
                    if (opcode === 5070) {
                        isp -= 3;
                        const var241 = this.intStack[isp];
                        const var242 = this.intStack[isp + 1];
                        const var243 = this.intStack[isp + 2];
                        const var244 = QuickChatPhraseType.list(var241);
                        if (var244.getDynamicCommand(var242) !== 0) {
                            throw new Error('bad command');
                        }
                        this.intStack[isp++] = var244.getDynamicCommandParam(var243, var242);
                        continue;
                    }
                } else if (opcode < 5200) {
                    if (opcode === 5100) {
                        if (ClientKeyboardListener.keyHeld[86]) {
                            this.intStack[isp++] = 1;
                        } else {
                            this.intStack[isp++] = 0;
                        }
                        continue;
                    }
                    if (opcode === 5101) {
                        if (ClientKeyboardListener.keyHeld[82]) {
                            this.intStack[isp++] = 1;
                        } else {
                            this.intStack[isp++] = 0;
                        }
                        continue;
                    }
                    if (opcode === 5102) {
                        if (ClientKeyboardListener.keyHeld[81]) {
                            this.intStack[isp++] = 1;
                        } else {
                            this.intStack[isp++] = 0;
                        }
                        continue;
                    }
                } else if (opcode < 5300) {
                    if (opcode === 5200) {
                        isp--;
                        // WorldMap.setZoom(this.intStack[isp]);
                        continue;
                    }
                    if (opcode === 5201) {
                        this.intStack[isp++] = 0; // WorldMap.getZoom();
                        continue;
                    }
                    if (opcode === 5202) {
                        isp--;
                        // WorldMap.flashMapFunction(this.intStack[isp]);
                        continue;
                    }
                    if (opcode === 5203) {
                        ssp--;
                        // WorldMap.jumpToLabel(JagString.wrap(this.stringStack[ssp]!));
                        continue;
                    }
                    if (opcode === 5204) {
                        this.stringStack[ssp - 1] = ''; // WorldMap.getLabelName(JagString.wrap(this.stringStack[ssp - 1]!)).toString();
                        continue;
                    }
                    if (opcode === 5205) {
                        ssp--;
                        // WorldMap.setMap(JagString.wrap(this.stringStack[ssp]!));
                        continue;
                    }
                } else if (opcode < 5400) {
                    if (opcode === 5304) {
                        this.intStack[isp++] = 0;
                        continue;
                    }
                } else if (opcode < 5500) {
                    if (opcode === 5400) {
                        ssp -= 2;
                        const var245 = this.stringStack[ssp]!;
                        const var246 = this.stringStack[ssp + 1]!;
                        isp--;
                        const var247 = this.intStack[isp];
                        // DO NOT SEND url_request: aliased to 202 (server size 0); body poisons.
                        void var245;
                        void var246;
                        void var247;
                        continue;
                    }
                    if (opcode === 5401) {
                        isp -= 2;
                        Client.clientpalette[this.intStack[isp]] = FloType.getColour(this.intStack[isp + 1]);
                        ObjType.resetModelCache();
                        ObjType.resetSpriteCache();
                        NpcType.resetModelCache();
                        NpcType.resetHeadModelCache();
                        Client.redrawAllComponents();
                        continue;
                    }
                }
                throw new Error();
            }
        } catch (e) {
            if (script.name === null) {
                if (Client.modewhere !== 0) {
                    Client.addChat('Clientscript error - check log for details', 0, '');
                }
                JagException.report(`CS2 - scr:${script.key} op:${lastOp}`, e);
            } else {
                let mes = `\n - in: ${script.name}`;
                for (let i = this.fp - 1; i >= 0; i--) {
                    mes += `\n - via: ${this.frames[i]!.script!.name}`;
                }
                if (lastOp === 40) {
                    const procId = intOperands[pc];
                    mes += `\n - non-existant gosub script-num: ${JagString.parseInt(procId).toString()}`;
                }
                if (Client.modewhere !== 0) {
                    Client.addChat('Clientscript error in: ' + script.name, 0, '');
                }
                JagException.report(`CS2 - scr:${script.key} op:${lastOp}${mes}`, e);
            }
        }
    }

    static executeOnLoad(id: number): void {
        if (id === -1 || !IfType.openInterface(id)) {
            return;
        }
        const all = IfType.list[id]!;
        for (let i = 0; i < all.length; i++) {
            const com = all[i];
            if (com.onload !== null) {
                const req = new HookReq();
                req.component = com;
                req.onop = com.onload;
                ScriptRunner.executeScript(req, 2000000);
            }
        }
    }
}
