# S2 Map — `idk` (IdkType / identkit / body-part config)

Scope: make the Lost City 500 (LC500) web-client fetch + decode **idk** configs from the
465 cache the RuneJS server serves. All facts below were verified against the actual files
and by reading the raw `server/cache` bytes (see "Live probe" at the end). Nothing here is
guessed.

---

## TL;DR

- **Addressing is already correct.** idk lives in **idx2 (config archive), group 3, file = id**
  — *flat* file addressing (every idk is a file inside the single group 3; there is **no**
  `id>>8` group / `id&0xff` file split). LC500's `IdkType.ts` already fetches exactly this
  via `configClient.getFile(id, 3)`. No `getGroupId`/`getFileId` change is needed.
- **The blocker is format, not fetch.** The server's `CacheStore` **transcodes** raw group 3
  from native **IDKit** format into **NpcType** binary format (`convertIdkitEntries()`) before
  serving it — for the obfuscated 464 Java client, whose `IdkType.java` is actually a renamed
  **NpcType** decoder. LC500's `IdkType.ts` is a native-IDKit decoder, so it mis-decodes the
  transcoded stream.
- **Verified:** LC500's `IdkType.ts` decodes the **raw** 465 cache group 3 **byte-exact**
  (84/84 entries clean, zero desync). So the fix is to serve **raw** group 3 to LC500 (skip
  `convertIdkitEntries()` on the 465-native path) — then the existing decoder works verbatim.

---

## (a) 465 cache addressing for idk — as the server serves it

**Archive / group / file**

| Layer | Value | Evidence |
|---|---|---|
| JS5 archive (index) | **2** (config / idx2) | LC500 `Client.configs = openJs5(2)` `Client.ts:986`; 464 fetch uses the config archive `aClass19_1218` |
| Group inside idx2 | **3** | server `js5-update-server.ts:816-817` ("465 cache: group 3=IDKit"); 464 `Isaac.java:57` `method746(3, …)`; LC500 `getFile(id, 3)` |
| File inside group 3 | **= id** (flat / identity) | 464 `method746(3,102,arg1)` file=`arg1`; LC500 `getFile(id, 3)` file=`id` |
| Count | **84** entries (ids 0..83) in current `server/cache` | live probe: `255:2` ref-table `childCount[group 3] = 84` |

`idk` is **not** part of `CONFIG_GROUP_REMAP` (`js5-update-server.ts:195-198` only remaps
client-group 9←cache-6 for locs and client-group 7←cache-9 for NPCs). Group 3 keeps its
number — no group remap.

**⚠ Served content ≠ raw content.** At load, `CacheStore` overrides `2:3`:

- `convertIdkitEntries()` (`js5-update-server.ts:1176-1213`, called unconditionally at
  `:658`) reads each raw IDKit entry, runs `convertIdkitBinaryToNpcType()`
  (`:221-320`), and re-packs group 3 as **NpcType** binary. So the bytes a client actually
  receives at `2:3` are NpcType-format, not raw IDKit.
- `populateNpcDefinitions()` (`:1228-1310`) would additionally merge all NPC defs into group 3,
  but it is **defined and never called** — only the IDKit→NpcType transcode runs.

**Transcode output format** (what the 464 client decodes; `js5-update-server.ts:277-320`):

| NpcType opcode | payload | source (raw IDKit) |
|---|---|---|
| 1 | u8 count + count×u16 (models) | raw op2 (models) |
| 12 | u8 (body-part type) | raw op1 (type) |
| 40 | u8 count + count×(u16 src, u16 dst) (recolours) | raw op40 |
| 60 | u8 count + count×u16 (head models) | raw op60-69 collected |
| 0 | terminator | |

**Both clients receive this transcoded stream.** The web-client's WS gateway
(`gateway-server.ts:43`) builds the same `Js5Handler`, which uses `getCacheStore()`
(`js5-update-server.ts:2468`) — the transcoding store — and the handshake requires
`version === 464` (`EXPECTED_VERSION`, `:163`, checked `:2483`). There is no separate raw
path for LC500.

---

## (b) How LC500 fetches idk now

`web-client/src/config/IdkType.ts`:

- `static init(models, config)` (`:32-36`): `configClient = config`, and
  `numDefinitions = configClient.getFileIdLimit(3)` — child-count of group 3.
- Wired in `Client.ts:1201`: `IdkType.init(models, configs)` where `models = Client.models =
  openJs5(7)` (`Client.ts:991`) and `configs = Client.configs = openJs5(2)` (`Client.ts:986`).
- `static list(id)` (`:39-53`): `const data = configClient.getFile(id, 3)`.
  `Js5.getFile(file, group)` overload (`Js5.ts:192,194`) → **file = id, group = 3**, archive 2.
- No `getGroupId`/`getFileId` indirection — flat identity addressing.

So LC500 already targets **idx2 / group 3 / file id** = the native 465 idk layout. The
addressing is correct; only the served *bytes* are wrong (transcoded).

For comparison, the 464 Java client fetches the same slot: `Isaac.method889(_, id)`
(`Isaac.java:50-63`) → `aClass19_1218.method746(3, 102, id)` (`:57`) →
`Class19.method746(group=3, _, file=id)` (`:399-404`). Identical addressing; callers pass
`appearanceId - 256` (e.g. `Player.java:316`, `PlayerAppearance.java:227`) so the group-3 file
id is `appearanceId - 256`. LC500's `list(id)` receives the already-resolved id, so no
addressing difference.

---

## (c) s2Redirect — concrete change for LC500's `IdkType.ts`

**Fetch: no change.** `clientConfig` source stays `Client.configs` (`openJs5(2)`); the group
is the constant `3`; the file id is the identity `id`. `getFile(id, 3)` already matches the
465 idx2 group-3 flat layout. There is nothing to rewrite in `getGroupId`/`getFileId` — idk
uses neither (it is flat, unlike loc/npc/obj which the server also remaps).

```
clientConfig : Client.configs  (= openJs5(2))        // unchanged
getGroupId   : 3               (constant group)      // unchanged
getFileId    : id              (identity, flat)      // unchanged  -> getFile(id, 3)
```

**The real redirect is on the serving side, not the fetch.** LC500's existing native-IDKit
`decodeInner` (`IdkType.ts:68-98`) decodes the **raw** 465 group 3 byte-exact (verified
84/84 — see probe). It **cannot** decode the transcoded NpcType stream the server currently
sends. To align, the server must serve **raw** group 3 to the 465-native client:

- Guard/skip `convertIdkitEntries()` (`js5-update-server.ts:658`) for the LC500 (465-native)
  path — or drop the transcode entirely once the obfuscated 464 Java client is retired
  (extraction/464-compat removal is already a planned epic).
- Then `IdkType.list(id)` → `getFile(id, 3)` → native IDKit bytes → existing decode works
  with **no client edit**. This is the anti-Frankenstein (S3) outcome: clean 465 decode.

**Not recommended (Frankenstein) alternative:** if the server transcode must stay, rewrite
`IdkType.decodeInner` to consume NpcType opcodes instead (1=models `count+u16`,
12=bodyPartType `u8`, 40=recolour `count+(u16,u16)`, 60=head `count+u16`, ignore
13/14/17/30-34/93-107). This makes LC500 decode the transcoded stream but abandons native 465
parity and duplicates NpcType logic inside the idk decoder.

---

## (d) s3FormatDelta — 464 Java decode vs LC500 decode

The two decoders describe **different wire formats**, because the 464 `IdkType.java` is a
renamed **NpcType** decoder (its own comment: *"465 cache format opcodes (rewritten from 464
format)"*, `IdkType.java:299`) that reads the server's **transcoded** stream, while LC500
`IdkType.ts` reads **native IDKit**.

### Opcode tables

**464 `IdkType.java::method585` (`:297-362`) — NpcType format**

| op | payload | field |
|---|---|---|
| 1 | u8 count + count×u16 | **models** (`anIntArray3114`) |
| 2 | string (skip) | NpcType name |
| 12 | u8 | **body-part type** (`anInt3125`) |
| 13 | u16 (skip) | idle anim |
| 14 | u16 (skip) | walk anim |
| 17 | 4×u16 (skip) | walk/back/left/right |
| 30-34 | string (skip) | actions |
| 40 | u8 count + count×(u16 src, u16 dst) | **recolour** (`aShortArray3104/3109`) |
| 60 | u8 count + count×u16 | **head models** (`anIntArray3105`) |
| 93/95/97/98/99/100/101/102/103/106/107 | NpcType fields (minimap/level/size/render/varbit…) | — |
| 0 | terminator | |

**LC500 `IdkType.ts::decodeInner` (`:68-98`) — native IDKit format**

| op | payload | field |
|---|---|---|
| 1 | u8 | **type** / body-part type (`this.type`) |
| 2 | u8 count + count×u16 | **models** (`this.model`) |
| 3 | (none) | **disable = true** |
| 40 | u8 count + count×(u16, u16) | **recolour** pairs (`retex_d`,`recol_d`) |
| 41 | u8 count + count×(u16, u16) | **retexture** pairs (`retex_s`,`recol_s`) |
| 60-69 | u16 each | **head**`[op-60]` (`this.head`) |
| 0 | terminator | |

### Divergent opcodes (same number, different meaning)

| op | 464 (NpcType) | LC500 (IDKit) | compatible? |
|---|---|---|---|
| **1** | models (u8 count + u16…) | type (single u8) | **NO** — the fundamental swap |
| **2** | name string (skip) | models (u8 count + u16…) | **NO** |
| **40** | recolour: count + (u16,u16) | recolour: count + (u16,u16) | **byte-compatible** (only field name differs) |
| **60** | one opcode: count + u16… (list) | opcodes 60-69: one u16 each | **NO** (count-list vs per-opcode) |

- **Body-part-type field is at a different opcode**: 464 reads it at **op12**, LC500 at **op1**.
  The transcode exists precisely to move type 1→12 and models 2→1.
- **Only in 464 (NpcType):** 2(name),12(bodypart),13,14,17,30-34,93,95,97,98,99,100,101,102,
  103,106,107.
- **Only in LC500 (IDKit):** 3(disable), 41(retexture), 61-69(heads 2-5).

### Which decoder matches the RAW 465 cache?

**LC500.** The live probe decoded all 84 raw group-3 entries cleanly under LC500's IDKit rules
(opcodes seen: 1×84, 2×84, 3×12, 40×2, 60×28; zero desync). The 464 decoder would desync on
raw op1 (it expects a models count+u16, gets a single type byte). So:

- LC500 `IdkType.ts` ↔ **raw** 465 IDKit → **MATCH** (no edit needed).
- 464 `IdkType.java` ↔ raw 465 IDKit → mismatch; it only works because the server transcodes.

The entire delta between the two decoders **is** the server's IDKit→NpcType transcode. Serve
raw and LC500 is correct.

---

## Live probe (ground truth)

Read directly from `server/cache` (pre-transcode), replicating `CacheStore`'s idx/dat/decompress/
unpack helpers (`js5-update-server.ts:677-1102`):

```
idx2 groups present: 1..16,18..25
group 3 childCount = 84
2:3 container: compType=1 (bzip2), compLen=383, total=394; decompressed group = 1043 bytes → 84 entries

entry 0  = 01 00 3c 00 3f 02 01 00 e6 00
  op1 type=0 | op60 head[0]=63 | op2 models=[230] | END        (clean native IDKit)
entry 34 = 01 04 28 01 a8 40 11 c6 02 01 00 b0 00
  op1 type=4 | op40 recolour count=1 (a840,11c6) | op2 models=[176] | END

FULL VALIDATION under LC500 IDKit rules: 84 clean, 0 desync
opcode tally: {1:84, 2:84, 3:12, 40:2, 60:28}   (no op41 / op50-59 in this dataset)
```

### Side note (latent server bug, tangential)

`convertIdkitBinaryToNpcType` reads raw op40 as a **single u16** (`:250`), but the raw data is
`count + count×(u16,u16)` (proven by entries 34 & 68 decoding clean only at 4 bytes/pair). On
those two entries the server transcode reads 2 bytes, then hits `0x11`(17) as an "opcode",
fails the unknown-opcode guard (`:266-269`), and replaces the **whole** entry with an empty
`[0]` (`:1203-1204`). Net: idk 34 & 68 lose their body part in the 464 client today. Not part
of the LC500 redirect, but worth a fix when the transcode is revisited.
