# 465 Cache — Definitive Archive Layout Map (vs LC500 rev‑500 assumptions)

**Purpose:** reconcile the on‑disk 465 cache in `server/cache` against the Lost City 500
web‑client (`web-client/src`) so S2 (JS5 download) and S3 (config decode) can be wired
without a Frankenstein layout.

**Read‑only investigation.** Nothing in the cache was modified. Only this doc was written.

---

## 1. How this was verified (evidence sources)

| # | Source | What it proves |
|---|--------|----------------|
| A | Raw cache read — `scratchpad/cache-probe.cjs` (replicates `CacheStore.getFile` + `parseConfigRefTable` from `js5-update-server.ts`) | Ground truth: archive count, each `255:N` ref‑table (groups, child counts, addressing), idx2 group map. **No server needed** — reads `.dat2`/`.idxN` directly. |
| B | `server/src/server/update/js5-update-server.ts` constants + overlay fns | The server’s own idx2 group ids: `CACHE_LOC_GROUP=6`, `CACHE_NPC_GROUP=9`, `OBJ_ARCHIVE_ID=10`, `SEQ_ARCHIVE_ID=12`, `VARP_ARCHIVE_ID=16`, IDKit=3. `applyConfigOverlays(archiveId)` reads `getFile(2, archiveId)` → these are **idx2 group ids, not top‑level indices**. |
| C | 464 Java client (`client/src`) — `Class19` config archive accesses | Independent confirmation of idx2 group ids (see §4). |
| D | LC500 (`web-client/src`) — `config/*Type.ts` + `client/Client.ts` `openJs5`/`*Type.init` | What LC500 *assumes* (rev‑500 split layout) and where it currently fetches. |

`idx255` is **96 bytes = 16 slots → 16 archives (idx 0‑15)**. There is no stored `255:255`
file; the server builds the master CRC table from the 16 `255:N` ref tables. **This is an
old‑style single‑config‑index cache**: all config *types* live as **groups inside idx2**.

---

## 2. Top‑level archives 0‑15 (verified)

`groups` = entries in that index’s `255:N` ref table. `children` = total files across all
groups. All 16 match LC500’s `openJs5(0..15)` labels.

| idx | Content | Verified how | `255:N`: proto/rev, groups, children, names |
|----:|---------|--------------|---------------------------------------------|
| 0 | **anims** (frame archives; each group = 1 seq’s frames) | A + LC500 label | p5 rev0, **1781** groups, **90408** children |
| 1 | **bases** (frame bases / skeletons) | A + LC500 | p5 rev0, **1563** groups, 1563 children (1 each) |
| 2 | **CONFIG** (single config index — all config *types* as groups; see §3) | A + B + C + D | p6 **rev81**, **24** groups, **59729** children |
| 3 | **interfaces** (group = ifId, files = components) | A + C (`Class9.aClass19_275`, `InterfaceLoader`) | p6 rev62, **589** groups, 25103 children |
| 4 | **jagFX** / sound effects | A + C (`JagFX.java`) + LC500 | p6 rev11, **3827** groups, 3827 children |
| 5 | **maps** (`m<x>_<y>` + `l<x>_<y>`) | A (names=true) + `MAP_INDEX_ID=5` in server | p6 rev7, **1852** groups, names=true |
| 6 | **songs** (MIDI) | A (names) + C (`MidiFile.java`) | p5 rev0, **523** groups, names=true |
| 7 | **models** | A + C (`ModelUnlit`) + LC500 | p6 rev45, **27609** groups |
| 8 | **sprites** | A (names) + LC500 | p6 rev10, **952** groups, names=true |
| 9 | **textures** (1 group, files = textures) | A + LC500 | p5 rev0, **1** group, **55** children |
| 10 | **binary** (huffman + misc) | A (names) + LC500 | p5 rev0, **2** groups, names=true |
| 11 | **jingles** (short music) | A + LC500 | p5 rev0, **273** groups |
| 12 | **scripts** (clientscript / cs2) | A (names) + LC500 | p6 rev46, **173** groups, names=true |
| 13 | **fontmetrics / fonts** | A (names) + LC500 | p6 rev1, **10** groups, names=true |
| 14 | **vorbis** (sound) | A + C (`JagVorbis.java`) | p6 rev1, **376** groups |
| 15 | **patches** (MIDI instrument soundbanks / defaults) | A + LC500 label | p5 rev0, **137** groups, maxGroupId 255 |

> **There is no idx 16‑26.** LC500 opens `openJs5(16..26)` (configLoc, configEnum,
> configNpc, configObj, configSeq, configSpot, configVarbit, worldmap, quickchat,
> quickchatGlobal, materials). **None of those indices exist in the 465 cache** — the config
> types they expect live *inside idx2*.

---

## 3. idx2 config groups (the single config index)

Ref table `255:2`: protocol 6, **rev 81**, 24 groups. **Every group is addressed flat:
`fileId == configId`** for the important types (dense `0..N`). Small tables (underlay,
overlay, inv, enum, varp, varclientstring) are sparse but still keyed by `fileId == configId`
via the ref table’s file list — there is **no 256‑way `id>>8` split anywhere in this cache**.

| grp | Config type | childCount | file addressing | Confidence / how |
|----:|-------------|-----------:|-----------------|------------------|
| 1 | **underlay** (flu) | 80 | file=id (sparse 0..149) | **Confirmed** — 464 `SceneGraph.aClass19_2483.method746(1,…)`; LC500 `FluType getFile(id,1)` |
| 2 | *unverified* | 151 | file=id (dense 0..150) | **Unknown for this rev** — not read by 464 client’s config paths; not a modern ConfigType id. Needs decode. |
| 3 | **idkit** (idk) | 84 | file=id (dense 0..83) | **Confirmed** — server IDKit=3; 464 `GroundDecoration.aClass19_1218.method746(3,…)`; LC500 `IdkType getFile(id,3)` |
| 4 | **overlay** (flo) | 124 | file=id (sparse 0..173) | **Confirmed** — 464 `Class1.aClass19_67.method746(4,…)`; LC500 `FloType getFile(id,4)` |
| 5 | **inv** | 514 | file=id (sparse 0..515) | High — LC500 `InvType getFile(id,5)` + modern ConfigType + count plausible |
| 6 | **loc / object** | **26208** | **file=id (dense 0..26207)** | **Confirmed** — server `CACHE_LOC_GROUP=6`; 464 reads loc at remapped grp 9 ⇐ cache 6 |
| 7 | *unverified (native)* | 72 | file=id (dense 0..71) | **Unknown native type.** The 464 server *overrides* served grp 7 with npc (grp9) data; native grp 7’s 72 entries are something else. Needs decode. |
| 8 | **enum** | 687 | file=id (sparse 0..688) | High — modern ConfigType=8 + count plausible (LC500 binds enum to a *different* index, so not client‑confirmed here) |
| 9 | **npc** | **6201** | **file=id (dense 0..6200)** | **Confirmed** — server `CACHE_NPC_GROUP=9`; 464 `PacketBuffer.aClass19_2691.method746(9,…)` is the *remapped* loc view, native = npc |
| 10 | **obj / item** | **11686** | **file=id (dense 0..11685)** | **Confirmed** — server `OBJ_ARCHIVE_ID=10`; 464 `Class4_Sub17.aClass19_2323.method746(10,…)`; LC500 `ObjType` (256‑split — see §5) |
| 11 | **params** | 290 | file=id (dense 0..289) | High — LC500 `ParamType getFile(id,11)` + modern ConfigType |
| 12 | **seq** | **6953** | **file=id (dense 0..6952)** | **Confirmed** — server `SEQ_ARCHIVE_ID=12`; 464 `…aClass19_3371.method746(12,…)` |
| 13 | **spotanim** | 1181 | file=id (dense 0..1180) | **Confirmed** — 464 `Class1.aClass19_80.method746(13,…)`; LC500 `SpotType` (256‑split — §5) |
| 14 | **varbit** | 3925 | file=id (dense 0..3924) | **Confirmed** — 464 `DoublyLinkedList.aClass19_1312.method746(14,…)`; LC500 `VarBitType` (1024‑split — §5) |
| 15 | **varclientstring** | 24 | file=id (sparse 1..24) | Medium — modern ConfigType=15 |
| 16 | **varp** | 1053 | file=id (sparse 0..1053) | **Confirmed** — server `VARP_ARCHIVE_ID=16`; 464 `Node.aClass19_158.method746(16,…)`; LC500 `VarpType getFile(id,16)` |
| 18 | *unverified* | 159 | file=id (dense 0..158) | Unknown for this rev. Needs decode. |
| 19 | **varclient** | 41 | file=id (dense 0..40) | Medium — modern ConfigType=19 |
| 20 | *unverified* | 9 | file=id (dense 0..8) | Unknown. Needs decode. |
| 21 | *unverified* | 8 | file=id (dense 0..7) | Unknown. Needs decode. |
| 22 | *unverified* | 214 | file=id (dense 0..213) | Unknown. Needs decode. |
| 23 | *unverified* | 53 | file=id (dense 0..52) | Unknown. Needs decode. |
| 24 | *unverified* | 11 | file=id (dense 0..10) | Unknown. Needs decode. |
| 25 | *unverified* | 1 | file=id ([0]) | Unknown. Needs decode. |

**Absent:** group 0, **group 17**, and **group 26**. LC500 binds `StructType` to
`getFile(id, 26)` — **group 26 does not exist in this 465 cache** (structs are a post‑465
addition). Struct lookups will return null; harmless at login.

The 13 login‑critical types (underlay, idkit, overlay, inv, loc, enum, npc, obj, param, seq,
spotanim, varbit, varp) are all **flat: `configs.getFile(configId, group)`**.

---

## 4. 464 Java client cross‑check (index B/C reconciliation)

All of these are aliases of the **same idx2 object** (assigned in `Class31`), reading config
groups via `method746(group, _, fileId)` (`Class19.method746` → `method758(null, group, false, fileId)`):

```
grp 1  underlay   SceneGraph.aClass19_2483        (GraphicsBufferProducer:391)
grp 3  idkit/npc  GroundDecoration.aClass19_1218  (Isaac:57, count Class31:71)
grp 4  overlay    Class1.aClass19_67              (Class4_Sub6:214)
grp 7  npc‑entity PacketBuffer.aClass19_2691      (MenuBuilder:590)   ← server‑remapped view
grp 9  loc        PacketBuffer.aClass19_2691      (MenuBuilder:611, Region:169) ← remapped view
grp 10 obj        Class4_Sub17.aClass19_2323      (Class4_Sub23:46)
grp 12 seq        …aClass19_3371                  (WallObject:45)
grp 13 spotanim   Class1.aClass19_80              (SceneBuilder:42)
grp 14 varbit     DoublyLinkedList.aClass19_1312  (Class4_Sub7:32)
grp 16 varp       Node.aClass19_158               (Class4_Sub10:52)
```

> **The 464 client expects loc@9 and npc@7**, so the server *remaps* the cache for a 464
> handshake: `CONFIG_GROUP_REMAP = { 9←cache6 (loc), 7←cache9 (npc) }`, then re‑encodes
> npc→LocType (`convertNpcEntries`, grp 7) and idkit→NpcType (`convertIdkitEntries`, grp 3).
> **This is the Frankenstein hazard for LC500 — see §6.**

---

## 5. LC500 rev‑500 assumptions vs 465 reality (the mismatches)

`Js5.getFile(file, group)` — **first arg = file, second arg = group container**
(`getFile(a,b) → fetchFile(null, b, a) → unpacked[b][a]`, `Js5.ts:191‑224`).

Wiring (`Client.ts:1000‑1006`, `1198‑1212`):

| LC500 Type | bound Js5 | fetch call | means (group, file) | 465 reality | verdict |
|------------|-----------|------------|---------------------|-------------|---------|
| FluType | `configs`=openJs5(**2**) | `getFile(id, 1)` | idx2 g1, file=id | idx2 g1 flat | ✅ **matches** |
| FloType | configs(2) | `getFile(id, 4)` | idx2 g4, file=id | idx2 g4 flat | ✅ matches |
| IdkType | configs(2) | `getFile(id, 3)` | idx2 g3, file=id | idx2 g3 flat | ✅ matches |
| InvType | configs(2) | `getFile(id, 5)` | idx2 g5, file=id | idx2 g5 flat | ✅ matches |
| ParamType | configs(2) | `getFile(id, 11)` | idx2 g11, file=id | idx2 g11 flat | ✅ matches |
| VarpType | configs(2) | `getFile(id, 16)` | idx2 g16, file=id | idx2 g16 flat | ✅ matches |
| StructType | configs(2) | `getFile(id, 26)` | idx2 g26, file=id | **g26 absent** | ⚠️ returns null (no structs this rev) |
| **LocType** | configLoc=openJs5(**16**) | `getFile(id&0xff, id>>8)` | idx**16** g=id>>8, file=id&0xff (256‑split) | **idx16 absent**; loc is idx2 **g6 flat** | ❌ **wrong index + wrong addressing** |
| **NpcType** | configNpc=openJs5(**18**) | `getFile(id&0x7f, id>>7)` | idx**18** (128‑split) | **idx18 absent**; npc is idx2 **g9 flat** | ❌ wrong index + addressing |
| **ObjType** | configObj=openJs5(**19**) | `getFile(id&0xff, id>>8)` | idx**19** (256‑split) | **idx19 absent**; obj is idx2 **g10 flat** | ❌ wrong index + addressing |
| **SeqType** | configSeq=openJs5(**20**) | `getFile(id&0x7f, id>>7)` | idx**20** (128‑split) | **idx20 absent**; seq is idx2 **g12 flat** | ❌ wrong index + addressing |
| **SpotType** | configSpot=openJs5(**21**) | `getFile(id&0xff, id>>8)` | idx**21** (256‑split) | **idx21 absent**; spotanim is idx2 **g13 flat** | ❌ wrong index + addressing |
| **VarBitType** | configVarbit=openJs5(**22**) | `getFile(id&0x3ff, id>>10)` | idx**22** (1024‑split) | **idx22 absent**; varbit is idx2 **g14 flat** | ❌ wrong index + addressing |
| **EnumType** | configEnum=openJs5(**17**) | `getFile(id&0xff, id>>8)` | idx**17** (256‑split) | **idx17 absent**; enum is idx2 **g8 flat** | ❌ wrong index + addressing |

**Summary of LC500 mismatches:**
1. 7 top‑level indices LC500 opens (16‑22) **do not exist** in the 465 cache; the data is
   inside idx2. `openJs5(16..26)` will download empty/absent indices.
2. The 7 split types use `id>>8 / id>>7 / id>>10` group splitting; the 465 cache stores them
   **flat (`file == configId`, single group per type)**.
3. `StructType` reads group 26 which is absent (no structs this rev).
4. The 6 flat types (Flu/Flo/Idk/Inv/Param/Varp) already read idx2 correctly — **no change**.

---

## 6. The 464‑remap hazard (why the server layer matters)

LC500 must handshake as **version 464** (`EXPECTED_VERSION=464`; a 465 handshake is rejected
with code 6). So the server serves LC500 the **464‑remapped** idx2, not the raw cache:

| served grp | content for a 464 handshake |
|-----------:|------------------------------|
| 6 | loc — **raw 465** (untouched; no MOBA overlays) |
| 9 | loc — override (cache g6) **+ MOBA loc overlays**; **native npc is clobbered here** |
| 7 | npc **re‑encoded as LocType** (lossy Frankenstein) |
| 3 | idkit **re‑encoded as NpcType** (idkit only) |
| 10/12/13/14/8/5/11/16/1/4 | raw 465 (obj/seq/spotanim/varbit/enum/inv/param/varp/underlay/overlay — untouched) |

**Consequence:** with the remap active, **clean 465 `NpcType` and `IDKit` are not served
anywhere** — npc arrives as LocType (grp 7) and idkit as NpcType (grp 3), and grp 9 returns
loc instead of npc. This is exactly the “Frankenstein” S3 is meant to prevent.

---

## 7. Recommended global remap for LC500

### Part A — server (required for clean npc + idkit)
Serve LC500 the **raw 465 cache**: bypass `remapConfigGroups()`, `convertNpcEntries()`,
`convertIdkitEntries()` (and don’t force loc→grp9) for LC500’s connection — e.g. gate those
transforms to the legacy 464 Java client only, and give LC500 a distinct handshake/subprotocol
that serves the untouched index. Then idx2 is native: loc=g6, npc=g9, obj=g10, seq=g12,
spotanim=g13, varbit=g14, enum=g8, inv=g5, param=g11, varp=g16, idkit=g3, underlay=g1,
overlay=g4 — all flat `file=configId`, all clean 465 binary.

*(If the server keeps the remap: loc/obj/seq/spotanim/varbit/enum stay clean and can be read
per Part B, but npc would have to come from grp 7 as LocType and idkit from grp 3 as NpcType —
the Frankenstein path. Not recommended.)*

### Part B — client (`web-client`)
Rebind the 7 split types to `configs` (idx2) and switch to flat addressing. Since
`getFile(file, group)`, flat = `configs.getFile(configId, GROUP)`:

`Client.ts:1202‑1212`:
```
LocType.init(configs, models, …)     // was configLoc
NpcType.init(configs, models)        // was configNpc
ObjType.init(memServer, configs, …)  // was configObj
SeqType.init(configs, anims, bases)  // was configSeq
SpotType.init(models, configs)       // was configSpot
VarBitType.init(configs)             // was configVarbit
EnumType.init(configs)               // was configEnum
```

In each Type’s `list()` (make `getFile(configId, GROUP)`; simplest is to set
`getGroupId(id)=id`, `getFileId(id)=GROUP`, since the call is `getFile(getGroupId, getFileId)`
= `getFile(file, group)`):

| Type | new call | GROUP |
|------|----------|------:|
| LocType | `configClient.getFile(id, 6)` | 6 |
| NpcType | `configClient.getFile(id, 9)` | 9 |
| ObjType | `configClient.getFile(id, 10)` | 10 |
| SeqType | `configClient.getFile(id, 12)` | 12 |
| SpotType | `configClient.getFile(id, 13)` | 13 |
| VarBitType | `configClient.getFile(id, 14)` | 14 |
| EnumType | `configClient.getFile(id, 8)` | 8 |

`numDefinitions`/`getGroupCount`/`getFileIdLimit` uses that currently assume the split (e.g.
`ObjType.init` computes `groups*256 + getFileIdLimit(groups)`) must switch to
`getFileIdLimit(GROUP)` on idx2. Flat types (1/3/4/5/11/16) unchanged. `StructType(26)` = no‑op
(absent). `openJs5(16..22)` can stop being opened (dead indices); 23‑26 (worldmap/quickchat/
materials) are a separate question outside config decode.

### Format note (S3, out of scope here)
This pass maps **addressing**, not opcode formats. Whether LC500’s `*Type.decode` matches the
raw 465 opcode stream is S3’s job. The 464 Java decoders referenced by
`js5-update-server.ts` (`convertNpcBinaryToLocType`, `convertIdkitBinaryToNpcType`, opcode
maps) are a useful reference for 465 opcode semantics per type.

---

## Appendix — reproduce
`node scratchpad/cache-probe.cjs` (path in the session scratchpad) dumps every `255:N` ref
table and the idx2 group map from the raw `.dat2`/`.idxN`. Cache dir:
`server/cache`.
