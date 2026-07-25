import type Packet from '#/io/Packet.js';

export default class StockMarketSlot {
    count: number = 0;
    price: number = 0;
    item: number = 0;
    status: number = 0;
    completedCount: number = 0;
    completedGold: number = 0;

    constructor();
    constructor(dat: Packet);
    constructor(dat?: Packet) {
        if (!dat) {
            return;
        }
        this.status = dat.g1b();
        this.item = dat.g2();
        this.price = dat.g4();
        this.count = dat.g4();
        this.completedCount = dat.g4();
        this.completedGold = dat.g4();
    }

    getType(): number {
        return (this.status & 0x8) === 0x8 ? 1 : 0;
    }

    getState(): number {
        return this.status & 0x7;
    }
}
