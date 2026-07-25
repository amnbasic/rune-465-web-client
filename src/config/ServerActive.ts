// jag::oldscape::rs2lib::ServerActive
export default class ServerActive {
    // jag::oldscape::rs2lib::ServerActive::PauseButton
    static pauseButton(eventCode: number): boolean {
        return (eventCode & 0x1) !== 0;
    }

    // jag::oldscape::rs2lib::ServerActive::HasOp
    static hasOp(eventCode: number, arg1: number): boolean {
        return ((arg1 >> (eventCode + 1)) & 0x1) !== 0;
    }

    // jag::oldscape::rs2lib::ServerActive::TargetMask
    static targetMask(eventCode: number): number {
        return (eventCode >> 11) & 0x3f;
    }

    // jag::oldscape::rs2lib::ServerActive::ServerDraggable
    static serverDraggable(eventCode: number): number {
        return (eventCode >> 17) & 0x7;
    }

    // jag::oldscape::rs2lib::ServerActive::IsDragTarget
    static isDragTarget(eventCode: number): boolean {
        return ((eventCode >> 20) & 0x1) !== 0;
    }

    // jag::oldscape::rs2lib::ServerActive::IsUseTarget
    static isUseTarget(eventCode: number): boolean {
        return ((eventCode >> 21) & 0x1) !== 0;
    }

    static isObjSwapEnabled(eventCode: number): boolean {
        return ((eventCode >> 28) & 0x1) !== 0;
    }

    static isObjReplaceEnabled(eventCode: number): boolean {
        return ((eventCode >> 29) & 0x1) !== 0;
    }

    static isObjOpsEnabled(eventCode: number): boolean {
        return ((eventCode >> 30) & 0x1) !== 0;
    }

    static isObjUseEnabled(eventCode: number): boolean {
        return ((eventCode >> 31) & 0x1) !== 0;
    }
}
