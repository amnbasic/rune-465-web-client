# LC500 — Incoming (server→client) game-packet read + dispatch

How the Lost City rev-500 web client (`web-client/src`) reads and dispatches **server→client**
game packets, mapped for reconciliation against the RuneJS **464** server.

All paths are `web-client/src/...`. All line numbers are as of this scan.

> **Terminology.** There is **no `io/ServerProt.ts` in this client.** The only protocol enum on
> disk is `client/ClientProt.ts` — that is the **outgoing** (client→server) opcode list, not the
> incoming one. Incoming opcode identity is implicit: the opcode byte indexes a raw **size table**
> (`deob/Statics.ts` → `field224`) and is then matched by a long `if (Client.ptype === N)` chain
> inside `Client.tcpInInner()`. So the "ServerProt" the task asked for is split across two places:
> the size table in `Statics.field224`, and the opcode constants inlined as numeric literals in the
> dispatch chain.

---

## 1. The read pipeline

### Transport
`Client.stream` is a `ClientStream` (`io/ClientStream.ts`) over a browser `WebSocket`. The reader
pulls bytes with `Client.stream.available()` and `Client.stream.readBytes(dst, off, len)`. `Client.in`
is the incoming `PacketBit` buffer (`io/PacketBit.ts extends io/Packet.ts`).

### Opcode is ISAAC-obfuscated (`g1Enc`)
The opcode byte is **not plaintext** in code: it is read via `Client.in.g1Enc()`
(`io/PacketBit.ts:50`):

```
g1Enc(): return (this.data[this.pos++] - this.random.takeNextValue()) & 0xff;
```

The incoming ISAAC is seeded at login (`client/Client.ts:1625` `Client.in.seed(seed)`), where the
server→client seed is the login seed with **+50 added to each of the 4 words**
(`Client.ts:1622-1624`; the client→server `out` stream uses the raw seed at `:1621`).
**Reconciliation flag:** for the 464 server to interoperate, it must ISAAC-encode each outgoing
opcode byte with the matching keystream (seed+50 per word), OR the client must be seeded so the
keystream is a no-op. This is the single most load-bearing wire detail — a keystream mismatch
desyncs the opcode of *every* packet. (Payload bytes are read plaintext via `g1/g2/g4/...`;
`g1Enc`/`gIsaacArrayBuffer` are the only ISAAC consumers on the read side.)

### First game packet is read inline in the login flow
`client/Client.ts:1676-1704` — right after the 5-byte 464 login-success reply, the client reads the
first packet's `[opcode via g1Enc][u16 size via g2][payload]`, calls `Client.loginDone()`, then
`Client.rebuildPacket(false)` for the initial map, then resets `ptype=-1`. (Note comment at
`:1660-1664`: the 464 login-success reply is only 5 bytes — `[rights][flagged=0][u16 worldIndex]
[membership]` — the stock rev-500 client read 8 fields and desynced; already patched here.)

### Steady-state loop: `tcpIn` → `tcpInInner`
- `tcpIn()` — `client/Client.ts:5282` — try/catch wrapper; on error builds a `T2 - ...` report and
  logs out.
- `tcpInInner()` — `client/Client.ts:5304` — the real reader + dispatch. Structure:

```
5310  available = stream.available();  if 0 -> return false
5315  if (ptype === -1):                       // need a new opcode
          readBytes(in.data,0,1); in.pos=0
          ptype  = in.g1Enc()                  // ISAAC-decoded opcode
          psize  = Statics.field224[ptype]     // <-- THE SIZE TABLE LOOKUP
5323  if (psize === -1):  read 1 byte -> psize = data[0] & 0xff       // VAR_BYTE length
5333  if (psize === -2):  read 2 bytes -> psize = in.g2()             // VAR_SHORT length (BE u16)
5344  if (available < psize): return false     // wait for full payload
5348  in.pos=0; readBytes(in.data,0,psize)      // load payload
5352  ptype2=ptype1; ptype1=ptype0; ptype0=ptype   // 3-deep opcode history (for crash reports)
5356+ long  if (Client.ptype === N) { ... ptype=-1; return true }  chain
6967  fallthrough -> JagException 'T1 - ...' + logout   // unknown opcode
```

So **size comes purely from `Statics.field224[opcode]`**: a fixed non-negative size, `-1`
(1-byte length prefix follows), or `-2` (2-byte big-endian length prefix follows). This is the
classic OSRS/RS2 fixed / VAR_BYTE / VAR_SHORT convention, just with `-1`/`-2` instead of named
constants.

---

## 2. The size table — `deob/Statics.ts:2` `field224[256]`

256 entries indexed by opcode. `0` = zero-payload, positive = fixed byte count, `-1` = VAR_BYTE,
`-2` = VAR_SHORT. Only the **non-zero** entries are listed (every other opcode is size 0):

| op | size | op | size | op | size | op | size |
|----|----|----|----|----|----|----|----|
| 4 | 8 | 6 | -1 | 10 | 2 | 11 | 3 |
| 12 | -2 | 16 | -1 | 17 | -2 | 19 | -2 |
| 21 | -2 | 22 | 24 | 25 | 7 | 26 | 6 |
| 44 | 4 | 52 | 5 | 53 | -2 | 54 | 2 |
| 61 | 14 | 65 | 8 | 66 | -1 | 68 | 1 |
| 72 | 6 | 74 | -1 | 75 | 2 | 77 | 10 |
| 79 | -2 | 84 | 1 | 86 | 3 | 88 | 2 |
| 89 | 5 | 96 | 6 | 99 | 5 | 100 | 4 |
| 101 | -1 | 108 | 20 | 110 | -2 | 113 | 5 |
| 114 | 3 | 116 | -2 | 117 | -1 | 120 | 10 |
| 123 | 15 | 129 | -1 | 134 | -2 | 135 | 7 |
| 139 | 10 | 146 | 12 | 147 | 1 | 149 | 5 |
| 150 | 15 | 162 | 6 | 163 | 2 | 171 | 4 |
| 172 | -1 | 173 | 6 | 177 | 4 | 184 | 2 |
| 186 | -2 | 187 | -1 | 188 | -2 | 189 | 4 |
| 191 | 5 | 192 | 6 | 197 | 4 | 198 | 3 |
| 200 | 4 | 203 | -1 | 204 | 6 | 205 | -1 |
| 213 | 9 | 214 | -2 | 220 | 6 | 221 | 6 |
| 222 | 6 | 223 | 6 | 229 | -2 | 230 | 7 |
| 232 | 7 | 233 | -1 | 235 | -1 | 237 | 3 |
| 239 | 8 | 241 | 2 | 242 | 4 | 243 | 4 |
| 244 | 8 | 249 | 6 | | | | |

VAR_BYTE (`-1`): **6, 16, 66, 74, 101, 117, 129, 172, 187, 203, 205, 233, 235**
VAR_SHORT (`-2`): **12, 17, 19, 21, 53, 79, 110, 116, 134, 186, 188, 214, 229**

> Note: opcode **222** has size 6 in the table but is **not** matched anywhere in the dispatch
> chain (no `ptype === 222` branch) — a sized-but-unhandled slot; if the 464 server sends it the
> client will consume 6 bytes then hit the `T1` unknown-opcode logout. Everything else with a
> non-zero size (and many zero-size ops) has a handler below.

---

## 3. Critical opcode → handler map (all `Client.ts` unless noted)

### 3a. Map region / rebuild
| op | size | handler | line | notes |
|----|----|----|----|----|
| **79** | -2 | `rebuildPacket(false)` | dispatch `6722`; impl `4050` | **REBUILD_NORMAL.** Reads XTEA keys array (`field268`, 4×i32 per map), then centre `zoneX/zoneZ`, level, etc.; builds `m{x}_{z}` / `l{x}_{z}` group ids; `startRebuild()` sets **`mapBuildBaseX=(zoneX-6)*8`, `mapBuildBaseZ=zoneZ*8-48`** (`4173-4175`). Also the *first* map is this call from login at `1703`. |
| **21** | -2 | `rebuildPacket(true)` | dispatch `6776`; impl `4096` | **REBUILD_REGION.** `regionmode=true`: reads bit-packed `zoneMapArchiveIds[4][13][13]` (1 bit present + 26-bit archive), then XTEA keys, then `startRebuild()`. |
| 86 | 3 | inline | `5415` | **IF_OPENTOP** (window pane / top-level interface). `g1 mode` + `g2 interfaceId`; `mode===1` resets map+collision, `mode===2` enters `MAP_BUILD`; sets `Client.toplevelinterface`. |
| 12 | -2 | inline | `6729` | **IF_OPENTOP + sub-interfaces batch** (windowpane w/ children + `serverActive` ranges). Sets `toplevelinterface`, opens/reconciles subinterfaces. |

### 3b. Player info / sync
| op | size | handler | line | notes |
|----|----|----|----|----|
| **116** | -2 | `getPlayerPos()` | dispatch `5836`; impl `7461` | **PLAYER_INFO.** Bit-stream: `getPlayerPosLocal()` (`7484`) + `getPlayerPosOldVis()` (`7522`) + `getPlayerPosNewVis()` (`7573`) + `getPlayerPosExtended()` (update masks, `7616`). Asserts `in.pos===psize` at end. |

### 3c. NPC info / sync
| op | size | handler | line | notes |
|----|----|----|----|----|
| **19** | -2 | `getNpcPos()` | dispatch `5829`; impl `7782` | **NPC_INFO.** Bit-stream: `getNpcPosOldVis()` (`7806`) + `getNpcPosNewVis()` (`7859`) + `getNpcPosExtended()` (masks, `7912`). |
| 149 | 5 | inline `triggerNpcAnim` | `5532` | Single targeted NPC anim (`seqId, delay, npcId`). |
| 77 | 10 | inline | `6438` | **SPOTANIM (specific)** — target-packed hi bits select map-tile / npc / player. |

### 3d. Varp / client config
| op | size | handler | line | notes |
|----|----|----|----|----|
| **11** | 3 | inline | `6783` | **VARP_SMALL.** `g1b value` + `g2 varpId` → `VarCache.var[id]`, then `Client.clientVar(id)`. |
| **72** | 6 | inline | `6798` | **VARP_LARGE.** `g2 varpId` + `g4 value`. |
| 24 | 0 | inline | `6813` | **VARP_SYNC** — copy every `varServ[i]`→`var[i]` where differing, fire `clientVar`. |
| 70 | 0 | inline | `6826` | **VARP_RESET** — zero all varps whose `VarpType.clientcode===0`. |

### 3e. Interface ops (if_open / window / component setters)
| op | size | handler | line | notes |
|----|----|----|----|----|
| 25 | 7 | `openSubInterface` | `5572` | **IF_OPENSUB** (`comId g4, ifId g2, mode g1`). |
| 239 | 8 | inline | `5356` | **IF_MOVESUB** (`from g4, to g4`). |
| 242 | 4 | inline | `6489` | **IF_CLOSESUB** / resume-pause close. |
| 166 | 0 | inline | `6504` | **IF_CLOSE hook** — runs toplevel hook 0. |
| 214 | -2 | inline | `5586` | **IF_SETTEXT** (`comId g4`, `gjstr`). |
| 249 | 6 | inline | `5437` | IF_SETCOLOUR. |
| 191 | 5 | inline | `5456` | IF_SETHIDE. |
| 244 | 8 | inline | `5618` | IF_SETPOSITION. |
| 220 | 6 | inline | `5634` | IF_SETSCROLLPOS. |
| 162 | 6 | inline | `5545` | IF_SETANIM (component model anim). |
| 96 | 6 | inline | `5514` | IF_SETMODEL. |
| 139 | 10 | inline | `5470` | IF_SETOBJECT (invobject + count). |
| 26 | 6 | inline | `5600` | IF_SETNPCHEAD. |
| 100 | 4 | inline | `5561` | IF_SETPLAYERHEAD. |
| 120 | 10 | inline | `5385` | IF_SETMODEL angle (zoom/yan/xan). |
| 4 | 8 | inline | `5403` | IF_SETMODEL spin (`modelSpin`). |
| 146 | 12 | inline | `6573` | Component `serverActive` range set. |
| 53 | -2 | `ScriptRunner.executeScript` | `6045` | **IF_RUNSCRIPT** (clientscript w/ typed args string). |

### 3f. Inventory update
| op | size | handler | line | notes |
|----|----|----|----|----|
| **186** | -2 | inline | `5678` | **UPDATE_INV_FULL.** `comId g4, invId g2, size g2`, then per slot `id g2 + count(g1, 255→g4)`; writes `IfType.linkObjType/Number` + `ClientInvCache.set`. |
| **17** | -2 | inline | `5715` | **UPDATE_INV_PARTIAL.** `comId g4, invId g2`, then while bytes remain: `slot gsmart, id g2, count(g1,255→g4)`. |
| 200 | 4 | inline | `5656` | **IF_CLEARINV** — clear a component's inv links. |
| 241 | 2 | inline | `5669` | **INV_STOPTRANSMIT** — `ClientInvCache.delete(comId)`. |

### 3g. Skill / stat
| op | size | handler | line | notes |
|----|----|----|----|----|
| **204** | 6 | inline | `6605` | **UPDATE_STAT.** `stat g1, level g1, xp g4` → `statXP/statEffectiveLevel/statBaseLevel` (base derived from `Skills.skillxp`). |

### 3h. Run energy / weight
| op | size | handler | line | notes |
|----|----|----|----|----|
| **68** | 1 | inline | `6626` | **UPDATE_RUNENERGY** (`g1` → `Client.runenergy`). |
| 54 | 2 | inline | `6520` | **UPDATE_RUNWEIGHT** (`g2b` → `Client.runweight`). |

### 3i. Chatbox / messaging
| op | size | handler | line | notes |
|----|----|----|----|----|
| **117** | -1 | inline `addChat` | `5843` | **MESSAGE_GAME.** `gjstr`; suffix-dispatch (`:tradereq:`,`chalreq`,`:clan:`,`:trade:`,…) selects chat type, else plain type-0 game message. |
| 6 | -1 | inline `addChat(...,3/7)` | `6066` | **MESSAGE_PRIVATE** (incoming PM, WordPack-unpacked). |
| 172 | -1 | inline `addChat(...,6)` | `6111` | PM echo (own message-out). |
| 187 | -1 | inline | `6121` | PM quickchat. |
| 203 | -1 | inline | `6131` | PM quickchat (with mod flags). |
| 74 / 129 | -1 | inline `friendAddChat` | `6165` | Friends-chat message (74) / quickchat (129). |
| 101 | -1 | inline | `6060` | Walk-here / op text override (`moveAction`). |

### 3j. Zone / world-state (spatially anchored)
Zone anchor opcodes set `zoneUpdateX/Z`, then the sub-op reads its tile within the 8×8:
| op | size | handler | line | notes |
|----|----|----|----|----|
| 163 | 2 | inline | `6884` | **ZONE anchor** — set `zoneUpdateX/Z` for the following single sub-op. |
| 88 | 2 | inline | `6892` | **ZONE clear** — drop all ground objs + expire loc changes in the 8×8. |
| 134 | -2 | inline loop `zonePacket()` | `6915` | **ZONE_MULTI** — anchor + loop reading `[subop g1]` → `zonePacket()` until `psize`. |
| 230 | 7 | `animateLocation` | `6928` | LOC_ANIM (map-base-anchored, packed coord). |
| 232,61,135,173,123,150,198,99,171,75,44,52 | (table) | `zonePacket()` | dispatch `6947`; impl `6982` | Zone sub-ops, see below. |

`zonePacket()` (`6982`) sub-op decode:
- **123** (15) & **150** (15): MAP_PROJANIM (projectile spawn).
- **135** (7): OBJ_ADD (private ground item, `selfSlot`-gated).
- **99** (5): OBJ_ADD (public ground item, id+count).
- **232** (7): OBJ_REVEAL/COUNT (update existing stack count).
- **198** (3): OBJ_DEL (remove ground item).
- **173** (6): MAP_SPOTANIM (area graphic).
- **44** (4) & **75** (2): LOC_ADD_CHANGE / LOC_DEL (`locChangeCreate`).
- **171** (4): LOC_ANIM (`animateLocation`).
- **61** (14): OBJ/loc attached to a player (player-follows-loc, e.g. dropped-during-emote).
- **52** (5): SOUND_AREA (positional sound effect).

### 3k. Other notable handlers (non-critical, for completeness)
`223` CAM_LOOKAT `5748` · `221` CAM_SHAKE `5782` · `192` CAM_MOVETO `5799` · `253` CAM_RESET `5818`
· `243` CAM_ORBIT `6701` · `114` local reposition/teleport `6710` · `213` HINT_ARROW `6529` ·
`233` SET_PLAYER_OP `6676` · `147` SET_MINIMAP_STATE `6694` · `255` reset minimap flag `6513` ·
`248` reset all anims `6635` · `184` SYSTEM_UPDATE `6597` · `240` LOGOUT `6669` · `22` UID192 `6432`
· `113` SYNTH_SOUND `6841` · `10` MIDI_SONG `6854` · `89` MIDI_JINGLE `6866` · `237`
CHAT_FILTER_SETTINGS `5970` · `66` OPEN_URL `5979` · `235` SET_COOKIE `5987` · `188` IGNORELIST
`5958` · `16` UPDATE_FRIENDLIST `6333` · `205`/`229`/`84` friends-chat `6217/6285/6326` · `108`
STOCKMARKET(GE) slot `6418` · `110` reflection no-op `6878`.

---

## 4. Reconciliation notes vs the 464 server

1. **Opcode encoding.** LC500 decodes the opcode with `g1Enc` = ISAAC subtract. The 464 server must
   either encrypt the S→C opcode with the matching ISAAC keystream (login seed **+50 per word**) or
   arrange for a zero keystream. Verify what `server`'s outgoing stream does before trusting any
   handler mapping — a keystream mismatch corrupts the opcode of every packet, not just one.
2. **Size discipline is client-side, not on the wire.** The wire carries *no* size for fixed-size
   opcodes; the client trusts `field224[opcode]` exactly. The 464 server's per-opcode payload length
   must match this table byte-for-byte (fixed ops) or emit the right `-1`/`-2` length prefix
   (`g1` / big-endian `g2`). Any drift throws `gpp1/gnp1 pos != psize` (player/npc info) or a `T1`
   unknown-opcode / desync.
3. **These opcode numbers are a rev-500 map, and will not match the 464 `ServerProt`.** The 464
   server almost certainly numbers e.g. REBUILD_NORMAL / PLAYER_INFO / VARP differently. Reconciling
   means either (a) renumbering the 464 server's S→C opcodes to this table, or (b) building a real
   `ServerProt`-style translation. The values here (79 rebuild-normal, 116 player-info, 19 npc-info,
   11/72 varp, 204 stat, 68 runenergy, 86/12 windowpane, 186/17 inv, 117 game-message) are the
   client's fixed expectations.
4. **Login reply already patched to 5 bytes** for 464 (`Client.ts:1660-1671`); the first game packet
   is read inline there, so the very first S→C packet after login-success must be a valid
   `[g1Enc opcode][g2 size][payload]` framed exactly like steady state.
5. **`ClientProt.ts` is outgoing only** — do not use it as the incoming table. The incoming
   "constants" live only as literals in the `tcpInInner` chain + the `field224` sizes.
