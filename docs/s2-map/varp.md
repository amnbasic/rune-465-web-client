# S2 map — VARP (VarpType / player-var config)

Goal: make the Lost City 500 (LC500) web-client fetch + decode **varp** configs from the
465 cache that RuneJS's JS5 update-server serves.

**Bottom line: varp needs NO redirect and NO decoder change.** LC500 already fetches from
`archive 2 / group 16 / file=id` (flat), which is byte-for-byte what the server serves for
the 465 cache. The 464-Java and LC500 varp decoders are opcode-identical (only opcode 0 and
opcode 5 exist). This page documents the proof so a future session doesn't "fix" a
non-problem — the common trap is confusing **archive 16** (LC500 `configLoc`) with the varp
**group 16 inside archive 2**.

---

## (a) 465 cache addressing for varp — as the server serves it

- **Index (archive):** `idx2` (the config index).
- **Group:** `16` (VARPLAYER type-group inside idx2).
- **File:** `varpId` — **flat**, no `id>>8` / `id&0xff` split.
- **Container:** one gzip group holding all varp files concatenated (Js5 file-split trailer).

Verified live against the running update-server (`bun run tools/js5-probe.ts` + a `2:16`
fetch):

```
VARP group (idx2 g16) (2:16): compType=2(gzip) compLen=172 decompLen=5365 numChunks=1
  byte histogram: 0x00=5243  0xff=21  0x05=11  0x01=9 ...
  → 0x05 (opcode 5) appears 11×; everything else is 0x00 terminators / empty varps
```

Server code path (all in `server/src/server/update/js5-update-server.ts`):

- `VARP_ARCHIVE_ID = 16` — line 180 (comment: "464 client Class4_Sub10.method203 reads
  from group 16"). NB the constant is named `*_ARCHIVE_ID` but it is an **idx2 group**, not
  a top-level index.
- `CacheStore.getFile(cacheId, fileId)` — line 677: reads `main_file_cache.idx{cacheId}`
  directly, so a client request for archive `2` maps 1:1 to on-disk `idx2`. No index-number
  remap.
- `remapConfigGroups()` — line 821 + `CONFIG_GROUP_REMAP` (line 195): only groups **9**
  (loc) and **7** (npc-entity) are remapped. **Group 16 (varp) is NOT remapped** — served
  as-is from the 465 cache.
- `applyVarpOverlays()` → `applyConfigOverlays(16, 'varp')` — lines 2008-2013 / 1375: merges
  `data/pack/client/config/varp.{dat,idx}` entries onto idx2 group 16 and rebuilds the group
  + idx2 ref-table + CRC. The merged bytes stay in the standard varp opcode format (this is
  what injects opcode 5 / clientcode for our setting varps).

So the effective served addressing for varp id `N` is **`getFile(255,2)` ref-table → group
16 child list; group container `2:16`; file index `N` within it.**

---

## (b) How LC500 fetches varp now

Files: `web-client/src/config/VarpType.ts`, `web-client/src/js5/Js5.ts`,
`web-client/src/client/Client.ts`.

- **clientConfig source:** `VarpType.configClient` is set by `VarpType.init(configs)` —
  `Client.ts:1209`. `configs` = `Client.configs = this.openJs5(2, true, false, true)` —
  `Client.ts:986`. → **archive index 2** (the config index). Same index the server maps to
  `idx2`.
- **numDefinitions:** `VarpType.configClient.getFileIdLimit(16)` — `VarpType.ts:22`. Reads
  the idx2 ref-table's group-16 child-file count. Server serves the real 465 ref-table, so
  this returns the true varp count.
- **getGroupId:** constant **16** — hard-coded in `getFile(id, 16)` (`VarpType.ts:32`).
- **getFileId:** **flat = `id`** (the varp id). In `Js5.getFile(file, group)` the two-arg
  form calls `fetchFile(null, group, file)` (`Js5.ts:223`) → `unpacked[group=16][file=id]`.
  **No `id>>8` split anywhere.**
- **Decode:** `VarpType.decode` (`VarpType.ts:43`) loops `g1()` opcodes until 0;
  `decodeInner` (`VarpType.ts:55`) handles only opcode `5 → this.clientcode = buf.g2()`.

⚠️ Do not confuse with `Client.configLoc = openJs5(16)` (`Client.ts:1000`), which is a
**separate top-level archive 16** (OSRS loc index). Varp's "16" is a **group inside archive
2**. These are unrelated.

---

## (c) s2Redirect — the concrete edit to VarpType.ts

**None required.** The current `clientConfig` source and addressing already match the 465
served layout exactly:

| Field | LC500 now | 465 server serves | Match? |
|---|---|---|---|
| clientConfig | `Client.configs` = `openJs5(2)` → idx2 | idx2 | ✅ |
| getGroupId | `16` (constant) | idx2 group 16 | ✅ |
| getFileId | `id` (flat) | flat file within group 16 | ✅ |
| numDefinitions | `getFileIdLimit(16)` | idx2 ref-table group-16 child count | ✅ |

So the "edit" is a **no-op confirmation** — leave `VarpType.ts` as-is:

```ts
// VarpType.init(config)   ← config = Client.configs (openJs5(2) = idx2)   [Client.ts:1209 / 986]
VarpType.configClient = config;
VarpType.numDefinitions = VarpType.configClient.getFileIdLimit(16);   // group 16
...
const data = VarpType.configClient.getFile(id, 16);   // group 16, file = id (flat)
```

The only prerequisite is the **shared S2 index plumbing** (making `openJs5(2)` actually reach
the server's `idx2` over the WS/JS5 transport) — that is not varp-specific and is handled by
the S2 JS5-download work, not here.

---

## (d) s3FormatDelta — opcode-level decode differences

**None found.** The 464-Java and LC500 varp decoders are functionally identical.

### 464-Java decoder

- Fetch: `Class4_Sub10.method203(_, varpId)` — `Class4_Sub10.java:45`.
  `Node.aClass19_158.method746(16, 119, varpId)` — line 52. `aClass19_158` is the idx2
  config archive (`Class34.java:85`). `method746(group=16, _, file=varpId)` →
  `method758(null, 16, false, varpId)` (`Class19.java:399,601`) →
  `anObjectArrayArray487[16][varpId]` — **flat group/file**.
- Decode: `Class4_Sub20_Sub15.method605` (`Class4_Sub20_Sub15.java:173`): loop `get()`
  opcodes, break on 0 (`(i ^ 0xffffffff) == -1`), else `method604(i, false, buf)`.
- `method604` (line 165): only `if (opcode == 5) anInt3151 = buf.method209()`.
  `method209` (`StreamBuffer.java:1767`) = big-endian **u16** (`= g2()`).

| opcode | 464-Java action | field | reader |
|---|---|---|---|
| 0 | terminate | — | — |
| 5 | `anInt3151 = read u16` | clientcode (persist/write flag) | `method209` = g2 (BE u16) |
| any other | **ignored, no operand skip** | — | — |

### LC500 decoder (`VarpType.ts`)

| opcode | LC500 action | field | reader |
|---|---|---|---|
| 0 | `return` (terminate) | — | — |
| 5 | `this.clientcode = buf.g2()` | clientcode | `g2` (BE u16) |
| any other | ignored, no operand skip | — | — |

### Delta

| opcode | 464-Java | LC500 | delta |
|---|---|---|---|
| 0 | terminate | terminate | — |
| 5 | u16 → clientcode | u16 → clientcode | — |
| others | none | none | — |

Both are the **truncated 465-era VarpType** — the full OSRS VarpType (which would carry more
opcodes) is not implemented in either, and the served data only ever uses opcode 5 (11
occurrences in the live group; the rest are bare `0x00` terminators). Because neither decoder
skips operands for unknown opcodes, a wider varp would desync both identically — but the 465
cache never emits one, so this is a non-issue.

**Verification method:** read the 464 Java classes (`Class4_Sub10`, `Class4_Sub20_Sub15`,
`Class19.method746/method758`, `StreamBuffer.method209`), read `VarpType.ts` / `Js5.ts` /
`Client.ts`, read `js5-update-server.ts` constants + remap + overlay, and fetched the live
`2:16` group off the running server (probe scripts in scratchpad).
