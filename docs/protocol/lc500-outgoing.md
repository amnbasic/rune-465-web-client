# LC500 outgoing (client→server) protocol map

**Goal:** make the LC500 web-client send **464** action opcodes, not the rev-500 ones it
currently emits. The 464 server logged garbage `op_obju` because it read a rev-500 opcode as a
464 opcode of a different size, then desynced the whole stream.

Status: **diagnosis / read-only map.** No code changed. The remap table below is what
`web-client/src/client/ClientProt.ts` must become.

---

## 1. Why the numbers are all that matters (transport is plaintext)

Both sides run **ISAAC disabled**, so the byte on the wire equals the raw `ClientProt` enum value.
There is no scramble/keystream to reconcile — only the opcode *numbering* is wrong.

- Client: `PacketBit.p1Enc(op)` writes `data[pos++] = op + random.takeNextValue()`
  (`web-client/src/io/PacketBit.ts:42`). But `Isaac.takeNextValue()` **hard-returns `0`**
  (`web-client/src/io/Isaac.ts:23-28`, comment: "ISAAC is DISABLED … A zero keystream turns every
  p/gIsaac opcode cipher into a plaintext pass-through"). So `p1Enc(op)` writes `op` verbatim.
  (`Client.out.seed()` at `Client.ts:1621` still runs, but the seeded Isaac emits 0s.)
- Server: reads the opcode byte plaintext and looks it up directly —
  `player.ts:520-527` (`this._activePacketId = buffer.get('byte','u')`; comment line 521: "ISAAC
  intentionally disabled — 464 client patched for plaintext opcodes").

**Consequence:** wire opcode == LC500 `ClientProt` enum value == what the 464 server dispatches on.
`CLIENTPROT_SCRAMBLED` (in `client-ts/.../Protocol.ts`) is **not** applied by LC500 and is a
red herring for this task — LC500 sends the enum value directly via `p1Enc`.

---

## 2. The 464 authority (opcode → handler + size)

Two sources agree and are the target:
- Registered handlers: `server/src/engine/net/handler/**` (`opcode`/`size` on each `export default`).
- Fallback size table for *unregistered* opcodes: `PACKET_SIZES_464`
  (`server/src/engine/net/inbound-packet-handler.ts:36-64`). **-3 = UNKNOWN**, and the decode loop
  treats -3 as "consume ALL remaining bytes + null the buffer" (`player.ts:542-546`) = hard desync.

Sizes below are the **body** size (opcode byte excluded); `-1` = var-byte-length, `-2` = var-short.

| Action | 464 opcode | size | handler file |
|---|---|---|---|
| MOVE_GAMECLICK (map walk) | **143** | -1 | misc/move-click-handler.ts:163 |
| MOVE_MINIMAPCLICK | **50** | -1 | move-click-handler.ts:175 |
| MOVE_OPCLICK (walk+op) | **36** | -1 | move-click-handler.ts:181 |
| NO_TIMEOUT (keepalive) | **7** | 1 | misc/event-tracking-handler.ts:7 |
| IDLE_TIMER | **202** | 0 | event-tracking-handler.ts:23 |
| EVENT_TRACKING / snapshot | **99** | -2 | event-tracking-handler.ts:12 |
| EVENT (mouse/misc tracking) | **174** | -1 | event-tracking-handler.ts:18 |
| EVENT_CAMERA_POSITION | **128** | 4 | event-tracking-handler.ts:40 |
| (quiet no-ops) | 230 / 255 | -1 / 1 | event-tracking-handler.ts:28,34 |
| OPNPC1 | **156** | 2 | interaction/op-npc-handler.ts:144 |
| OPNPC2 | **129** | 2 | op-npc-handler.ts:150 |
| OPNPC3 | **19** | 2 | op-npc-handler.ts:156 |
| OPNPC4 | **51** | 2 | op-npc-handler.ts:162 |
| OPNPC5 | **43** | 2 | op-npc-handler.ts:168 |
| OPNPCU (item on npc) | **187** | 10 | op-npc-u-handler.ts:94 (alt 208) |
| OPNPCT (spell on npc) | **69** | 8 | op-npc-t-handler.ts:51 |
| OPLOC1 | **44** | 6 | op-loc-handler.ts (map :82-86) |
| OPLOC2 | **119** | 6 | op-loc-handler.ts |
| OPLOC3 | **120** | 6 | op-loc-handler.ts |
| OPLOC4 | **127** | 6 | op-loc-handler.ts |
| OPLOC5 | **250** | 6 | op-loc-handler.ts |
| OPLOC examine | **97** | 2 | misc/examine-handler.ts:73 |
| OPLOCU (item on loc) | **103** | 14 | op-loc-u-handler.ts:137 |
| OPLOCT (spell on loc) | **207** | 12 | op-loc-t-handler.ts:94 |
| OPOBJ1-5 (pickup) | **216** | 6 | op-obj-handler.ts:86 |
| OPOBJU (item on ground obj) | **172** | 14 | op-obj-u-handler.ts:66 ← the `op_obju` handler |
| OPOBJT (spell on ground obj) | **152** | 12 | op-obj-t-handler.ts:144 |
| OPOBJ examine | **205** | 2 | examine-handler.ts:68 |
| OPPLAYER attack | **84** | 2 | op-player-handler.ts:115 |
| OPPLAYER follow | **185** | 2 | op-player-handler.ts:103 |
| OPPLAYER opt (alt) | **180** | 2 | op-player-handler.ts:109 |
| OPPLAYERU (item on player) | **110** | 10 | op-player-u-handler.ts:65 |
| OPPLAYERT (spell on player) | **123** | 8 | op-player-t-handler.ts:83 |
| OPHELD1 | **101** | 8 | op-held-handler.ts:525 (also 177) |
| OPHELD2 / equip | **88** | 8 | op-held-handler.ts:527 (WIELD 215, CLICK_2 4) |
| OPHELD3 | **159** | 8 | op-held-handler.ts:528 (also 212) |
| OPHELD4 | **86** | 8 | op-held-handler.ts:529 |
| OPHELD5 | **220** | 8 | op-held-handler.ts:530 |
| OPHELDU (item on item) | **166** | 16 | op-held-u-handler.ts:135 |
| OPHELDT (spell on item) | **163** | 14 | op-held-t-handler.ts:159 |
| OPHELDU-on-floor (use item on floor item) | **63** | 12 | op-held-u-obj-handler.ts:146 |
| IF_BUTTON (simple button) | **153** | 4 | interface/if-button-handler.ts:120 |
| INV_BUTTON1 (opt1) | **113** | 6 | interface/if-button-option-handler.ts:11 |
| INV_BUTTON2 (opt2) | **37** | 6 | if-button-option-handler.ts:12 |
| INV_BUTTON3 (opt3) | **134** | 6 | if-button-option-handler.ts:13 |
| INV_BUTTON4 (opt4) | **137** | 6 | if-button-option-handler.ts:14 |
| INV_BUTTON5 (opt5) | **140** | 6 | if-button-option-handler.ts:15 |
| INV_BUTTOND (swap/drag) | **121** | 9 | inventory/inv-swap-handler.ts:120 |
| IF_BUTTON_D (if3 drag) | **132** | 8 | interface/if-button-d-handler.ts:81 |
| IF_PLAYERDESIGN | **49** | 13 | interface/if-player-design-handler.ts:44 |
| CLOSE_MODAL | **71** | 0 | close-modal-handler.ts:141 |
| RESUME_PAUSEBUTTON (continue) | **240** | 6 | close-modal-handler.ts:146 |
| RESUME_P_COUNTDIALOG (enter amount) | **78** | 4 | resume-p-count-dialog-handler.ts:8 |
| RESUME_P_NAMEDIALOG | **150** | 8 | resume-p-name-dialog-handler.ts:14 |
| INV_DROP (drop/destroy) | **247** | 8 | inventory/inv-drop-handler.ts:98 |
| MESSAGE_PUBLIC | **115** | -1 | message/message-public-handler.ts:42 |
| MESSAGE_PRIVATE | **238** | -1 | message/message-private-handler.ts:7 |
| CHAT_SETMODE | **11** | 3 | message/chat-set-mode-handler.ts:6 |
| FRIENDLIST_ADD | **197** | 8 | social/friend-list-add-handler.ts:6 |
| FRIENDLIST_DEL | **133** | 8 | social/friend-list-del-handler.ts:7 |
| IGNORELIST_ADD | **102** | 8 | social/ignore-list-add-handler.ts:6 |
| IGNORELIST_DEL | **214** | 8 | social/ignore-list-del-handler.ts:6 |
| CLIENT_CHEAT (::cmd) | **165** | -1 | misc/client-cheat-handler.ts:2051 |
| (MOBA skillshot cast) | 60 | 6 | misc/moba-cast-handler.ts:117 |
| (MOBA hud) | 64 | -1 | misc/moba-hud-handler.ts:35 |

The already-464-remapped reference enum lives at `client-ts/src/jagex2/io/ClientProt.ts` (uses the
same 464 numbers) — use it as a cross-check, but the server handler files are the true authority.

---

## 3. LC500's current (rev-500) opcodes — WRONG for 464

Source: `web-client/src/client/ClientProt.ts` (rev-500 `const enum`), written out by
`Client.ts` / `ScriptRunner.ts` via `Client.out.p1Enc(...)`.

| Symbol | LC500 (rev-500) | 464 target | What 464 does with the rev-500 value TODAY |
|---|---|---|---|
| NO_TIMEOUT | 19 | **7** | 19 = **OPNPC3** (size 2) → eats 2 stray bytes + fires phantom npc-op |
| IDLE_TIMER | 226 | **202** | 226 = -3 → **consume-all / desync** |
| EVENT_CAMERA_POSITION | 173 | **128** | 173 = -3 → consume-all |
| EVENT_MOUSE_MOVE | 111 | **174** or drop | 111 = -3 → consume-all |
| EVENT_MOUSE_CLICK | 63 | **174** or drop | 63 = **op-held-u-obj** (size 12) → phantom "use item on floor item" + 12-byte desync |
| EVENT_APPLET_FOCUS | 130 | **174** or drop | 130 = -3 → consume-all |
| MAP_BUILD_COMPLETE | 213 | **(none — do not send)** | 213 = -3 → **consume-all / desync** (see §4) |
| SEND_SNAPSHOT | 99 | 99 | 99 = event-tracking (ok by luck) |
| SOUND_SONGEND | 133 | (none in 464) | 133 = **FRIENDLIST_DEL** (size 8) → phantom del-friend + desync |
| URL_REQUEST | 85 | (none in 464) | 85 = -3 → consume-all |
| MOVE_GAMECLICK | 200 | **143** | 200 = -3 → consume-all |
| MOVE_MINIMAPCLICK | 199 | **50** | 199 = -3 → consume-all |
| MOVE_OPCLICK | 159 | **36** | 159 = **OPHELD3** (size 8) → phantom item-opt3 + desync |
| CLIENT_CHEAT | 175 | **165** | 175 = -3 → consume-all |
| MESSAGE_PUBLIC | 189 | **115** | 189 = -3 → consume-all |
| MESSAGE_PRIVATE | 80 | **238** | 80 = -3 → consume-all |
| SET_CHATFILTERSETTINGS | 115 | **11** | 115 = **MESSAGE_PUBLIC** (var-byte) → desync |
| FRIENDLIST_ADD | 82 | **197** | 82 = -3 |
| FRIENDLIST_DEL | 121 | **133** | 121 = **INV_BUTTOND** (size 9) → phantom inv-swap + desync |
| IGNORELIST_ADD | 28 | **102** | 28 = -3 |
| IGNORELIST_DEL | 126 | **214** | 126 = -3 |
| CLOSE_MODAL | 24 | **71** | 24 = -3 |
| RESUME_PAUSEBUTTON | 95 | **240** | 95 = -3 |
| RESUME_P_COUNTDIALOG | 152 | **78** | 152 = -3 |
| RESUME_P_NAMEDIALOG | 54 | **150** | 54 = -3 |
| OPPLAYER1 (attack) | 65 | **84** | 65 = -3 |
| OPPLAYER3 (follow) | 118 | **185** | 118 = -3 |
| OPPLAYERU | 192 | **110** | 192 = -3 |
| OPPLAYERT | 6 | **123** | 6 = -3 |
| OPNPC1 | 164 | **156** | 164 = -3 |
| OPNPC2 | 33 | **129** | 33 = -3 |
| OPNPC3 | 78 | **19** | 78 = **RESUME_P_COUNTDIALOG** (size 4) → desync |
| OPNPC4 | 195 | **51** | 195 = -3 |
| OPNPC5 | 71 | **43** | 71 = -3 |
| OPNPC6 | 127 | **(none — 464 has 5)** | 127 = **OPLOC4** (size 6) → phantom loc-op + desync |
| OPNPCU | 30 | **187** | 30 = -3 |
| OPNPCT | 145 | **69** | 145 = -3 |
| OPLOC1 | 53 | **44** | 53 = -3 |
| OPLOC2 | 13 | **119** | 13 = -3 |
| OPLOC3 | 94 | **120** | 94 = -3 |
| OPLOC4 | 169 | **127** | 169 = -3 |
| OPLOC5 | 97 | **250** | 97 = **examine loc** (size 2) → desync (coincidental collision) |
| OPLOC6 | 166 | **97** (examine) | 166 = **OPHELDU** (size 16) → phantom item-on-item + big desync |
| OPLOCU | 170 | **103** | 170 = -3 |
| OPLOCT | 234 | **207** | 234 = -3 |
| OPOBJ1-6 | 211,39,77,107,138,191 | **216** | all -3 → consume-all |
| OPOBJU | 176 | **172** | 176 = **NPC examine** (size 2) → desync |
| OPOBJT | 84 | **152** | 84 = **OPPLAYER1 attack** (size 2) → phantom attack + desync |
| OPHELD1 | 154 | **101** | 154 = -3 |
| OPHELD2 | 55 | **88** | 55 = -3 |
| OPHELD3 | 216 | **159** | 216 = **OPOBJ pickup** (size 6) → phantom ground pickup + desync |
| OPHELD4 | 160 | **86** | 160 = -3 |
| OPHELD5 | 251 | **220** | 251 = -3 |
| OPHELDU | 4 | **166** | 4 = **CLICK_2 → opheld2** (size 8) → phantom equip + desync |
| OPHELDT | 35 | **163** | 35 = -3 |
| IF_BUTTON | 109 | **153** | 109 = -3 |
| INV_BUTTON1-5 | 150,205,32,112,26 | **113,37,134,137,140** | 150 = RESUME_P_NAMEDIALOG(8); others mostly -3 → desync |
| INV_BUTTOND | 207 | **121** | 207 = -3 |
| IF_BUTTON1-10 / D / T (if3) | 44,50,103,64,178,81,236,188,128,254,135,196 | see §5 | 44 = **OPLOC1**, 50 = **MOVE_MINIMAPCLICK**, 103 = **OPLOCU**, 128 = camera — all phantom-fire + desync |

(Any LC500 opcode landing on a 464 opcode with a **positive size** is worse than one landing on -3:
it silently fires a real, wrong interaction AND shifts the read pointer by that many bytes, which is
exactly how a stray `172` later gets read as `op_obju`.)

---

## 4. What LC500 sends right after entering the game (the `op_obju` trigger)

Two packets go out the instant the client reaches the in-game state; both desync a 464 server:

1. **MAP_BUILD_COMPLETE = 213** — the "window loaded / map-build-done" packet.
   `Client.ts:4395-4398`: right after `Client.setMainState(30)` (in-game), it does
   `Client.out.p1Enc(ClientProt.MAP_BUILD_COMPLETE)`. **464 has no handler for 213 and no
   client map-build-complete packet at all** (the 464-remapped `client-ts` ClientProt does not
   define it). Server: `PACKET_SIZES_464[213] = -3` → decode loop consumes ALL remaining buffered
   bytes and nulls the input buffer (`player.ts:542-546`). Any packets batched behind it in the same
   flush are swallowed. **Fix: do not send this opcode on 464.**

2. **NO_TIMEOUT = 19** — the keepalive, sent as a bare 1-byte opcode (no body) from
   `Client.ts:2168` and `Client.ts:4261`, and fired within the first seconds of entering the world.
   464 reads opcode **19 = OPNPC3, size 2** (`op-npc-handler.ts:156`), so the server consumes the
   **next 2 bytes** as an NPC index and fires a phantom npc-option-3. Those 2 bytes were the head of
   the following packet → the read pointer is now off by 2 and stays misaligned every subsequent
   keepalive. Once the pointer drifts onto a byte whose value is `172` with ≥14 bytes behind it, the
   server dispatches `op-obj-u-handler` (opcode 172, size 14) on random bytes = the **garbage
   `op_obju`** in the log. **Fix: send keepalive as opcode 7.**

So `op_obju` is a *symptom of stream desync*, not a packet LC500 deliberately sends. The two root
causes are `MAP_BUILD_COMPLETE (213)` (immediate, one-shot, -3 consume-all) and the recurring
`NO_TIMEOUT (19→OPNPC3)` misread that keeps the pointer 2 bytes off. `EVENT_MOUSE_CLICK = 63`
(→ op-held-u-obj, size 12) is a third frequent offender the moment the user moves the mouse.

---

## 5. The remap, condensed (rev-500 → 464)

Rewrite `web-client/src/client/ClientProt.ts` enum values to these 464 numbers. Grouped by action:

```
# movement
MOVE_GAMECLICK      200 -> 143
MOVE_MINIMAPCLICK   199 -> 50
MOVE_OPCLICK        159 -> 36

# client-event / keepalive
NO_TIMEOUT           19 -> 7
IDLE_TIMER          226 -> 202
EVENT_CAMERA_POSITION 173 -> 128
EVENT_TRACKING/SNAPSHOT 99 -> 99   (already ok)
EVENT_MOUSE_MOVE    111 -> 174 (or stop sending)
EVENT_MOUSE_CLICK    63 -> 174 (or stop sending)
EVENT_APPLET_FOCUS  130 -> 174 (or stop sending)
MAP_BUILD_COMPLETE  213 -> DO NOT SEND (no 464 packet)
SOUND_SONGEND       133 -> DO NOT SEND
URL_REQUEST          85 -> DO NOT SEND

# npc
OPNPC1 164->156  OPNPC2 33->129  OPNPC3 78->19  OPNPC4 195->51  OPNPC5 71->43
OPNPC6 127->DROP (464 has 5 npc options)
OPNPCU 30->187   OPNPCT 145->69

# loc
OPLOC1 53->44  OPLOC2 13->119  OPLOC3 94->120  OPLOC4 169->127  OPLOC5 97->250
OPLOC6 166->97 (examine)   OPLOCU 170->103   OPLOCT 234->207

# obj (ground item)
OPOBJ1-6 (211,39,77,107,138,191) -> 216 (all pickup)
OPOBJU 176->172   OPOBJT 84->152   (obj examine -> 205)

# player
OPPLAYER1(attack) 65->84   OPPLAYER3(follow) 118->185   OPPLAYER(alt) ->180
OPPLAYERU 192->110   OPPLAYERT 6->123

# held / item
OPHELD1 154->101  OPHELD2 55->88  OPHELD3 216->159  OPHELD4 160->86  OPHELD5 251->220
OPHELDU 4->166    OPHELDT 35->163
(use item on floor item -> 63)

# interface buttons
IF_BUTTON 109->153
INV_BUTTON1 150->113  INV_BUTTON2 205->37  INV_BUTTON3 32->134  INV_BUTTON4 112->137  INV_BUTTON5 26->140
INV_BUTTOND 207->121
IF_BUTTON_D(if3 drag) 135->132   IF_PLAYERDESIGN ->49
# if3 IF_BUTTON1..10 / IF_BUTTONT: 464 has no if3 button opcodes; route through
#   IF_BUTTON(153) or the INV_BUTTON option opcodes. Do NOT leave them at 44/50/103/128 (collisions).

# interface control
CLOSE_MODAL 24->71   RESUME_PAUSEBUTTON 95->240
RESUME_P_COUNTDIALOG 152->78   RESUME_P_NAMEDIALOG 54->150
INV_DROP ->247

# chat / social
MESSAGE_PUBLIC 189->115   MESSAGE_PRIVATE 80->238   SET_CHATFILTERSETTINGS/CHAT_SETMODE 115->11
FRIENDLIST_ADD 82->197   FRIENDLIST_DEL 121->133
IGNORELIST_ADD 28->102   IGNORELIST_DEL 126->214

# commands
CLIENT_CHEAT 175->165
```

### Also verify (not just the enum)

- The 464 **body layout** per action differs from rev-500 (field order/endianness). Remapping the
  opcode fixes framing/desync, but the handlers decode specific field orders — e.g.
  op-loc `option1` expects `LEShort(id), Short(x), LEShort(y)` (op-loc-handler.ts:37), op-obj-u
  expects the 7-short layout in op-obj-u-handler.ts:15-21. Wherever `Client.ts` writes the body
  after `p1Enc`, the field order must match the 464 handler, or the opcode will be right but the
  data garbage. That is a follow-up pass (S8), separate from this opcode remap.
- 464 has **5** npc/loc options (LC500 emits 6-8 in places) — the 6th+ have no 464 target and must
  be dropped, not aliased onto an unrelated opcode.
