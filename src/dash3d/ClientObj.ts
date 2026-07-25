import ObjType from '#/config/ObjType.js';
import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::ClientObj
export default class ClientObj extends ModelSource {
    id: number = 0;
    count: number = 0;

    // todo: sort
    height: number = -32768;

    override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void {
        const var11 = ObjType.list(this.id).getModelLit(this.count, 0, null);
        if (var11 != null) {
            var11.method87(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            this.height = var11.method88();
        }
    }

    override method88(): number {
        return this.height;
    }
}
