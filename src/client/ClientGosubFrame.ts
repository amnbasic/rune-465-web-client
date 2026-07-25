import type ClientScript from '#/client/ClientScript.js';

// jag::game::GoSubFrame, jag::oldscape::ClientGosubFrame
export default class ClientGosubFrame {
    script: ClientScript | null = null;
    pc: number = -1;
    intLocals: Int32Array | null = null;
    stringLocals: (string | null)[] | null = null;
}
