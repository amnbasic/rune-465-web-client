import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSprite extends TextureOp {
    spriteId: number = -1;
    pixels: Int32Array | null = null;
    width: number = 0;
    height: number = 0;

    constructor() {
        super(0, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310 && this.loadSprite()) {
            if (Texture.height !== this.width && Texture.height === 0) {
                throw new Error('/ by zero');
            }
            let var3 = Math.imul(this.height, Texture.height === this.width ? arg0 : (Math.imul(arg0, this.width) / Texture.height) | 0);
            const var4 = var2[0];
            const var5 = var2[1];
            const var6 = var2[2];
            if (Texture.width === this.height) {
                for (let var10 = 0; var10 < Texture.width; var10++) {
                    const var11 = this.pixels![var3++];
                    var6[var10] = (var11 & 0xff) << 4;
                    var5[var10] = (var11 >> 4) & 0xff0;
                    var4[var10] = (var11 >> 12) & 0xff0;
                }
            } else {
                if (Texture.width === 0) {
                    throw new Error('/ by zero');
                }
                for (let var7 = 0; var7 < Texture.width; var7++) {
                    const var8 = (Math.imul(this.height, var7) / Texture.width) | 0;
                    const var9 = this.pixels![var8 + var3];
                    var6[var7] = (var9 & 0xff) << 4;
                    var5[var7] = (var9 >> 4) & 0xff0;
                    var4[var7] = (var9 >> 12) & 0xff0;
                }
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.spriteId = arg0.g2();
        }
    }

    override getSpriteId(): number {
        return this.spriteId;
    }

    override clearCache(): void {
        super.clearCache();
        this.pixels = null;
    }

    loadSprite(): boolean {
        if (this.pixels !== null) {
            return true;
        } else if (this.spriteId >= 0) {
            const var1 = Texture.width;
            const var2 = Texture.height;
            const var3 = Texture.textureProvider.isLowMem(this.spriteId) ? 64 : 128;
            this.pixels = Texture.textureProvider.getTexels(this.spriteId);
            this.width = var3;
            this.height = var3;
            Texture.setDimensions(var1, var2);
            return this.pixels !== null;
        } else {
            return false;
        }
    }
}
