import type IfType from '#/config/IfType.js';
import Linkable from '#/datastruct/Linkable.js';

// jag::oldscape::HookReq
export default class HookReq extends Linkable {
    onop: (number | string | null)[] | null = null;
    component: IfType | null = null;
    mouseX: number = 0;
    mouseY: number = 0;
    opindex: number = 0;
    drop: IfType | null = null;
    keyCode: number = 0;
    keyChar: number = 0;
    opbase: string | null = null;

    // todo: identify
    field686: boolean = false;
}
