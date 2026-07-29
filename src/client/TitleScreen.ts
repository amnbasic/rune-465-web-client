import { Client } from '#/client/Client.js';
import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';
import ClientMouseListener from '#/client/ClientMouseListener.js';
import GameShell from '#/client/GameShell.js';
import HTTPRequest from '#/client/HTTPRequest.js';
import WorldEntry from '#/client/WorldEntry.js';
import Text from '#/constants/Text.js';
import Pix2D from '#/graphics/Pix2D.js';
import Pix8 from '#/graphics/Pix8.js';
import Pix32 from '#/graphics/Pix32.js';
import PixFont from '#/graphics/PixFont.js';
import PixLoader from '#/graphics/PixLoader.js';
import SoftwarePix32 from '#/graphics/SoftwarePix32.js';
import SoftwarePix8 from '#/graphics/SoftwarePix8.js';
import Packet from '#/io/Packet.js';
import WasdToggle from '#/client/WasdToggle.js';
import JagString from '#/jstring/JagString.js';
import type Js5 from '#/js5/Js5.js';
import Js5Net from '#/js5/Js5Net.js';
import type Js5Loader from '#/js5/Js5Loader.js';
import MidiManager from '#/midi2/MidiManager.js';

// jag::oldscape::TitleScreen
export default class TitleScreen {
    // jag::oldscape::TitleScreen::m_open
    static opened: boolean = false;

    // jag::oldscape::TitleScreen::m_titleBox
    static titleBox: Pix8 | null = null;

    // jag::oldscape::TitleScreen::m_titleBut
    static titleBut: Pix8 | null = null;

    static runes: SoftwarePix8[] | null = null;

    // jag::oldscape::TitleScreen::m_titleBack
    static titleBack: SoftwarePix32 | null = null;

    // jag::oldscape::TitleScreen::m_titleBack2
    static titleBack2: SoftwarePix32 | null = null;

    // jag::oldscape::TitleScreen::m_logo
    static logo: Pix8 | null = null;

    // jag::oldscape::TitleScreen::m_titleMute
    static titleMute: Pix8[] | null = null;

    // jag::oldscape::option::DeviceOptions::GetMuteTitleScreen
    static mute: boolean = false;

    static readonly flameLineOffset: Int32Array = new Int32Array(256);
    static flameGradient: Int32Array | null = null;
    static flameGradient0: Int32Array | null = null;
    static flameGradient1: Int32Array | null = null;
    static flameGradient2: Int32Array | null = null;
    static flameGradientCycle0: number = 0;
    static flameGradientCycle1: number = 0;
    static flameBuffer0: Int32Array | null = null;
    static flameBuffer1: Int32Array | null = null;
    static flameBuffer2: Int32Array | null = null;
    static flameBuffer3: Int32Array | null = null;
    static flameSparks: number = 0;
    static flameCycle: number = 0;
    static loopCycle: number = 0;

    // jag::oldscape::TitleScreen::m_loadPos
    static loadPos: number = 10;

    // jag::oldscape::TitleScreen::m_loadString
    static loadString: string = '';

    // jag::oldscape::TitleScreen::m_loginscreen
    static loginscreen: number = 0;

    // jag::oldscape::TitleScreen::m_loginMes1
    static loginMes1: string = '';

    // jag::oldscape::TitleScreen::m_loginMes2
    static loginMes2: string = '';

    // jag::oldscape::TitleScreen::m_loginMes3
    static loginMes3: string = '';

    // jag::oldscape::TitleScreen::m_loginUser
    static loginUser: string = '';

    // jag::oldscape::TitleScreen::m_loginPass
    static loginPass: string = '';

    // // jag::oldscape::TitleScreen::m_loginSelect
    static loginSelect: number = 0;

    // jag::oldscape::TitleScreen::m_charList
    static readonly charList: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"£$%^&*()-_=+[{]};:\'@#~,<.>/?\\| ';

    // jag::oldscape::TitleScreen::m_switchScreen
    static switchScreen: boolean = false;

    // m_gameworldListDownloadRequest
    static gameworldListDownloadRequest: HTTPRequest | null = null;

    // jag::oldscape::TitleScreen::m_slBack
    static slBack: Pix32[] | null = null;

    // note: worldlistUrl might have been inlined in 500?

    // jag::oldscape::TitleScreen::m_slFlags
    static slFlags: Pix8[] | null = null;

    // jag::oldscape::TitleScreen::m_slArrows
    static slArrows: Pix8[] | null = null;

    // jag::oldscape::TitleScreen::m_slStars
    static slStars: Pix8[] | null = null;

    // jag::oldscape::TitleScreen::m_slButton
    static slButton: Pix8 | null = null;

    // jag::oldscape::GameWorld::m_num
    static num: number = 0;

    // jag::oldscape::GameWorld::m_list
    static list: WorldEntry[] | null = null;

    // jag::oldscape::GameWorld::m_ordering
    static ordering: number[] = [0, 1, 2, 3];

    // jag::oldscape::GameWorld::m_dirs
    static dirs: number[] = [1, 1, 1, 1];

    // jag::oldscape::TitleScreen::m_slLastWorld
    static slLastWorld: number = -1;

    // todo: sort
    static flameCycle0: number = 0;
    static titleLeft: SoftwarePix32 | null = null;
    static titleRight: SoftwarePix32 | null = null;
    static titleJpgId: number = -1;
    static logoId: number = -1;
    static titleboxId: number = -1;
    static titlebuttonId: number = 0;
    static titleMuteId: number = -1;
    static runesId: number = -1;
    static scapeMainId: number = -1;
    static slButtonId: number = -1;
    static slFlagsId: number = -1;
    static slArrowsId: number = -1;
    static slStarsId: number = -1;
    static slBackId: number = -1;

    // jag::oldscape::TitleScreen::ReadyMax
    static readyMax(): number {
        return 6;
    }

    // jag::oldscape::TitleScreen::Close
    static close(): void {
        if (!TitleScreen.opened) {
            return;
        }
        TitleScreen.logo = null;
        TitleScreen.titleLeft = null;
        TitleScreen.runes = null;
        TitleScreen.flameBuffer3 = null;
        TitleScreen.slArrows = null;
        TitleScreen.slFlags = null;
        TitleScreen.titleBox = null;
        TitleScreen.flameGradient2 = null;
        TitleScreen.titleBut = null;
        TitleScreen.slStars = null;
        TitleScreen.titleMute = null;
        TitleScreen.titleBack2 = null;
        TitleScreen.flameGradient0 = null;
        TitleScreen.slBack = null;
        TitleScreen.flameBuffer1 = null;
        TitleScreen.flameGradient = null;
        TitleScreen.titleBack = null;
        TitleScreen.flameBuffer2 = null;
        TitleScreen.flameBuffer0 = null;
        TitleScreen.flameGradient1 = null;
        TitleScreen.slButton = null;
        TitleScreen.titleRight = null;
        MidiManager.fadeStop();
        Js5Net.sendLoginLogoutPacket(true);
        TitleScreen.opened = false;
    }

    static loop(arg0: GameShell): void {
        if (TitleScreen.switchScreen) {
            TitleScreen.worldSwitchLoop(arg0);
            return;
        }
        // WASD toggle sits directly above the mute button. Checked first and as an else-chain so
        // the few rows where its box overlaps the mute button's open region (x>=715, y>=453)
        // belong to the toggle only - the music button's own clicks are untouched.
        if (ClientMouseListener.mouseClickButton === 1 && WasdToggle.hit(ClientMouseListener.mouseClickX, ClientMouseListener.mouseClickY)) {
            Client.setWasdMode(!Client.wasdMode);
        } else if (ClientMouseListener.mouseClickButton === 1 && ClientMouseListener.mouseClickX >= 715 && ClientMouseListener.mouseClickY >= 453) {
            TitleScreen.mute = !TitleScreen.mute;
            if (TitleScreen.mute) {
                MidiManager.stop();
            } else {
                MidiManager.play(Client.songs!, TitleScreen.scapeMainId, 255);
            }
        }
        if (Client.state === 5) {
            return;
        }
        TitleScreen.flameCycle++;
        if (Client.state !== 10) {
            return;
        }
        if (Client.plug !== 2) {
            if (ClientMouseListener.mouseClickButton === 1 && ClientMouseListener.mouseClickX >= 5 && ClientMouseListener.mouseClickX <= 105 && ClientMouseListener.mouseClickY >= 463 && ClientMouseListener.mouseClickY <= 498) {
                TitleScreen.listFetch();
                return;
            }
            if (TitleScreen.gameworldListDownloadRequest !== null) {
                TitleScreen.listFetch();
            }
        }
        const var1 = ClientMouseListener.mouseClickButton;
        const var2 = ClientMouseListener.mouseClickX;
        const var3 = ClientMouseListener.mouseClickY;
        if (TitleScreen.loginscreen === 0) {
            if (var1 === 1 && var2 >= 227 && var2 <= 377 && var3 >= 271 && var3 <= 311) {
                TitleScreen.loginSelect = 0;
                TitleScreen.loginscreen = 3;
            }
            let var4 = false;
            if (Client.modewhere !== 0) {
                while (ClientKeyboardListener.pollKey()) {
                    if (ClientKeyboardListener.code === 84) {
                        var4 = true;
                        break;
                    }
                }
            }
            if (var4 || (var1 === 1 && var2 >= 387 && var2 <= 537 && var3 >= 271 && var3 <= 311)) {
                TitleScreen.loginscreen = 2;
                TitleScreen.loginMes3 = Text.pleaselogin3;
                TitleScreen.loginMes1 = Text.pleaselogin1;
                TitleScreen.loginSelect = 0;
                TitleScreen.loginMes2 = Text.pleaselogin2;
            }
        } else if (TitleScreen.loginscreen === 2) {
            let var5 = 231;
            let var8 = var5 + 30;
            if (var1 === 1 && var3 >= 246 && var3 < 261) {
                TitleScreen.loginSelect = 0;
            }
            var8 += 15;
            if (var1 === 1 && var3 >= 261 && var3 < 276) {
                TitleScreen.loginSelect = 1;
            }
            var8 += 15;
            if (var1 === 1 && var2 >= 227 && var2 <= 377 && var3 >= 301 && var3 <= 341) {
                TitleScreen.loginUser = JagString.fromLatin1String(TitleScreen.loginUser).toCleanUsername().toScreenName().toString();
                if (TitleScreen.loginUser.length === 0) {
                    TitleScreen.loginMes(Text.login_user_length_c, Text.login_user_length_a, Text.login_user_length_b);
                } else if (TitleScreen.loginPass.length === 0) {
                    TitleScreen.loginMes(Text.login_pass_length_c, Text.login_pass_length_a, Text.login_pass_length_b);
                } else {
                    TitleScreen.loginMes(Text.connecting3, Text.connecting1, Text.connecting2);
                    Client.setMainState(20);
                }
            } else {
                if (var1 === 1 && var2 >= 387 && var2 <= 537 && var3 >= 301 && var3 <= 341) {
                    TitleScreen.loginUser = '';
                    TitleScreen.loginscreen = 0;
                    TitleScreen.loginPass = '';
                }
                while (true) {
                    let var6: boolean;
                    label226: do {
                        while (ClientKeyboardListener.pollKey()) {
                            var6 = false;
                            for (let var7 = 0; var7 < TitleScreen.charList.length; var7++) {
                                if (ClientKeyboardListener.ch === TitleScreen.charList.charCodeAt(var7)) {
                                    var6 = true;
                                    break;
                                }
                            }
                            if (TitleScreen.loginSelect !== 0) {
                                continue label226;
                            }
                            if (ClientKeyboardListener.code === 85 && TitleScreen.loginUser.length > 0) {
                                TitleScreen.loginUser = TitleScreen.loginUser.substring(0, TitleScreen.loginUser.length - 1);
                            }
                            if (ClientKeyboardListener.code === 84 || ClientKeyboardListener.code === 80) {
                                TitleScreen.loginSelect = 1;
                            }
                            if (var6 && TitleScreen.loginUser.length < 12) {
                                TitleScreen.loginUser += String.fromCharCode(ClientKeyboardListener.ch);
                            }
                        }
                        return;
                    } while (TitleScreen.loginSelect !== 1);
                    if (ClientKeyboardListener.code === 85 && TitleScreen.loginPass.length > 0) {
                        TitleScreen.loginPass = TitleScreen.loginPass.substring(0, TitleScreen.loginPass.length - 1);
                    }
                    if (ClientKeyboardListener.code === 84 || ClientKeyboardListener.code === 80) {
                        TitleScreen.loginSelect = 0;
                    }
                    if (Client.modewhere !== 0 && ClientKeyboardListener.code === 84) {
                        TitleScreen.loginUser = JagString.fromLatin1String(TitleScreen.loginUser).toCleanUsername().toScreenName().toString();
                        if (TitleScreen.loginUser.length === 0) {
                            TitleScreen.loginMes(Text.login_user_length_c, Text.login_user_length_a, Text.login_user_length_b);
                            return;
                        }
                        if (TitleScreen.loginPass.length === 0) {
                            TitleScreen.loginMes(Text.login_pass_length_c, Text.login_pass_length_a, Text.login_pass_length_b);
                            return;
                        }
                        TitleScreen.loginMes(Text.connecting3, Text.connecting1, Text.connecting2);
                        Client.setMainState(20);
                        return;
                    }
                    if (var6 && TitleScreen.loginPass.length < 20) {
                        TitleScreen.loginPass += String.fromCharCode(ClientKeyboardListener.ch);
                    }
                }
            }
        } else if (TitleScreen.loginscreen === 3 && var1 === 1 && var2 >= 307 && var2 <= 457 && var3 >= 301 && var3 <= 341) {
            TitleScreen.loginscreen = 0;
        }
    }

    // jag::oldscape::TitleScreen::Draw
    static draw(arg0: PixFont, arg1: PixFont): void {
        if (TitleScreen.switchScreen) {
            TitleScreen.worldSwitchRender(arg0, arg1);
            return;
        }
        if (Client.state === 0 || Client.state === 5) {
            arg1.centreString(Text.loading_title, 382, 225, 0xffffff, -1);
            Pix2D.drawRect(230, 233, 304, 34, 0x8c1111);
            Pix2D.drawRect(231, 234, 302, 32, 0x0);
            Pix2D.fillRect(232, 235, TitleScreen.loadPos * 3, 30, 0x8c1111);
            Pix2D.fillRect(TitleScreen.loadPos * 3 + 232, 235, 300 - TitleScreen.loadPos * 3, 30, 0x0);
            arg1.centreString(TitleScreen.loadString, 382, 256, 0xffffff, -1);
        }
        if (Client.state === 20) {
            TitleScreen.titleBox!.plotSprite(382 - ((TitleScreen.titleBox!.wi / 2) | 0), 271 - ((TitleScreen.titleBox!.hi / 2) | 0));
            arg1.centreString(TitleScreen.loginMes1, 382, 211, 0xffff00, 0x0);
            arg1.centreString(TitleScreen.loginMes2, 382, 226, 0xffff00, 0x0);
            arg1.centreString(TitleScreen.loginMes3, 382, 241, 0xffff00, 0x0);
            arg1.drawString(`${Text.usernameprompt}${TitleScreen.loginUser}`, 272, 266, 0xffffff, 0x0);
            arg1.drawString(`${Text.passwordprompt}${'*'.repeat(TitleScreen.loginPass.length)}`, 274, 281, 0xffffff, 0x0);
        }
        if (Client.state === 10) {
            TitleScreen.titleBox!.plotSprite(202, 171);
            if (TitleScreen.loginscreen === 0) {
                arg1.centreString(Text.welcometorunescape, 382, 251, 0xffff00, 0x0);
                TitleScreen.titleBut!.plotSprite(229, 271);
                arg1.drawStringMultiline(Text.newuser, 229, 271, 144, 40, 0xffffff, 0, 1, 1, 0);
                TitleScreen.titleBut!.plotSprite(389, 271);
                arg1.drawStringMultiline(Text.existinguser, 389, 271, 144, 40, 0xffffff, 0, 1, 1, 0);
            } else if (TitleScreen.loginscreen === 2) {
                arg1.centreString(TitleScreen.loginMes1, 382, 211, 0xffff00, 0x0);
                arg1.centreString(TitleScreen.loginMes2, 382, 226, 0xffff00, 0x0);
                arg1.centreString(TitleScreen.loginMes3, 382, 241, 0xffff00, 0x0);
                const var4 = TitleScreen.loginSelect === 0 && Client.loopCycle % 40 < 20 && GameShell.focus;
                arg1.drawString(`${Text.usernameprompt}${PixFont.escape(TitleScreen.loginUser)}${var4 ? '<col=ffff00>|' : ''}`, 272, 266, 0xffffff, 0x0);
                const var5 = TitleScreen.loginSelect === 1 && Client.loopCycle % 40 < 20 && GameShell.focus;
                arg1.drawString(`${Text.passwordprompt}${'*'.repeat(TitleScreen.loginPass.length)}${var5 ? '<col=ffff00>|' : ''}`, 274, 281, 0xffffff, 0x0);
                TitleScreen.titleBut!.plotSprite(229, 301);
                arg1.centreString(Text.login, 302, 326, 0xffffff, 0x0);
                TitleScreen.titleBut!.plotSprite(389, 301);
                arg1.centreString(Text.cancel, 462, 326, 0xffffff, 0x0);
            } else if (TitleScreen.loginscreen === 3) {
                arg1.centreString(Text.field2921, 382, 211, 0xffff00, 0x0);
                arg1.centreString(Text.field3753, 382, 236, 0xffffff, 0x0);
                arg1.centreString(Text.field1591, 382, 251, 0xffffff, 0x0);
                arg1.centreString(Text.field1152, 382, 266, 0xffffff, 0x0);
                arg1.centreString(Text.field2943, 382, 281, 0xffffff, 0x0);
                TitleScreen.titleBut!.plotSprite(309, 301);
                arg1.centreString(Text.cancel, 382, 326, 0xffffff, 0x0);
            }
        }
        if (Client.modegame !== 1) {
            if (TitleScreen.flameCycle > 0) {
                TitleScreen.updateFlames(TitleScreen.flameCycle);
                TitleScreen.flameCycle = 0;
            }
            TitleScreen.drawFlames();
        }
        TitleScreen.titleMute![TitleScreen.mute ? 1 : 0].plotSprite(725, 463);
        WasdToggle.draw(Client.wasdMode);
        if (Client.state > 5 && Client.plug !== 2) {
            if (TitleScreen.slButton === null) {
                TitleScreen.slButton = PixLoader.makePix8(TitleScreen.slButtonId, Client.sprites!);
            }
            if (TitleScreen.slButton !== null) {
                TitleScreen.slButton.plotSprite(5, 463);
                arg1.centreString(`${Text.world} ${Client.worldid}`, 55, 478, 0xffffff, 0x0);
                if (TitleScreen.gameworldListDownloadRequest !== null) {
                    arg0.centreString(Text.loadingdotdotdot, 55, 492, 0xffffff, 0x0);
                    return;
                }
                arg0.centreString(Text.clicktoswitch, 55, 492, 0xffffff, 0x0);
            }
        }
    }

    // jag::oldscape::TitleScreen::LoginMes
    static loginMes(arg0: string, arg1: string, arg2: string): void {
        TitleScreen.loginMes1 = arg1;
        TitleScreen.loginMes3 = arg0;
        TitleScreen.loginMes2 = arg2;
    }

    // jag::oldscape::TitleFlames::GenerateFlameCoolingMap
    static generateFlameCoolingMap(arg0: SoftwarePix8 | null): void {
        for (let var1 = 0; var1 < TitleScreen.flameBuffer0!.length; var1++) {
            TitleScreen.flameBuffer0![var1] = 0;
        }
        for (let var2 = 0; var2 < 5000; var2++) {
            const var3 = (256 * 128.0 * Math.random()) | 0;
            TitleScreen.flameBuffer0![var3] = (Math.random() * 256.0) | 0;
        }
        for (let var4 = 0; var4 < 20; var4++) {
            for (let var5 = 1; var5 < 255; var5++) {
                for (let var6 = 1; var6 < 127; var6++) {
                    const var7 = (var5 << 7) + var6;
                    TitleScreen.flameBuffer1![var7] = ((TitleScreen.flameBuffer0![var7 - 128] + TitleScreen.flameBuffer0![var7 + 1] + TitleScreen.flameBuffer0![var7 - 1] + TitleScreen.flameBuffer0![var7 - -128]) / 4) | 0;
                }
            }
            const var8 = TitleScreen.flameBuffer0;
            TitleScreen.flameBuffer0 = TitleScreen.flameBuffer1;
            TitleScreen.flameBuffer1 = var8;
        }
        if (arg0 === null) {
            return;
        }
        let var9 = 0;
        for (let var10 = 0; var10 < arg0.hi; var10++) {
            for (let var11 = 0; var11 < arg0.wi; var11++) {
                if (arg0.data[var9++] !== 0) {
                    const var12 = arg0.xof + var11 + 16;
                    const var13 = arg0.yof + var10 + 16;
                    const var14 = var12 + (var13 << 7);
                    TitleScreen.flameBuffer0![var14] = 0;
                }
            }
        }
    }

    // jag::oldscape::TitleFlames::Merge
    static merge(arg0: number, arg1: number, arg2: number): number {
        const var3 = 256 - arg1;
        return ((((arg2 & 0xff00ff) * var3 + arg1 * (arg0 & 0xff00ff)) & 0xff00ff00) + (((arg0 & 0xff00) * arg1 + var3 * (arg2 & 0xff00)) & 0xff0000)) >> 8;
    }

    // jag::oldscape::TitleScreen::WorldSwitchRender
    static worldSwitchRender(arg0: PixFont, arg1: PixFont): void {
        if (TitleScreen.slBack === null) {
            TitleScreen.slBack = PixLoader.makePix32Array(0, Client.sprites!, TitleScreen.slBackId);
        }
        if (TitleScreen.slFlags === null) {
            TitleScreen.slFlags = PixLoader.makePix8Array(TitleScreen.slFlagsId, Client.sprites!, 0);
        }
        if (TitleScreen.slArrows === null) {
            TitleScreen.slArrows = PixLoader.makePix8Array(TitleScreen.slArrowsId, Client.sprites!, 0);
        }
        if (TitleScreen.slStars === null) {
            TitleScreen.slStars = PixLoader.makePix8Array(TitleScreen.slStarsId, Client.sprites!, 0);
        }
        Pix2D.fillRect(0, 23, 765, 480, 0x0);
        Pix2D.method482(0, 0, 138, 23, 0xbd9839, 0x8b6608);
        Pix2D.method482(138, 0, 640, 23, 0x4f4f4f, 0x292929);
        arg1.centreString(Text.selectaworld, 69, 15, 0x0, -1);
        if (TitleScreen.slStars !== null) {
            TitleScreen.slStars[1].plotSprite(140, 1);
            arg0.drawString(Text.membersonlyworld, 152, 10, 0xffffff, -1);
            TitleScreen.slStars[0].plotSprite(140, 12);
            arg0.drawString(Text.freeworld, 152, 21, 0xffffff, -1);
        }
        if (TitleScreen.slArrows !== null) {
            if (TitleScreen.ordering[0] === 0 && TitleScreen.dirs[0] === 0) {
                TitleScreen.slArrows[2].plotSprite(280, 4);
            } else {
                TitleScreen.slArrows[0].plotSprite(280, 4);
            }
            if (TitleScreen.ordering[0] === 0 && TitleScreen.dirs[0] === 1) {
                TitleScreen.slArrows[3].plotSprite(295, 4);
            } else {
                TitleScreen.slArrows[1].plotSprite(295, 4);
            }
            arg1.drawString(Text.sl_world, 312, 17, 0xffffff, -1);
            if (TitleScreen.ordering[0] === 1 && TitleScreen.dirs[0] === 0) {
                TitleScreen.slArrows[2].plotSprite(390, 4);
            } else {
                TitleScreen.slArrows[0].plotSprite(390, 4);
            }
            if (TitleScreen.ordering[0] === 1 && TitleScreen.dirs[0] === 1) {
                TitleScreen.slArrows[3].plotSprite(405, 4);
            } else {
                TitleScreen.slArrows[1].plotSprite(405, 4);
            }
            arg1.drawString(Text.sl_players, 422, 17, 0xffffff, -1);
            if (TitleScreen.ordering[0] === 2 && TitleScreen.dirs[0] === 0) {
                TitleScreen.slArrows[2].plotSprite(500, 4);
            } else {
                TitleScreen.slArrows[0].plotSprite(500, 4);
            }
            if (TitleScreen.ordering[0] === 2 && TitleScreen.dirs[0] === 1) {
                TitleScreen.slArrows[3].plotSprite(515, 4);
            } else {
                TitleScreen.slArrows[1].plotSprite(515, 4);
            }
            arg1.drawString(Text.sl_location, 532, 17, 0xffffff, -1);
            if (TitleScreen.ordering[0] === 3 && TitleScreen.dirs[0] === 0) {
                TitleScreen.slArrows[2].plotSprite(610, 4);
            } else {
                TitleScreen.slArrows[0].plotSprite(610, 4);
            }
            if (TitleScreen.ordering[0] === 3 && TitleScreen.dirs[0] === 1) {
                TitleScreen.slArrows[3].plotSprite(625, 4);
            } else {
                TitleScreen.slArrows[1].plotSprite(625, 4);
            }
            arg1.drawString(Text.sl_type, 642, 17, 0xffffff, -1);
        }
        Pix2D.fillRect(700, 4, 58, 16, 0x0);
        arg0.centreString(Text.cancel, 729, 16, 0xffffff, -1);
        TitleScreen.slLastWorld = -1;
        if (TitleScreen.slBack === null) {
            return;
        }
        let var2 = 24;
        let var3 = 8;
        let var4: number;
        let var5: number;
        do {
            var4 = var2;
            var5 = var3;
            if (TitleScreen.num <= var2 * (var3 - 1)) {
                var3--;
            }
            if (var3 * (var2 - 1) >= TitleScreen.num) {
                var2--;
            }
            if (TitleScreen.num <= (var2 - 1) * var3) {
                var2--;
            }
        } while (var2 !== var4 || var5 !== var3);
        let var6 = ((765 - var3 * 88) / (var3 + 1)) | 0;
        let var7 = ((480 - var2 * 19) / (var2 + 1)) | 0;
        if (var7 > 5) {
            var7 = 5;
        }
        if (var6 > 5) {
            var6 = 5;
        }
        const var8 = ((765 - var6 * (var3 - 1) - var3 * 88) / 2) | 0;
        let var9 = var8;
        const var10 = ((480 - var2 * 19 - var7 * (var2 + -1)) / 2) | 0;
        let var11 = var10 + 23;
        let var12 = 0;
        for (let var13 = 0; var13 < TitleScreen.num; var13++) {
            const var14 = TitleScreen.list![var13];
            let var15 = true;
            let var16 = String(var14.players);
            if (var14.players === -1) {
                var16 = Text.offlineworld;
                var15 = false;
            } else if (var14.players > 1980) {
                var16 = Text.fullworld;
                var15 = false;
            }
            if (ClientMouseListener.mouseX >= var9 && ClientMouseListener.mouseY >= var11 && ClientMouseListener.mouseX < var9 + 88 && ClientMouseListener.mouseY < var11 + 19 && var15) {
                TitleScreen.slLastWorld = var13;
                TitleScreen.slBack[var14.members ? 1 : 0].litPlotSprite(var9, var11);
            } else {
                TitleScreen.slBack[var14.members ? 1 : 0].quickPlotSprite(var9, var11);
            }
            if (TitleScreen.slFlags !== null) {
                TitleScreen.slFlags[var14.country + (var14.members ? 8 : 0)].plotSprite(var9 + 29, var11);
            }
            arg1.centreString(String(var14.id), var9 + 15, 5 + 9 + var11, 0x0, -1);
            arg0.centreString(var16, var9 + 60, var11 - -5 + 9, 0x0fffffff, -1);
            var11 += var7 + 19;
            var12++;
            if (var2 <= var12) {
                var11 = var10 + 23;
                var12 = 0;
                var9 += var6 + 88;
            }
        }
    }

    // jag::oldscape::TitleScreen::WorldSwitchLoop
    static worldSwitchLoop(_arg0: GameShell): void {
        if (ClientMouseListener.mouseClickButton !== 1) return;
        if (ClientMouseListener.mouseClickX >= 280 && ClientMouseListener.mouseClickX <= 294 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(0, 0);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 295 && ClientMouseListener.mouseClickX <= 360 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(0, 1);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 390 && ClientMouseListener.mouseClickX <= 404 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(1, 0);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 405 && ClientMouseListener.mouseClickX <= 470 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(1, 1);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 500 && ClientMouseListener.mouseClickX <= 514 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(2, 0);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 515 && ClientMouseListener.mouseClickX <= 580 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(2, 1);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 610 && ClientMouseListener.mouseClickX <= 624 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(3, 0);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 625 && ClientMouseListener.mouseClickX <= 690 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickY <= 18) {
            TitleScreen.listReorder(3, 1);
            return;
        }
        if (ClientMouseListener.mouseClickX >= 700 && ClientMouseListener.mouseClickY >= 4 && ClientMouseListener.mouseClickX <= 758 && ClientMouseListener.mouseClickY <= 20) {
            TitleScreen.switchScreen = false;
            TitleScreen.drawBack();
            return;
        }
        if (TitleScreen.slLastWorld !== -1) {
            const world = TitleScreen.list![TitleScreen.slLastWorld];
            if (Client.memServer === world.members) {
                Client.loginHost = world.host!;
                Client.worldid = world.id;
                if (Client.modewhere !== 0) {
                    Client.modewhere = 0;
                }
                TitleScreen.switchScreen = false;
                TitleScreen.drawBack();
            } else {
                // switching between f2p/p2p loads the selected world directly
                const lang = Client.lang;
                const plug = Client.plug;
                const js = Client.js;
                const site = `${window.location.protocol}//${world.host}/l=${lang}/l${Client.lowMem ? 1 : 0},p${plug},j${js}`;
                globalThis.location.href = site;
            }
        }
    }

    // jag::oldscape::GameWorld::ListFetch
    static listFetch(): void {
        try {
            if (TitleScreen.gameworldListDownloadRequest === null) {
                const lang = Client.lang;
                TitleScreen.gameworldListDownloadRequest = new HTTPRequest(`/l=${lang}/slr2.ws?order=LPWM`);
            } else {
                const var0 = TitleScreen.gameworldListDownloadRequest.getData();
                if (var0 !== null) {
                    const var1 = new Packet(var0);
                    TitleScreen.num = var1.g2();
                    TitleScreen.list = new Array(TitleScreen.num);
                    for (let var2 = 0; var2 < TitleScreen.num; var2++) {
                        const var3 = (TitleScreen.list[var2] = new WorldEntry());
                        const var4 = var1.g2();
                        var3.id = var4 & 0x7fff;
                        var3.members = (var4 & 0x8000) !== 0;
                        var3.host = var1.gjstr();
                        var3.players = var1.g2b();
                        var3.index = var2;
                        var3.country = TitleScreen.getCountry(var1.g2());
                    }
                    TitleScreen.quickSort(0, TitleScreen.list, TitleScreen.list.length - 1);
                    TitleScreen.switchScreen = true;
                }
                TitleScreen.gameworldListDownloadRequest = null;
            }
        } catch {
            TitleScreen.gameworldListDownloadRequest = null;
        }
    }

    // jag::oldscape::GameWorld::ListReorder
    static listReorder(arg0: number, arg1: number): void {
        const var2 = new Array<number>(4);
        let var3 = 1;
        const var4 = new Array<number>(4);
        var4[0] = arg0;
        var2[0] = arg1;
        for (let var5 = 0; var5 < 4; var5++) {
            if (arg0 !== TitleScreen.ordering[var5]) {
                var4[var3] = TitleScreen.ordering[var5];
                var2[var3] = TitleScreen.dirs[var5];
                var3++;
            }
        }
        TitleScreen.dirs = var2;
        TitleScreen.ordering = var4;
        TitleScreen.quickSort(0, TitleScreen.list!, TitleScreen.list!.length - 1);
    }

    // jag::oldscape::GameWorld::QuickSort
    static quickSort(arg0: number, arg1: WorldEntry[], arg2: number): void {
        if (arg2 <= arg0) {
            return;
        }
        let var3 = arg0 - 1;
        const var4 = ((arg0 + arg2) / 2) | 0;
        let var5 = arg2 + 1;
        const var6 = arg1[var4];
        arg1[var4] = arg1[arg0];
        arg1[arg0] = var6;
        while (var3 < var5) {
            let var7 = true;
            do {
                var5--;
                for (let var8 = 0; var8 < 4; var8++) {
                    let var9: number;
                    let var10: number;
                    if (TitleScreen.ordering[var8] === 2) {
                        var10 = arg1[var5].index;
                        var9 = var6.index;
                    } else if (TitleScreen.ordering[var8] === 1) {
                        var9 = var6.players;
                        if (var9 === -1 && TitleScreen.dirs[var8] === 1) {
                            var9 = 2001;
                        }
                        var10 = arg1[var5].players;
                        if (var10 === -1 && TitleScreen.dirs[var8] === 1) {
                            var10 = 2001;
                        }
                    } else if (TitleScreen.ordering[var8] === 3) {
                        var10 = arg1[var5].members ? 1 : 0;
                        var9 = var6.members ? 1 : 0;
                    } else {
                        var10 = arg1[var5].id;
                        var9 = var6.id;
                    }
                    if (var10 !== var9) {
                        if ((TitleScreen.dirs[var8] !== 1 || var10 <= var9) && (TitleScreen.dirs[var8] !== 0 || var10 >= var9)) {
                            var7 = false;
                        }
                        break;
                    }
                    if (var8 === 3) {
                        var7 = false;
                    }
                }
            } while (var7);
            let var11 = true;
            do {
                var3++;
                for (let var12 = 0; var12 < 4; var12++) {
                    let var13: number;
                    let var14: number;
                    if (TitleScreen.ordering[var12] === 2) {
                        var13 = arg1[var3].index;
                        var14 = var6.index;
                    } else if (TitleScreen.ordering[var12] === 1) {
                        var13 = arg1[var3].players;
                        if (var13 === -1 && TitleScreen.dirs[var12] === 1) {
                            var13 = 2001;
                        }
                        var14 = var6.players;
                        if (var14 === -1 && TitleScreen.dirs[var12] === 1) {
                            var14 = 2001;
                        }
                    } else if (TitleScreen.ordering[var12] === 3) {
                        var13 = arg1[var3].members ? 1 : 0;
                        var14 = var6.members ? 1 : 0;
                    } else {
                        var13 = arg1[var3].id;
                        var14 = var6.id;
                    }
                    if (var13 !== var14) {
                        if ((TitleScreen.dirs[var12] !== 1 || var13 >= var14) && (TitleScreen.dirs[var12] !== 0 || var13 <= var14)) {
                            var11 = false;
                        }
                        break;
                    }
                    if (var12 === 3) {
                        var11 = false;
                    }
                }
            } while (var11);
            if (var5 > var3) {
                const var15 = arg1[var3];
                arg1[var3] = arg1[var5];
                arg1[var5] = var15;
            }
        }
        TitleScreen.quickSort(arg0, arg1, var5);
        TitleScreen.quickSort(var5 + 1, arg1, arg2);
    }

    // jag::oldscape::TitleScreen::Open
    static async open(binary: Js5Loader, _component: unknown, sprites: Js5Loader): Promise<void> {
        if (TitleScreen.opened) {
            return;
        }
        Pix2D.cls();
        const var3 = binary.getFile(0, TitleScreen.titleJpgId);
        if (var3 === null) {
            throw new Error('title.jpg is not initialised');
        }
        const titleBack = await SoftwarePix32.fromJpeg(var3);
        TitleScreen.titleBack = titleBack;
        TitleScreen.titleBack2 = TitleScreen.titleBack.copyHFlip();
        TitleScreen.logo = PixLoader.makePix8_(TitleScreen.logoId, sprites);
        TitleScreen.titleBox = PixLoader.makePix8_(TitleScreen.titleboxId, sprites);
        TitleScreen.titleBut = PixLoader.makePix8_(TitleScreen.titlebuttonId, sprites);
        TitleScreen.runes = PixLoader.makeSoftwarePix8Array(sprites, TitleScreen.runesId);
        TitleScreen.titleMute = PixLoader.makePix8Array(sprites, TitleScreen.titleMuteId);
        TitleScreen.flameGradient0 = new Int32Array(256);
        for (let var4 = 0; var4 < 64; var4++) TitleScreen.flameGradient0[var4] = var4 * 262144;
        for (let var5 = 0; var5 < 64; var5++) TitleScreen.flameGradient0[var5 + 64] = var5 * 1024 + 0xff0000;
        for (let var6 = 0; var6 < 64; var6++) TitleScreen.flameGradient0[var6 + 128] = var6 * 4 + 0xffff00;
        for (let var7 = 0; var7 < 64; var7++) TitleScreen.flameGradient0[var7 + 192] = 0xffffff;
        TitleScreen.flameGradient1 = new Int32Array(256);
        for (let var8 = 0; var8 < 64; var8++) TitleScreen.flameGradient1[var8] = var8 * 1024;
        for (let var9 = 0; var9 < 64; var9++) TitleScreen.flameGradient1[var9 + 64] = var9 * 4 + 0xff00;
        for (let var10 = 0; var10 < 64; var10++) TitleScreen.flameGradient1[var10 + 128] = var10 * 262144 + 0xffff;
        for (let var11 = 0; var11 < 64; var11++) TitleScreen.flameGradient1[var11 + 192] = 0xffffff;
        TitleScreen.flameGradient2 = new Int32Array(256);
        for (let var12 = 0; var12 < 64; var12++) TitleScreen.flameGradient2[var12] = var12 * 4;
        for (let var13 = 0; var13 < 64; var13++) TitleScreen.flameGradient2[var13 + 64] = var13 * 262144 + 0xff;
        for (let var14 = 0; var14 < 64; var14++) TitleScreen.flameGradient2[var14 + 128] = var14 * 1024 + 0xff00ff;
        for (let var15 = 0; var15 < 64; var15++) TitleScreen.flameGradient2[var15 + 192] = 0xffffff;
        TitleScreen.flameGradient = new Int32Array(256);
        TitleScreen.flameBuffer0 = new Int32Array(32768);
        TitleScreen.flameBuffer1 = new Int32Array(32768);
        TitleScreen.generateFlameCoolingMap(null);
        TitleScreen.flameBuffer3 = new Int32Array(32768);
        TitleScreen.loginPass = '';
        TitleScreen.loginscreen = 0;
        TitleScreen.switchScreen = false;
        TitleScreen.mute = Client.midiVolume === 0;
        TitleScreen.loginUser = '';
        TitleScreen.flameBuffer2 = new Int32Array(32768);
        if (TitleScreen.mute) {
            MidiManager.fadeStop();
        } else {
            MidiManager.swapSongs(255, TitleScreen.scapeMainId, Client.songs!);
        }
        Js5Net.sendLoginLogoutPacket(false);
        TitleScreen.opened = true;
        TitleScreen.drawBack();
        TitleScreen.titleLeft = new SoftwarePix32(128, 254);
        TitleScreen.titleRight = new SoftwarePix32(128, 254);
    }

    // jag::oldscape::TitleScreen::Ready
    static ready(arg0: Js5, arg1: Js5): number {
        let var2 = 0;
        if (arg0.requestDownload(TitleScreen.titleJpgId)) {
            var2++;
        }
        if (arg1.requestDownload(TitleScreen.logoId)) {
            var2++;
        }
        if (arg1.requestDownload(TitleScreen.titleboxId)) {
            var2++;
        }
        if (arg1.requestDownload(TitleScreen.titlebuttonId)) {
            var2++;
        }
        if (arg1.requestDownload(TitleScreen.runesId)) {
            var2++;
        }
        if (arg1.requestDownload(TitleScreen.titleMuteId)) {
            var2++;
        }
        arg1.requestDownload(TitleScreen.slBackId);
        arg1.requestDownload(TitleScreen.slFlagsId);
        arg1.requestDownload(TitleScreen.slArrowsId);
        arg1.requestDownload(TitleScreen.slStarsId);
        arg1.requestDownload(TitleScreen.slButtonId);
        return var2;
    }

    // ---- todo: unsorted

    static drawBack(): void {
        TitleScreen.titleBack!.quickPlotSprite(0, 0);
        TitleScreen.titleBack2!.quickPlotSprite(382, 0);
        TitleScreen.logo!.plotSprite(382 - ((TitleScreen.logo!.wi / 2) | 0), 18);
    }

    static updateFlames(arg0: number): void {
        TitleScreen.flameCycle0 += arg0 * 128;
        if (TitleScreen.flameCycle0 > TitleScreen.flameBuffer0!.length) {
            TitleScreen.flameCycle0 -= TitleScreen.flameBuffer0!.length;
            const var1 = (Math.random() * 12.0) | 0;
            TitleScreen.generateFlameCoolingMap(TitleScreen.runes![var1]);
        }
        let var2 = 0;
        const var3 = arg0 * 128;
        const var4 = (256 - arg0) * 128;
        for (let var5 = 0; var5 < var4; var5++) {
            let var6 = (TitleScreen.flameBuffer2![var3 + var2] - (arg0 * TitleScreen.flameBuffer0![(TitleScreen.flameBuffer0!.length - 1) & (TitleScreen.flameCycle0 + var2)]) / 6) | 0;
            if (var6 < 0) {
                var6 = 0;
            }
            TitleScreen.flameBuffer2![var2++] = var6;
        }
        for (let var7 = 256 - arg0; var7 < 256; var7++) {
            const var8 = var7 * 128;
            for (let var9 = 0; var9 < 128; var9++) {
                const var10 = (Math.random() * 100.0) | 0;
                if (var10 < 50 && var9 > 10 && var9 < 118) {
                    TitleScreen.flameBuffer2![var9 + var8] = 255;
                } else {
                    TitleScreen.flameBuffer2![var8 + var9] = 0;
                }
            }
        }
        if (TitleScreen.flameGradientCycle1 > 0) {
            TitleScreen.flameGradientCycle1 -= arg0 * 4;
        }
        if (TitleScreen.flameGradientCycle0 > 0) {
            TitleScreen.flameGradientCycle0 -= arg0 * 4;
        }
        if (TitleScreen.flameGradientCycle0 === 0 && TitleScreen.flameGradientCycle1 === 0) {
            const var11 = (Math.random() * ((2000 / arg0) | 0)) | 0;
            if (var11 === 1) {
                TitleScreen.flameGradientCycle1 = 1024;
            }
            if (var11 === 0) {
                TitleScreen.flameGradientCycle0 = 1024;
            }
        }
        for (let var12 = 0; var12 < 256 - arg0; var12++) {
            TitleScreen.flameLineOffset[var12] = TitleScreen.flameLineOffset[arg0 + var12];
        }
        for (let var13 = 256 - arg0; var13 < 256; var13++) {
            TitleScreen.flameLineOffset[var13] = (Math.sin(TitleScreen.loopCycle / 14.0) * 16.0 + Math.sin(TitleScreen.loopCycle / 15.0) * 14.0 + Math.sin(TitleScreen.loopCycle / 16.0) * 12.0) | 0;
            TitleScreen.loopCycle++;
        }
        TitleScreen.flameSparks += arg0;
        const var14 = (((Client.loopCycle & 0x1) + arg0) / 2) | 0;
        if (var14 <= 0) {
            return;
        }
        for (let var15 = 0; var15 < TitleScreen.flameSparks * 100; var15++) {
            const var16 = ((Math.random() * 124.0) | 0) + 2;
            const var17 = ((Math.random() * 128.0) | 0) + 128;
            TitleScreen.flameBuffer2![var16 + (var17 << 7)] = 192;
        }
        TitleScreen.flameSparks = 0;
        for (let var18 = 0; var18 < 256; var18++) {
            let var19 = 0;
            const var20 = var18 * 128;
            for (let var21 = -var14; var21 < 128; var21++) {
                if (var14 + var21 < 128) {
                    var19 += TitleScreen.flameBuffer2![var20 + var21 + var14];
                }
                if (var21 - var14 - 1 >= 0) {
                    var19 -= TitleScreen.flameBuffer2![var21 + var20 - var14 - 1];
                }
                if (var21 >= 0) {
                    TitleScreen.flameBuffer3![var21 + var20] = (var19 / (var14 * 2 + 1)) | 0;
                }
            }
        }
        for (let var22 = 0; var22 < 128; var22++) {
            let var23 = 0;
            for (let var24 = -var14; var24 < 256; var24++) {
                const var25 = var24 * 128;
                if (var14 + var24 < 256) {
                    var23 += TitleScreen.flameBuffer3![var14 * 128 + var22 + var25];
                }
                if (var24 - var14 - 1 >= 0) {
                    var23 -= TitleScreen.flameBuffer3![var22 + var25 - var14 * 128 - 128];
                }
                if (var24 >= 0) {
                    TitleScreen.flameBuffer2![var25 + var22] = (var23 / (var14 * 2 + 1)) | 0;
                }
            }
        }
    }

    static drawFlames(): void {
        if (TitleScreen.flameGradientCycle0 > 0) {
            for (let var0 = 0; var0 < 256; var0++) {
                if (TitleScreen.flameGradientCycle0 > 768) {
                    TitleScreen.flameGradient![var0] = TitleScreen.merge(TitleScreen.flameGradient1![var0], 1024 - TitleScreen.flameGradientCycle0, TitleScreen.flameGradient0![var0]);
                } else if (TitleScreen.flameGradientCycle0 <= 256) {
                    TitleScreen.flameGradient![var0] = TitleScreen.merge(TitleScreen.flameGradient0![var0], 256 - TitleScreen.flameGradientCycle0, TitleScreen.flameGradient1![var0]);
                } else {
                    TitleScreen.flameGradient![var0] = TitleScreen.flameGradient1![var0];
                }
            }
        } else if (TitleScreen.flameGradientCycle1 > 0) {
            for (let var1 = 0; var1 < 256; var1++) {
                if (TitleScreen.flameGradientCycle1 > 768) {
                    TitleScreen.flameGradient![var1] = TitleScreen.merge(TitleScreen.flameGradient2![var1], 1024 - TitleScreen.flameGradientCycle1, TitleScreen.flameGradient0![var1]);
                } else if (TitleScreen.flameGradientCycle1 <= 256) {
                    TitleScreen.flameGradient![var1] = TitleScreen.merge(TitleScreen.flameGradient0![var1], 256 - TitleScreen.flameGradientCycle1, TitleScreen.flameGradient2![var1]);
                } else {
                    TitleScreen.flameGradient![var1] = TitleScreen.flameGradient2![var1];
                }
            }
        } else {
            for (let var2 = 0; var2 < 256; var2++) {
                TitleScreen.flameGradient![var2] = TitleScreen.flameGradient0![var2];
            }
        }
        let var3 = TitleScreen.titleBack!.wi * 9;
        let var4 = 0;
        let var5 = 0;
        for (let var6 = 1; var6 < 255; var6++) {
            let var7 = (((TitleScreen.flameLineOffset[var6] * (256 - var6)) / 256) | 0) + 22;
            if (var7 < 0) {
                var7 = 0;
            }
            var4 += var7;
            for (let var8 = var7; var8 < 128; var8++) {
                const var9 = TitleScreen.flameBuffer2![var4++];
                const var10 = TitleScreen.titleBack!.data[var3++];
                if (var9 === 0) {
                    TitleScreen.titleLeft!.data[var5++] = var10;
                } else {
                    const var12 = 256 - var9;
                    const var13 = TitleScreen.flameGradient![var9];
                    TitleScreen.titleLeft!.data[var5++] = ((((var13 & 0xff00ff) * var9 + var12 * (var10 & 0xff00ff)) & 0xff00ff00) + ((var12 * (var10 & 0xff00) + (var13 & 0xff00) * var9) & 0xff0000)) >> 8;
                }
            }
            for (let var14 = 0; var14 < var7; var14++) {
                TitleScreen.titleLeft!.data[var5++] = TitleScreen.titleBack!.data[var3++];
            }
            var3 += TitleScreen.titleBack!.wi - 128;
        }
        let var15 = 0;
        let var16 = 0;
        TitleScreen.titleLeft!.quickPlotSprite(0, 9);
        let var17 = TitleScreen.titleBack!.wi * 9 + 128;
        for (let var18 = 1; var18 < 255; var18++) {
            let var19 = (((TitleScreen.flameLineOffset[var18] * (256 - var18)) / 256) | 0) + 22;
            if (var19 < 0) {
                var19 = 0;
            }
            for (let var20 = 0; var20 < var19; var20++) {
                const var10001 = var15++;
                var17--;
                TitleScreen.titleRight!.data[var10001] = TitleScreen.titleBack!.data[var17];
            }
            for (let var21 = var19; var21 < 128; var21++) {
                const var22 = TitleScreen.flameBuffer2![var16++];
                var17--;
                const var23 = TitleScreen.titleBack!.data[var17];
                if (var22 === 0) {
                    TitleScreen.titleRight!.data[var15++] = var23;
                } else {
                    const var25 = 256 - var22;
                    const var26 = TitleScreen.flameGradient![var22];
                    TitleScreen.titleRight!.data[var15++] = ((((var23 & 0xff00) * var25 + var22 * (var26 & 0xff00)) & 0xff0000) + (((var23 & 0xff00ff) * var25 + (var26 & 0xff00ff) * var22) & 0xff00ff00)) >> 8;
                }
            }
            var17 += TitleScreen.titleBack!.wi + 128;
            var16 += var19;
        }
        TitleScreen.titleRight!.quickPlotSprite(637, 9);
    }

    static getGroupIds(arg0: Js5, arg1: Js5, arg2: Js5): void {
        TitleScreen.titleJpgId = arg1.getGroupId('title.jpg');
        TitleScreen.logoId = arg2.getGroupId('logo');
        TitleScreen.titleboxId = arg2.getGroupId('titlebox');
        TitleScreen.titlebuttonId = arg2.getGroupId('titlebutton');
        TitleScreen.runesId = arg2.getGroupId('runes');
        TitleScreen.titleMuteId = arg2.getGroupId('title_mute');
        TitleScreen.slBackId = arg2.getGroupId('sl_back');
        TitleScreen.slFlagsId = arg2.getGroupId('sl_flags');
        TitleScreen.slArrowsId = arg2.getGroupId('sl_arrows');
        TitleScreen.slStarsId = arg2.getGroupId('sl_stars');
        TitleScreen.slButtonId = arg2.getGroupId('sl_button');
        TitleScreen.scapeMainId = arg0.getGroupId('scape main');
    }

    static getCountry(arg0: number): number {
        if (Client.lang === 1) {
            return 7;
        } else if (arg0 === 77) {
            return 1;
        } else if (arg0 === 38) {
            return 2;
        } else if (arg0 === 16) {
            return 3;
        } else if (arg0 === 161) {
            return 4;
        } else if (arg0 === 191) {
            return 5;
        } else if (arg0 === 69) {
            return 6;
        } else {
            return 0;
        }
    }
}
