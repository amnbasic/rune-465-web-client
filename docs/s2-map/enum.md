# S2 map — ENUM (EnumType / key→value lookup config)

Goal: make the Lost City 500 (LC500) web-client fetch + decode **enum** configs from the
465 cache that RuneJS's JS5 update-server serves.

**Bottom line: enum NEEDS a redirect, but NO decoder change.** Unlike varp (which already
points at `archive 2`), LC500's EnumType is wired to `Client.configEnum = openJs5(17)` — a
**top-level archive 17 that does not exist in the served cache** (the master index advertises
only archives 0–15 + 255; there is no `idx17` on disk). So today every `EnumType.list()`
returns `null` bytes → every enum silently decodes to its defaults. The 465 cache actually
holds enums at **idx2 group 8, file = id (flat)**. The 464-Java and LC500 enum decoders are
opcode-identical (1–6), so only the fetch address changes.

---

## (a) 465 cache addressing for enum — as the server serves it

- **Index (archive):** `idx2` (the config index).
- **Group:** `8` (ENUM type-group inside idx2).
- **File:** `enumId` — **flat**, no `id>>8` / `id&0xff` split.
- **Container:** one group holding all enum files concatenated (Js5 file-split trailer).

Verified live against the running update-server. The idx2 ref-table (`255:2`, gzip,
decompresses to 172126 B) lists these groups (`scratchpad/probe_idx2.ts`):

```
grp | childCount | first | last      grp | childCount | first | last
  1 |     80     |  0  149            12 |   6953 (seq) |  0  6952
  2 |    151     |  0  150            13 |   1181       |  0  1180
  3 |     84 (idk)|  0   83           14 |   3925       |  0  3924
  4 |    124     |  0  173            15 |     24       |  1    24
  5 |    514     |  0  515            16 |   1053 (varp)|  0  1053
  6 |  26208 (loc)| 0  26207          18 |    159   19 | 41   20 | 9
  7 |   6201 (npc-client)             21 |      8   22 | 214  23 | 53
  8 |    687 (ENUM)| 0   688          24 |     11   25 | 1
  9 |  26208 (loc→client remap)      (NB: group 17 does NOT exist)
 10 |  11736 (obj)| 0  11739
```

Group **8 = 687 enum files (ids 0..688)**. Server code path
(`server/src/server/update/js5-update-server.ts`):

- `CacheStore.getFile(cacheId, fileId)` — line 677: a client request for archive `2` maps
  1:1 to on-disk `idx2`. No index-number remap.
- `remapConfigGroups()` — line 821 + `CONFIG_GROUP_REMAP` (line 195): only groups **9** (loc)
  and **7** (npc-entity) are remapped. **Group 8 (enum) is NOT remapped** — served as-is from
  the 465 cache. There is no enum-specific constant/overlay anywhere in the update-server (it
  is pure passthrough).

So the effective served addressing for enum id `N` is: `getFile(255,2)` ref-table → group-8
child list → group container `2:8` → file index `N` within it.

---

## (b) How LC500 fetches enum now  ⚠ BROKEN

Files: `web-client/src/config/EnumType.ts`, `web-client/src/js5/Js5.ts`,
`web-client/src/client/Client.ts`.

- **clientConfig source:** `EnumType.configClient` is set by `EnumType.init(configEnum)` —
  `Client.ts:1212`. `configEnum` = `Client.configEnum = this.openJs5(17, true, true, false)`
  — `Client.ts:1001`. → **top-level archive index 17.**
  **This archive is not served.** The served cache has `idx0..idx15` + `idx255` only, and the
  master CRC table (`getFile(255,i)` loop, line 796) advertises `idx255.length/6 = 16`
  archives (0–15). A request for archive 17 has no on-disk `idx17` → `null`.
- **getGroupId:** `id & 0xff` — `EnumType.ts:31-33`.
- **getFileId:** `id >>> 8` — `EnumType.ts:35-37`.
- **Fetch call:** `EnumType.configClient.getFile(getGroupId(id), getFileId(id))` —
  `EnumType.ts:45` = `getFile(file=id&0xff, group=id>>8)`. In `Js5.getFile(file, group)`
  (numeric overload, `Js5.ts:192`) this is the OSRS **split-archive** scheme (archive 17
  bucketed 256 enums/group). It only works if archive 17 exists — it doesn't here.

Net effect today: every enum → default (`defaultInt=0` / `defaultString='null'`).

---

## (c) s2Redirect — the concrete edit

Repoint EnumType from the non-existent split archive 17 to `idx2 group 8, file=id`, matching
the `configs`-based idiom the other idx2 configs (VarpType `getFile(id,16)`, ParamType
`getFile(id,11)`) already use.

**1. `web-client/src/client/Client.ts:1212`** — change the archive passed to init:

```ts
// was:  EnumType.init(configEnum);      // configEnum = openJs5(17)  ← not served
EnumType.init(configs);                  // configs   = openJs5(2)   = idx2   [Client.ts:986]
```
(`configs` is already the in-scope local — `ParamType.init(configs)` at 1198 uses it.)

**2. `web-client/src/config/EnumType.ts:45`** — flat group/file address:

```ts
// was:  const data = EnumType.configClient.getFile(EnumType.getGroupId(id), EnumType.getFileId(id));
const data = EnumType.configClient.getFile(id, 8);   // idx2 group 8 (enum), file = id (flat)
```

**3. `web-client/src/config/EnumType.ts:31-37`** — delete the now-unused `getGroupId`
(`id & 0xff`) and `getFileId` (`id >>> 8`) helpers (the split-archive math). Optional: mirror
VarpType by adding `EnumType.numDefinitions = config.getFileIdLimit(8)` in `init`, but nothing
currently reads it, so it can be omitted.

| Field | LC500 now (broken) | After redirect | 465 server serves |
|---|---|---|---|
| clientConfig | `configEnum` = `openJs5(17)` (absent) | `configs` = `openJs5(2)` → idx2 | idx2 |
| group | `id>>8` (split) | `8` (constant) | idx2 group 8 |
| file | `id&0xff` (split) | `id` (flat) | flat file within group 8 |

Prerequisite: the shared S2 index plumbing must make `openJs5(2)` actually reach the server's
`idx2` over the JS5/WS transport — not enum-specific, handled by the S2 JS5-download work.

---

## (d) s3FormatDelta — opcode-level decode differences

**None found.** The 464-Java enum decoder and LC500's are opcode-for-opcode identical; only
the fetch address (section c) and incidental storage differ.

### 464-Java decoder

- **Class:** `Class4_Sub20_Sub5` (`Class4_Sub20_Sub5.java`) — the EnumType. Fields:
  `anInt2874`(keyType), `anInt2876`(valType), `aClass26_2878`(defaultString),
  `anInt2881`(defaultInt), `anIntArray2870`(keys), `aClass26Array2877`(string vals),
  `anIntArray2872`(int vals). Parallel-array value store (LC500 uses a `HashTable`).
- **Fetch:** `Class38.method922(enumId, _)` — `Class38.java:137`.
  `Model.aClass19_2579.method746(8, (byte)115, enumId)` — line 146 (`aClass19_2579` is an alias
  of the idx2 config archive; `method746(group=8, _, file=enumId)`). Cached in
  `Class12.aClass66_367 = new LruCache(64)` (`Class12.java:37`). Decode via
  `Class4_Sub20_Sub5.method363` — line 150.
- **Decode loop:** `method363` (`Class4_Sub20_Sub5.java:115`): read `get()` opcodes, break on
  0, else `method361(op, -2, buf)`.
- **Reader map** (`StreamBuffer.java`): `get()`=u8 (1864); `method209`=BE u16 (1767);
  `method212`=string (1806); `method219`=BE i32 (1885).

| opcode | 464-Java action (`method361`, line 81) | field | reader |
|---|---|---|---|
| 0 | terminate | — | — |
| 1 | `anInt2874 = get()` | keyType | u8 |
| 2 | `anInt2876 = get()` | valType | u8 |
| 3 | `aClass26_2878 = method212()` | defaultString | string |
| 4 | `anInt2881 = method219()` | defaultInt | i32 |
| 5 | `n=method209()`; loop `keys[i]=method219()`, `strVals[i]=method212()` | string map | u16 count, then (i32 key, string val)×n |
| 6 | `n=method209()`; loop `keys[i]=method219()`, `intVals[i]=method219()` | int map | u16 count, then (i32 key, i32 val)×n |

### LC500 decoder (`EnumType.ts`, `decodeInner` line 68)

| opcode | LC500 action | field | reader |
|---|---|---|---|
| 0 | `return` | — | — |
| 1 | `this.inputtype = buf.g1()` | inputtype (=keyType) | g1 (u8) |
| 2 | `this.outputtype = buf.g1()` | outputtype (=valType) | g1 (u8) |
| 3 | `this.defaultString = buf.gjstr()` | defaultString | gjstr (string) |
| 4 | `this.defaultInt = buf.g4()` | defaultInt | g4 (i32) |
| 5 | `count=buf.g2()`; loop `key=buf.g4()`, `StringNode(buf.gjstr())` | string map | g2 count, (g4 key, string val)×count |
| 6 | `count=buf.g2()`; loop `key=buf.g4()`, `IntNode(buf.g4())` | int map | g2 count, (g4 key, i32 val)×count |

### Delta

| opcode | 464-Java | LC500 | delta |
|---|---|---|---|
| 0 | terminate | terminate | — |
| 1 | u8 keyType | g1 inputtype | — |
| 2 | u8 valType | g1 outputtype | — |
| 3 | string default | gjstr default | — |
| 4 | i32 default | g4 default | — |
| 5 | u16 count, (i32,string)× | g2 count, (g4,string)× | — |
| 6 | u16 count, (i32,i32)× | g2 count, (g4,i32)× | — |

Wire format is byte-identical. Non-format differences (do **not** affect decode):
- **Value storage:** Java parallel arrays vs LC500 `HashTable` — same logical map.
- **LRU size:** Java `LruCache(64)` vs LC500 `LruCache(128)` — capacity only.

Neither decoder skips operands for unknown opcodes, but the 465 enum stream only uses 1–6, so
there is no desync risk.

---

**Verification method:** read 464-Java `Class4_Sub20_Sub5`, `Class38.method922`,
`Class4_Sub10`/`Class34` (idx2-group fetch idiom), `StreamBuffer.method209/212/219/get`; read
`EnumType.ts` / `VarpType.ts` / `ParamType.ts` / `Js5.ts` (getFile arg order) / `Client.ts`
(openJs5 map + init); read `js5-update-server.ts` constants + `remapConfigGroups`; and decoded
the live `255:2` idx2 ref-table off the running update-server to confirm group 8 = 687 enum
files and that group 17 does not exist.
