import Packet from '#/io/Packet.js';

import ModelLit from '#/dash3d/ModelLit.js';
import ModelUnlit from '#/dash3d/ModelUnlit.js';
import PixFont from '#/graphics/PixFont.js';
import PixLoader from '#/graphics/PixLoader.js';
import type Pix8 from '#/graphics/Pix8.js';

import LruCache from '#/datastruct/LruCache.js';

import Pix32 from '#/graphics/Pix32.js';
import SoftwarePix32 from '#/graphics/SoftwarePix32.js';

import NpcType from '#/config/NpcType.js';
import ObjType from '#/config/ObjType.js';
import SeqType from '#/config/SeqType.js';
import Text from '#/constants/Text.js';
import type PlayerModel from '#/dash3d/PlayerModel.js';
import type Js5 from '#/js5/Js5.js';

export default class IfType {
    static spriteCache: LruCache<Pix32> = new LruCache(200);
    static modelCache: LruCache<ModelUnlit | ModelLit> = new LruCache(50);
    static fontCache: LruCache<PixFont> = new LruCache(20);
    static open: boolean[] = [];
    static interfaces: Js5;
    static list: IfType[][] = [];
    static loadingAsset: boolean = false;
    static models: Js5;
    static field1926: Js5;
    static field1176: Js5;
    static readonly EMPTY: string = '';

    animFrame: number = 0;
    animCycle: number = 0;
    parentId: number = -1;
    subId: number = -1;
    layerId: number = -1;
    v3: boolean = false;
    type: number = 0;
    buttonType: number = 0;
    clientCode: number = 0;
    width: number = 0;
    height: number = 0;
    trans: number = 0;
    overLayerId: number = -1;
    x: number = 0;
    y: number = 0;
    renderX: number = 0;
    renderY: number = 0;
    renderWidth: number = 0;
    renderHeight: number = 0;
    drawTime: number = -1;
    drawCount: number = -1;
    scripts: (Int32Array | null)[] | null = null;
    scriptComparator: Int32Array | null = null;
    scriptOperand: Int32Array | null = null;
    scrollWidth: number = 0;
    scrollHeight: number = 0;
    scrollPosX: number = 0;
    scrollPosY: number = 0;
    noClickThrough: boolean = false;
    hide: boolean = false;
    draggable: IfType | null = null;
    linkObjType: Int32Array | null = null;
    linkObjNumber: Int32Array | null = null;
    marginX: number = 0;
    marginY: number = 0;
    invBackgroundX: Int16Array | null = null;
    invBackgroundY: Int16Array | null = null;
    invBackground: Int32Array | null = null;
    iop: (string | null)[] | null = null;
    fill: boolean = false;
    hAlign: number = 0;
    vAlign: number = 0;
    lineHeight: number = 0;
    font: number = -1;
    shadow: boolean = false;
    text: string | null = '';
    text2: string | null = '';
    colour: number = 0;
    colour2: number = 0;
    colourOver: number = 0;
    colour2Over: number = 0;
    graphic: number = -1;
    graphic2: number = -1;
    graphicMaskLineOffsets: Int32Array | null = null;
    graphicMaskLineLengths: Int32Array | null = null;
    rotate: number = 0;
    tiling: boolean = false;
    field3477: boolean = false;
    outline: number = 0;
    shadowColour: number = 0;
    vFlip: boolean = false;
    hFlip: boolean = false;
    model1Type: number = 1;
    model1Id: number = -1;
    model2Id: number = -1;
    model2Type: number = 1;
    modelAnim: number = -1;
    modelAnim2: number = -1;
    modelZoom: number = 100;
    modelXAn: number = 0;
    modelZAn: number = 0;
    modelYAn: number = 0;
    modelXOf: number = 0;
    modelYOf: number = 0;
    field3365: number = 0;
    field3498: number = 0;
    modelBaseWidth: number = 0;
    modelBaseHeight: number = 0;
    modelSpin: number = 0;
    orthog: boolean = false;
    invobject: number = -1;
    invcount: number = 0;
    showCount: boolean = true;
    targetVerb: string | null = '';
    targetBase: string | null = '';
    buttonText: string | null = 'Ok';
    hashook: boolean = false;
    opNames: (string | null)[] | null = null;
    baseOpName: string | null = '';
    eventCode: number = 0;
    hotkeys: Int8Array | null = null;
    dragdeadzone: number = 0;
    dragdeadtime: number = 0;
    draggablebehavior: boolean = false;
    lineWidth: number = 1;
    lineDirection: boolean = false;
    widthAlignment: number = 0;
    heightAlignment: number = 0;
    xAlignment: number = 0;
    yAlignment: number = 0;
    clickTrigger: boolean = false;
    mouseTrigger: boolean = false;
    varTransmitNum: number = 0;
    invTransmitNum: number = 0;
    statTransmitNum: number = 0;
    transmitNum: number = -1;
    subcomponents: IfType[] | null = null;
    onload: (number | string | null)[] | null = null;
    onmouseover: (number | string | null)[] | null = null;
    onmouseleave: (number | string | null)[] | null = null;
    ontargetleave: (number | string | null)[] | null = null;
    ontargetenter: (number | string | null)[] | null = null;
    onvartransmit: (number | string | null)[] | null = null;
    oninvtransmit: (number | string | null)[] | null = null;
    onstocktransmit: (number | string | null)[] | null = null;
    onstattransmit: (number | string | null)[] | null = null;
    onchattransmit: (number | string | null)[] | null = null;
    onfriendtransmit: (number | string | null)[] | null = null;
    onclantransmit: (number | string | null)[] | null = null;
    onmisctransmit: (number | string | null)[] | null = null;
    onkey: (number | string | null)[] | null = null;
    ontimer: (number | string | null)[] | null = null;
    onop: (number | string | null)[] | null = null;
    onmouserepeat: (number | string | null)[] | null = null;
    onclick: (number | string | null)[] | null = null;
    onclickrepeat: (number | string | null)[] | null = null;
    onrelease: (number | string | null)[] | null = null;
    onhold: (number | string | null)[] | null = null;
    ondrag: (number | string | null)[] | null = null;
    ondragcomplete: (number | string | null)[] | null = null;
    onscrollwheel: (number | string | null)[] | null = null;
    ondialogabort: (number | string | null)[] | null = null;
    onsubchange: (number | string | null)[] | null = null;
    onresize: (number | string | null)[] | null = null;
    onvartransmitlist: Int32Array | null = null;
    oninvtransmitlist: Int32Array | null = null;
    onstattransmitlist: Int32Array | null = null;

    static openInterface(arg0: number): boolean {
        if (IfType.open[arg0]) {
            return true;
        }

        if (!IfType.interfaces.requestGroupDownload(arg0)) {
            return false;
        }

        const var1 = IfType.interfaces.getFileIdLimit(arg0);
        if (var1 === 0) {
            IfType.open[arg0] = true;
            return true;
        }

        if (IfType.list[arg0] == null) {
            IfType.list[arg0] = new Array(var1);
        }

        for (let var2 = 0; var2 < var1; var2++) {
            if (IfType.list[arg0][var2] == null) {
                const var3 = IfType.interfaces.getFile(var2, arg0);
                if (var3 !== null) {
                    IfType.list[arg0][var2] = new IfType();
                    IfType.list[arg0][var2].parentId = var2 + (arg0 << 16);
                    if ((var3[0] << 24) >> 24 === -1) {
                        IfType.list[arg0][var2].decode3(new Packet(var3));
                    } else {
                        IfType.list[arg0][var2].decode(new Packet(var3));
                    }
                }
            }
        }

        IfType.open[arg0] = true;
        return true;
    }

    static resetCache(): void {
        IfType.spriteCache.clear();
        IfType.modelCache.clear();
        IfType.fontCache.clear();
    }

    static init(arg0: Js5, arg1: Js5, arg2: Js5, arg3: Js5): void {
        IfType.models = arg3;
        IfType.field1176 = arg0;
        IfType.interfaces = arg1;
        IfType.field1926 = arg2;
        IfType.list = new Array(IfType.interfaces.getGroupCount());
        IfType.open = new Array(IfType.interfaces.getGroupCount()).fill(false);
        (globalThis as unknown as { __if: typeof IfType }).__if = IfType; // DEV probe: raw 465 iface bytes
    }

    static unloadInterface(arg0: number): void {
        if (arg0 === -1 || !IfType.open[arg0]) {
            return;
        }
        IfType.interfaces.discardFiles(arg0);
        if (IfType.list[arg0] == null) {
            return;
        }
        let var1 = true;
        for (let var2 = 0; var2 < IfType.list[arg0].length; var2++) {
            if (IfType.list[arg0][var2] != null) {
                if (IfType.list[arg0][var2].type === 2) {
                    var1 = false;
                } else {
                    IfType.list[arg0][var2] = null as unknown as IfType;
                }
            }
        }
        if (var1) {
            IfType.list[arg0] = null as unknown as IfType[];
        }
        IfType.open[arg0] = false;
    }

    static get(id: number): IfType | null;
    static get(subId: number, id: number): IfType | null;
    static get(arg0: number, arg1?: number): IfType | null {
        if (arg1 !== undefined) {
            const component = this.get(arg1);
            if (arg0 === -1) {
                return component;
            }
            if (component === null || component.subcomponents === null || component.subcomponents.length <= arg0) {
                return null;
            }
            return component.subcomponents[arg0];
        }

        const group = arg0 >> 16;
        const file = arg0 & 0xffff;
        if (!this.list[group] || !this.list[group][file]) {
            if (!this.openInterface(group)) {
                return null;
            }
        }
        return this.list[group][file];
    }

    swapSlots(arg0: number, arg1: number): void {
        const var3 = this.linkObjType![arg1];
        this.linkObjType![arg1] = this.linkObjType![arg0];
        this.linkObjType![arg0] = var3;
        const var4 = this.linkObjNumber![arg1];
        this.linkObjNumber![arg1] = this.linkObjNumber![arg0];
        this.linkObjNumber![arg0] = var4;
    }

    getTempModel(arg0: SeqType | null, arg1: PlayerModel | null, arg2: number, arg3: boolean): ModelLit | null {
        IfType.loadingAsset = false;
        let var5: number;
        let var6: number;
        if (arg3) {
            var5 = this.model2Type;
            var6 = this.model2Id;
        } else {
            var5 = this.model1Type;
            var6 = this.model1Id;
        }
        if (var5 === 0) {
            return null;
        } else if (var5 === 1 && var6 === -1) {
            return null;
        } else if (var5 === 1) {
            let var7 = IfType.modelCache.find(BigInt(var6 + (var5 << 16))) as ModelLit | null;
            if (var7 === null) {
                const var8 = ModelUnlit.load(IfType.models!, var6);
                if (var8 === null) {
                    IfType.loadingAsset = true;
                    return null;
                }
                var7 = var8.light(64, 768, -50, -10, -50);
                IfType.modelCache.put(BigInt((var5 << 16) + var6), var7);
            }
            if (arg0 !== null) {
                var7 = arg0.animateModelWithExtra(arg2, var7);
            }
            return var7;
        } else if (var5 === 2) {
            const var9 = NpcType.list(var6).getHead(arg2, arg0);
            if (var9 === null) {
                IfType.loadingAsset = true;
                return null;
            } else {
                return var9;
            }
        } else if (var5 === 3) {
            if (arg1 === null) {
                return null;
            }
            const var10 = arg1.getHeadModel(arg0, arg2);
            if (var10 === null) {
                IfType.loadingAsset = true;
                return null;
            } else {
                return var10;
            }
        } else if (var5 === 4) {
            const var11 = ObjType.list(var6);
            const var12 = var11.getModelLit(10, arg2, arg0);
            if (var12 === null) {
                IfType.loadingAsset = true;
                return null;
            } else {
                return var12;
            }
        } else if (var5 === 6) {
            const var13 = NpcType.list(var6).getTempModel(null, 0, arg2, arg0);
            if (var13 === null) {
                IfType.loadingAsset = true;
                return null;
            } else {
                return var13;
            }
        } else {
            return null;
        }
    }

    calculateGraphicMask(): boolean {
        if (this.graphicMaskLineOffsets !== null) {
            return true;
        }
        const var1 = PixLoader.makeSoftwarePix8(IfType.field1176, this.graphic);
        if (var1 === null) {
            return false;
        }
        var1.trim();
        this.graphicMaskLineOffsets = new Int32Array(var1.hi);
        this.graphicMaskLineLengths = new Int32Array(var1.hi);
        for (let var2 = 0; var2 < var1.hi; var2++) {
            let var3 = 0;
            let var4 = var1.wi;
            for (let var5 = 0; var5 < var1.wi; var5++) {
                if (var1.data[var5 + var2 * var1.wi] !== 0) {
                    var3 = var5;
                    break;
                }
            }
            for (let var6 = var3; var6 < var1.wi; var6++) {
                if (var1.data[var6 + var1.wi * var2] === 0) {
                    var4 = var6;
                    break;
                }
            }
            this.graphicMaskLineOffsets[var2] = var3;
            this.graphicMaskLineLengths[var2] = var4 - var3;
        }
        return true;
    }

    getInvBackground(arg0: number): Pix32 | null {
        IfType.loadingAsset = false;
        if (arg0 < 0 || this.invBackground!.length <= arg0) {
            return null;
        }

        const var2: number = this.invBackground![arg0];
        if (var2 === -1) {
            return null;
        }

        const var3: Pix32 | null = IfType.spriteCache.find(BigInt(var2));
        if (var3 !== null) {
            return var3;
        }

        const var4: Pix32 | null = PixLoader.makePix32(IfType.field1176, var2, 0);
        if (var4 === null) {
            IfType.loadingAsset = true;
        } else {
            IfType.spriteCache.put(BigInt(var2), var4);
        }
        return var4;
    }

    getGraphic(arg0: boolean): Pix32 | null {
        let var2: number;
        if (arg0) {
            var2 = this.graphic2;
        } else {
            var2 = this.graphic;
        }
        IfType.loadingAsset = false;
        if (var2 === -1) {
            return null;
        }

        const var3 = (BigInt(this.shadowColour) << 40n) + ((this.hFlip ? 1n : 0n) << 39n) + ((this.vFlip ? 1n : 0n) << 38n) + BigInt(var2) + ((this.field3477 ? 1n : 0n) << 35n) + (BigInt(this.outline) << 36n);
        const var5 = IfType.spriteCache.find(var3);
        if (var5 !== null) {
            return var5;
        }

        const var6 = PixLoader.makeSoftwarePix32(IfType.field1176, 0, var2);
        if (var6 === null) {
            IfType.loadingAsset = true;
            return null;
        }

        if (this.vFlip) {
            var6.vflip();
        }
        if (this.hFlip) {
            var6.hflip();
        }
        if (this.outline > 0) {
            var6.untrim(this.outline);
        }
        if (this.outline >= 1) {
            var6.addOutline(1);
        }
        if (this.outline >= 2) {
            var6.addOutline(16777215);
        }
        if (this.shadowColour !== 0) {
            var6.addShadow(this.shadowColour);
        }
        IfType.spriteCache.put(var3, var6);
        return var6;
    }

    decode3(arg0: Packet): void {
        arg0.pos++;
        this.v3 = true;
        this.type = arg0.g1();
        this.clientCode = arg0.g2();
        this.x = arg0.g2b();
        this.y = arg0.g2b();
        this.width = arg0.g2();
        // 465 if3: type 9 (line) height is signed; all other types unsigned
        this.height = this.type === 9 ? arg0.g2b() : arg0.g2();
        // 465 if3 has NO per-component alignment fields (those were added in rev-500).
        // Reading them here consumed 4 phantom bytes, desyncing layerId -> a component
        // became its own parent -> computeLayerLayout recursed forever (the 98% freeze).
        this.widthAlignment = 0;
        this.heightAlignment = 0;
        this.xAlignment = 0;
        this.yAlignment = 0;
        this.layerId = arg0.g2();
        if (this.layerId === 65535) {
            this.layerId = -1;
        } else {
            this.layerId += this.parentId & 0xffff0000;
        }
        this.hide = arg0.g1() === 1;

        if (this.type === 0) {
            this.scrollWidth = arg0.g2();
            this.scrollHeight = arg0.g2();
            // 465 if3: no noClickThrough byte
        }
        if (this.type === 5) {
            this.graphic = arg0.g4();
            this.rotate = arg0.g2();
            const var2 = arg0.g1();
            this.tiling = (var2 & 0x1) !== 0;
            this.field3477 = (var2 & 0x2) !== 0;
            this.trans = arg0.g1();
            this.outline = arg0.g1();
            this.shadowColour = arg0.g4();
            this.vFlip = arg0.g1() === 1;
            this.hFlip = arg0.g1() === 1;
        }
        if (this.type === 6) {
            this.model1Type = 1;
            this.model1Id = arg0.g2();
            if (this.model1Id === 65535) {
                this.model1Id = -1;
            }
            this.modelXOf = arg0.g2b();
            this.modelYOf = arg0.g2b();
            this.modelXAn = arg0.g2();
            this.modelYAn = arg0.g2();
            this.modelZAn = arg0.g2();
            this.modelZoom = arg0.g2();
            this.modelAnim = arg0.g2();
            if (this.modelAnim === 65535) {
                this.modelAnim = -1;
            }
            this.orthog = arg0.g1() === 1;
            // 465 if3: no trailing padding short, no modelBaseWidth/Height fields
        }
        if (this.type === 4) {
            this.font = arg0.g2();
            if (this.font === 65535) {
                this.font = -1;
            }
            this.text = arg0.gjstr();
            this.lineHeight = arg0.g1();
            this.hAlign = arg0.g1();
            this.vAlign = arg0.g1();
            this.shadow = arg0.g1() === 1;
            this.colour = arg0.g4();
        }
        if (this.type === 3) {
            this.colour = arg0.g4();
            this.fill = arg0.g1() === 1;
            this.trans = arg0.g1();
        }
        if (this.type === 9) {
            this.lineWidth = arg0.g1();
            this.colour = arg0.g4();
            // 465 if3: no lineDirection byte
        }

        this.eventCode = arg0.g3();
        // 465 if3: no hotkeys block — the name string comes directly after the flags field
        this.baseOpName = arg0.gjstr();
        const var5 = arg0.g1();
        if (var5 > 0) {
            this.opNames = new Array(var5);
            for (let var6 = 0; var6 < var5; var6++) {
                this.opNames[var6] = arg0.gjstr();
            }
        }
        this.dragdeadzone = arg0.g1();
        this.dragdeadtime = arg0.g1();
        this.draggablebehavior = arg0.g1() === 1;
        this.targetVerb = arg0.gjstr();
        this.onload = this.decodeHook(arg0);
        this.onmouseover = this.decodeHook(arg0);
        this.onmouseleave = this.decodeHook(arg0);
        this.ontargetleave = this.decodeHook(arg0);
        this.ontargetenter = this.decodeHook(arg0);
        this.onvartransmit = this.decodeHook(arg0);
        this.oninvtransmit = this.decodeHook(arg0);
        this.onstattransmit = this.decodeHook(arg0);
        this.ontimer = this.decodeHook(arg0);
        this.onop = this.decodeHook(arg0);
        this.onmouserepeat = this.decodeHook(arg0);
        this.onclick = this.decodeHook(arg0);
        this.onclickrepeat = this.decodeHook(arg0);
        this.onrelease = this.decodeHook(arg0);
        this.onhold = this.decodeHook(arg0);
        this.ondrag = this.decodeHook(arg0);
        this.ondragcomplete = this.decodeHook(arg0);
        this.onscrollwheel = this.decodeHook(arg0);
        this.onvartransmitlist = this.decodeTransmitList(arg0);
        this.oninvtransmitlist = this.decodeTransmitList(arg0);
        this.onstattransmitlist = this.decodeTransmitList(arg0);
    }

    decodeTransmitList(arg0: Packet): Int32Array | null {
        const var2 = arg0.g1();
        if (var2 === 0) {
            return null;
        }

        const var3 = new Int32Array(var2);
        for (let var4 = 0; var4 < var2; var4++) {
            var3[var4] = arg0.g4();
        }
        return var3;
    }

    getFont(arg0: Pix8[]): PixFont | null {
        IfType.loadingAsset = false;
        if (this.font === -1) {
            return null;
        }

        const var2 = IfType.fontCache.find(BigInt(this.font));
        if (var2 !== null) {
            return var2;
        }

        const var3 = PixLoader.makePixFont(0, IfType.field1926, this.font, IfType.field1176);
        if (var3 === null) {
            IfType.loadingAsset = true;
        } else {
            var3.setIcons(arg0, null);
            IfType.fontCache.put(BigInt(this.font), var3);
        }
        return var3;
    }

    setOpName(arg0: string | null, arg1: number): void {
        if (this.opNames === null || arg1 >= this.opNames.length) {
            const var3: Array<string | null> = new Array(arg1 + 1).fill(null);
            if (this.opNames !== null) {
                for (let var4 = 0; var4 < this.opNames.length; var4++) {
                    var3[var4] = this.opNames[var4];
                }
            }
            this.opNames = var3;
        }
        this.opNames[arg1] = arg0;
    }

    decodeHook(arg0: Packet): (number | string | null)[] | null {
        const var2 = arg0.g1();
        if (var2 === 0) {
            return null;
        }

        const var3 = new Array(var2);
        for (let var4 = 0; var4 < var2; var4++) {
            const var5 = arg0.g1();
            if (var5 === 0) {
                var3[var4] = arg0.g4();
            } else if (var5 === 1) {
                var3[var4] = arg0.gjstr();
            }
        }
        this.hashook = true;
        return var3;
    }

    decode(arg0: Packet): void {
        this.v3 = false;
        this.type = arg0.g1();
        this.buttonType = arg0.g1();
        this.clientCode = arg0.g2();
        this.x = arg0.g2b();
        this.y = arg0.g2b();
        this.width = arg0.g2();
        this.height = arg0.g2();
        this.heightAlignment = 0;
        this.widthAlignment = 0;
        this.xAlignment = 0;
        this.yAlignment = 0;
        this.trans = arg0.g1();
        this.layerId = arg0.g2();
        if (this.layerId === 65535) {
            this.layerId = -1;
        } else {
            this.layerId = (this.parentId & 0xffff0000) + this.layerId;
        }
        this.overLayerId = arg0.g2();
        if (this.overLayerId === 65535) {
            this.overLayerId = -1;
        }

        const var2 = arg0.g1();
        if (var2 > 0) {
            this.scriptOperand = new Int32Array(var2);
            this.scriptComparator = new Int32Array(var2);
            for (let var3 = 0; var3 < var2; var3++) {
                this.scriptComparator[var3] = arg0.g1();
                this.scriptOperand[var3] = arg0.g2();
            }
        }

        const var4 = arg0.g1();
        if (var4 > 0) {
            this.scripts = new Array(var4).fill(null);
            for (let var5 = 0; var5 < var4; var5++) {
                const var6 = arg0.g2();
                this.scripts[var5] = new Int32Array(var6);
                for (let var7 = 0; var7 < var6; var7++) {
                    this.scripts[var5]![var7] = arg0.g2();
                    if (this.scripts[var5]![var7] === 65535) {
                        this.scripts[var5]![var7] = -1;
                    }
                }
            }
        }

        if (this.type === 0) {
            this.scrollHeight = arg0.g2();
            this.hide = arg0.g1() === 1;
        }
        if (this.type === 1) {
            arg0.g2();
            arg0.g1();
        }
        if (this.type === 2) {
            this.linkObjType = new Int32Array(this.width * this.height);
            this.linkObjNumber = new Int32Array(this.height * this.width);
            this.heightAlignment = 3;
            this.widthAlignment = 3;
            const var8 = arg0.g1();
            if (var8 === 1) {
                this.eventCode |= 0x10000000;
            }
            const var9 = arg0.g1();
            if (var9 === 1) {
                this.eventCode |= 0x40000000;
            }
            const var10 = arg0.g1();
            if (var10 === 1) {
                this.eventCode |= -2147483648;
            }
            const var11 = arg0.g1();
            if (var11 === 1) {
                this.eventCode |= 0x20000000;
            }
            this.marginX = arg0.g1();
            this.marginY = arg0.g1();
            this.invBackground = new Int32Array(20);
            this.invBackgroundY = new Int16Array(20);
            this.invBackgroundX = new Int16Array(20);
            for (let var12 = 0; var12 < 20; var12++) {
                const var13 = arg0.g1();
                if (var13 === 1) {
                    this.invBackgroundX[var12] = arg0.g2b();
                    this.invBackgroundY[var12] = arg0.g2b();
                    this.invBackground[var12] = arg0.g4();
                } else {
                    this.invBackground[var12] = -1;
                }
            }
            this.iop = new Array(5).fill(null);
            for (let var14 = 0; var14 < 5; var14++) {
                const var15 = arg0.gjstr();
                if (var15.length > 0) {
                    this.iop[var14] = var15;
                    this.eventCode |= 0x1 << (var14 + 23);
                }
            }
        }
        if (this.type === 3) {
            this.fill = arg0.g1() === 1;
        }
        if (this.type === 4 || this.type === 1) {
            this.hAlign = arg0.g1();
            this.vAlign = arg0.g1();
            this.lineHeight = arg0.g1();
            this.font = arg0.g2();
            if (this.font === 65535) {
                this.font = -1;
            }
            this.shadow = arg0.g1() === 1;
        }
        if (this.type === 4) {
            this.text = arg0.gjstr();
            this.text2 = arg0.gjstr();
        }
        if (this.type === 1 || this.type === 3 || this.type === 4) {
            this.colour = arg0.g4();
        }
        if (this.type === 3 || this.type === 4) {
            this.colour2 = arg0.g4();
            this.colourOver = arg0.g4();
            this.colour2Over = arg0.g4();
        }
        if (this.type === 5) {
            this.graphic = arg0.g4();
            this.graphic2 = arg0.g4();
        }
        if (this.type === 6) {
            this.model1Type = 1;
            this.model1Id = arg0.g2();
            this.model2Type = 1;
            if (this.model1Id === 65535) {
                this.model1Id = -1;
            }
            this.model2Id = arg0.g2();
            if (this.model2Id === 65535) {
                this.model2Id = -1;
            }
            this.modelAnim = arg0.g2();
            if (this.modelAnim === 65535) {
                this.modelAnim = -1;
            }
            this.modelAnim2 = arg0.g2();
            if (this.modelAnim2 === 65535) {
                this.modelAnim2 = -1;
            }
            this.modelZoom = arg0.g2();
            this.modelXAn = arg0.g2();
            this.modelYAn = arg0.g2();
        }
        if (this.type === 7) {
            this.heightAlignment = 3;
            this.linkObjType = new Int32Array(this.width * this.height);
            this.widthAlignment = 3;
            this.linkObjNumber = new Int32Array(this.width * this.height);
            this.hAlign = arg0.g1();
            this.font = arg0.g2();
            if (this.font === 65535) {
                this.font = -1;
            }
            this.shadow = arg0.g1() === 1;
            this.colour = arg0.g4();
            this.marginX = arg0.g2b();
            this.marginY = arg0.g2b();
            const var16 = arg0.g1();
            this.iop = new Array(5).fill(null);
            if (var16 === 1) {
                this.eventCode |= 0x40000000;
            }
            for (let var17 = 0; var17 < 5; var17++) {
                const var18 = arg0.gjstr();
                if (var18.length > 0) {
                    this.iop[var17] = var18;
                    this.eventCode |= 0x1 << (var17 + 23);
                }
            }
        }
        if (this.type === 8) {
            this.text = arg0.gjstr();
        }
        if (this.buttonType === 2 || this.type === 2) {
            this.targetVerb = arg0.gjstr();
            this.targetBase = arg0.gjstr();
            const var19 = arg0.g2() & 0x3f;
            this.eventCode |= var19 << 11;
        }
        if (this.buttonType === 1 || this.buttonType === 4 || this.buttonType === 5 || this.buttonType === 6) {
            this.buttonText = arg0.gjstr();
            if (this.buttonText.length === 0) {
                if (this.buttonType === 1) {
                    this.buttonText = Text.ok;
                }
                if (this.buttonType === 4) {
                    this.buttonText = Text.select;
                }
                if (this.buttonType === 5) {
                    this.buttonText = Text.select;
                }
                if (this.buttonType === 6) {
                    this.buttonText = Text.continu;
                }
            }
        }
        if (this.buttonType === 1 || this.buttonType === 4 || this.buttonType === 5) {
            this.eventCode |= 0x400000;
        }
        if (this.buttonType === 6) {
            this.eventCode |= 0x1;
        }
    }
}
