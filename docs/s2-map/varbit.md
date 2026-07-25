# S2 map — VARBIT (VarBitType / packed-bit var config)

Goal: make the Lost City 500 (LC500) web-client fetch + decode **varbit** configs from the
465 cache that RuneJS's JS5 update-server serves.

**Bottom line: varbit NEEDS a redirect, but NO decoder change.** LC500 currently fetches
varbit from a **separate top-level archive 22** (`configVarbit = openJs5(22)`) with an
OSRS-500 **bit-split** address (`group = id>>10`, `file = id&0x3ff`). The 465 cache has no
such archive — it stores varbit as **`idx2 / group 14 / file = id` (flat)**, exactly like its
sibling varp (group 16). So the fix mirrors the already-correct `VarpType`: point
`VarBitType` at `Client.configs` (archive 2 / idx2) and address `getFile(id, 14)`. The
464-Java and LC500 varbit decoders are byte-identical (only opcode 0 + opcode 1 exist), so
**s3FormatDelta = none**.

---

## (a) 465 cache addressing for varbit — as the server serves it

- **Index (archive):** `idx2` (the config index).
- **Group:** `14` (VARBIT type-group inside idx2).
- **File:** `varbitId` — **flat**, no `id>>8` / `id&0x3ff` split.
- **Container:** one bzip2 group holding all 3925 varbit files concatenated (Js5 file-split
  trailer).

Verified live against the running update-server (`bun run tools/js5-probe.ts` + a parsed
`255:2` ref-table + a `2:14` fetch, scratchpad `probe-varbit.ts`):

```
idx2 ref-table: protocol=6 flags=0 archiveCount=24
  ... group 12: childCount=6953 (seq)
      group 13: childCount=1181 (spotanim)
  >>> group 14: childCount=3925 (VARBIT)
      group 16: childCount=1053 (varp)
group 2:14 container: compType=1(bzip2) compLen=9182 -> decompressed=39251B
  first24 = 01 013e 00 00 00 | 01 013e 01 01 00 | 01 013e 02 02 00 | 01 013e 03 03 00
             ^op ^baseVar ^lsb^msb^term  (each varbit file = 6 bytes)
```

So varbit 0 = {baseVar 0x013e=318, lsb 0, msb 0}; varbit 1 = {318, 1, 1}; varbit 2 =
{318, 2, 2}; … — the canonical `[1][u16 baseVar][u8 lsb][u8 msb][0]` VarBitType format.

Server code path (all in `server/src/server/update/js5-update-server.ts`):

- `CacheStore.getFile(cacheId, fileId)` — line 677: reads `main_file_cache.idx{cacheId}`
  directly, so a client request for archive `2` maps 1:1 to on-disk `idx2`. No index-number
  remap.
- `remapConfigGroups()` — line 821 + `CONFIG_GROUP_REMAP` (line 195): only groups **9**
  (loc ← cache 6) and **7** (npc-entity ← cache 9) are remapped. **Group 14 (varbit) is NOT
  in the remap** — served as-is from the 465 cache.
- **No varbit overlay.** `applyConfigOverlays()` is invoked only for loc(9), obj(10),
  seq(12) — lines 1651/1655/1659 — and varp(16) via `applyVarpOverlays()` (line 2008-2013).
  Group 14 is never rebuilt, so the client receives the raw 465 cache group-14 bytes shown
  above. (The `data/pack/server/varbit.{dat,idx}` in git is the **server engine** varbit
  config, not a client-cache overlay.)

Effective served addressing for varbit id `N`: **`getFile(255,2)` ref-table → group-14 child
list; group container `2:14`; file index `N` within it.**

---

## (b) How LC500 fetches varbit now

Files: `web-client/src/config/VarBitType.ts`, `web-client/src/js5/Js5.ts`,
`web-client/src/client/Client.ts`.

- **clientConfig source:** `VarBitType.configClient` is set by
  `VarBitType.init(configVarbit)` — `Client.ts:1208`. `configVarbit` =
  `Client.configVarbit = this.openJs5(22, true, true, false)` — `Client.ts:1006`. →
  **archive index 22** (an OSRS-500 dedicated varbit index that does **not** exist in the 465
  served cache; idx2 group 22 exists with childCount=214 but is unrelated data, and the
  top-level archive 22 the loader actually opens is not the varbit source the server exposes).
- **getGroupId:** `id & 0x3ff` — `VarBitType.ts:23-25`.
- **getFileId:** `id >>> 10` — `VarBitType.ts:27-29`.
- **fetch:** `getFile(getGroupId(id), getFileId(id))` — `VarBitType.ts:38`. In
  `Js5.getFile(file, group)` the two-arg form calls `fetchFile(null, group, file)`
  (`Js5.ts:194,223`), so the **positional** resolution is
  `file = id&0x3ff`, `group = id>>>10` → `unpacked[group = id>>>10][file = id&0x3ff]`.
  i.e. LC500 native = **archive 22, group = id>>10, file = id&0x3ff** (1024 varbits per
  group — the OSRS-500 layout). This will not resolve against the 465 cache.
- **Decode:** `VarBitType.decode` (`VarBitType.ts:49`) loops `g1()` opcodes until 0;
  `decodeInner` (`VarBitType.ts:61`) handles only opcode
  `1 → basevar = g2(); startbit = g1(); endbit = g1()`.

> Note the helper names are inverted vs. `Js5.getFile(file, group)`: `getGroupId()` (`id&0x3ff`)
> is passed as the **file** arg and `getFileId()` (`id>>10`) as the **group** arg. Net effect
> group = id>>10, file = id&0x3ff. The redirect below discards both helpers.

Also uses `configVarbit` (archive 22) for load-progress (`Client.ts:1038,1066,1172,1190,1191`)
and the login-handshake CRC list (`Client.ts:1580,1627 — loginout.p4(configVarbit.crc)`).
Those are separate from config decode; the CRC-list mismatch is an S4 login concern, not S3.

---

## (c) s2Redirect — the concrete edit

Mirror the already-correct `VarpType` (idx2-group family). Two edits, no decoder change:

### 1. Point clientConfig at idx2 (`Client.ts:1208`)

```ts
// before
VarBitType.init(configVarbit);   // configVarbit = openJs5(22)  ← wrong index for 465 cache
// after
VarBitType.init(configs);        // configs = Client.configs = openJs5(2) = idx2   [Client.ts:986]
```

(`configs` is the same source `VarpType.init(configs)` uses on the next line, 1209.)

### 2. Address idx2 group 14, flat file (`VarBitType.ts`)

```ts
// before  (VarBitType.ts:38)
const data = VarBitType.configClient.getFile(VarBitType.getGroupId(id), VarBitType.getFileId(id));
// after   — file = id (flat), group = 14   (matches Js5.getFile(file, group))
const data = VarBitType.configClient.getFile(id, 14);
```

and delete the now-orphaned helpers `getGroupId` (`VarBitType.ts:23-25`) and `getFileId`
(`VarBitType.ts:27-29`) — they only existed for the archive-22 bit-split. Final `list()`
matches `VarpType.list()` exactly but with group `14` instead of `16`.

`VarBitType` has no `numDefinitions` field, so no `getFileIdLimit` change is required
(unlike `VarpType.ts:22`). Optionally repoint the load-progress/CRC references off
`configVarbit` — but that is cleanup, not needed for decode.

| Field | LC500 now | 465 server serves | Edit |
|---|---|---|---|
| clientConfig | `configVarbit` = `openJs5(22)` | idx2 (archive 2) | → `init(configs)` |
| group | `id >>> 10` | idx2 group **14** | → constant `14` |
| file | `id & 0x3ff` | flat file within group 14 | → flat `id` |
| decode | opcode 1 = u16,u8,u8 | opcode 1 = u16,u8,u8 | none |

---

## (d) s3FormatDelta — opcode-level decode differences

**None found.** The 464-Java and LC500 varbit decoders are byte-identical.

### 464-Java decoder

- Fetch: `Class4_Sub7.method187(varbitId, _)` — `Class4_Sub7.java:25`.
  `DoublyLinkedList.aClass19_1312.method746(14, 95, varbitId)` — line 32. `method746(group=14,
  _, file=varbitId)` → `method758(null, 14, false, varbitId)`
  (`Class19.java:399,404`) → `anObjectArrayArray487[14][varbitId]` — **flat group 14 / file
  = varbitId**. Decoded into `Class4_Sub20_Sub4` via `method358` (line 37).
- Decode: `Class4_Sub20_Sub4.method358` (`Class4_Sub20_Sub4.java:125`): loop `get()`
  opcodes, break on 0 (`(i ^ 0xffffffff) == -1`), else `method356(i, buf, -2)`.
- `method356` (line 116): only `if (opcode == 1)` (`arg2 == (arg0 ^ 0xffffffff)`, arg2=-2 ⇒
  arg0=1) →
  - `anInt2862 = method209()` — **u16 baseVar** (`method209` = BE u16 = g2)
  - `anInt2865 = get()` — **u8 startbit (lsb)**
  - `anInt2846 = get()` — **u8 endbit (msb)**

| opcode | 464-Java action | field | reader |
|---|---|---|---|
| 0 | terminate | — | — |
| 1 | read u16, u8, u8 | baseVar, startbit(lsb), endbit(msb) | `method209`=g2, `get`=g1, `get`=g1 |
| any other | ignored, no operand skip | — | — |

### LC500 decoder (`VarBitType.ts`)

| opcode | LC500 action | field | reader |
|---|---|---|---|
| 0 | `return` (terminate) | — | — |
| 1 | `basevar=g2(); startbit=g1(); endbit=g1()` | basevar, startbit, endbit | g2, g1, g1 |
| any other | ignored, no operand skip | — | — |

### Delta

| opcode | 464-Java | LC500 | delta |
|---|---|---|---|
| 0 | terminate | terminate | — |
| 1 | u16 baseVar + u8 lsb + u8 msb | u16 basevar + u8 startbit + u8 endbit | — (identical) |
| others | none | none | — |

Field-name mapping (same order, same widths): `anInt2862 → basevar`,
`anInt2865 → startbit`, `anInt2846 → endbit`. Both are the 465-era VarBitType with exactly
one payload opcode; the served group-14 data only ever uses opcode 1 (confirmed in the live
`2:14` dump). Neither decoder skips operands for unknown opcodes, but the 465 cache never
emits one, so it is a non-issue.

**Verification method:** read the 464 Java classes (`Class4_Sub7.method187`,
`Class4_Sub20_Sub4.method356/method358`, `Class19.method746`, `StreamBuffer.method209`), read
`VarBitType.ts` / `VarpType.ts` / `Js5.ts` / `Client.ts`, read `js5-update-server.ts`
constants + remap + overlay set, and fetched the live `255:2` ref-table (group 14 present,
childCount 3925) and `2:14` group (decoded as valid `[1][u16][u8][u8][0]` varbits) off the
running update-server. Scratchpad probe: `probe-varbit.ts`.
