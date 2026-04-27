# UPSET -- Comprehensive Code Audit (AUDIT2)

**File:** `index.html` (4107 lines, single-file HTML game)
**Date:** 2026-04-15

---

## 1. ZONE BACKGROUND SYSTEM

### ZONE_BGS Array (line 81-86)
```
ZONE_BGS = [
  {name:"LANDING ZONE",   file:"stage1_bg.png",        startX:0,    endX:3000, parallax:0.3},
  {name:"ENTERING THE BASE", file:"stage1_cavemouth.png", startX:3000, endX:3500, parallax:0.2},
  {name:"TUNNEL",          file:"stage1_tunnel.png",     startX:3500, endX:3900, parallax:0.1},
  {name:"ALIEN BASE",      file:"stage1_base.png",       startX:3900, endX:7000, parallax:0.5}
]
```

**FADE value:** `FADE = 60` (line 110) -- confirmed at 60.

**drawZoneImg (line 93-104):**
- Guards for incomplete images: YES -- checks `!img || !img.complete || img.naturalWidth===0`
- Guards for NaN/Infinity: YES -- checks `!isFinite(px) || !isFinite(sw) || sw<=0`
- Uses globalAlpha for opacity crossfade

**drawStageBG (line 106-151):**
- Zone detection uses `camCenter = cameraX + W/2` to find current zone index
- Crossfade logic: blends with at most ONE adjacent zone (never two)
- Near start of zone: blends with previous zone, `blendAmt = 1 - (intoZone/FADE)`
- Near end of zone: blends with next zone, `blendAmt = 1 - (toZoneEnd/FADE)`
- Fallback if current image not loaded: fills with `stageData.bg` color
- Tunnel atmosphere overlay: extra dark fill + orange glow lights at fixed positions
- Standard stages (2-4): single-image parallax from STAGE_BG_FILES

### Zone Boundary Issue (MEDIUM)
The ZONE_BGS endX values (0-3000, 3000-3500, 3500-3900, 3900-7000) cover 7000px total, but the stage `zones` property inside STORY_STAGES[0] defines different endX values: `{endX:2800}, {endX:3400}, {endX:6900}`. The drawStageBG function uses ZONE_BGS (the global array), not the stage's `zones` array, for actual rendering. The stage `zones` array is only used for the HUD zone name display (line 3655). These two definitions are slightly misaligned (e.g. 3000 vs 2800 for Landing Zone end), but since drawing uses the global ZONE_BGS and the HUD uses the stage zones, there is no runtime crash -- just a potential visual mismatch where the HUD says "TUNNEL" but the background hasn't transitioned yet.

**STAGE_BG_FILES (line 75-79):** Maps stage names to image files for stages 2-4. Loading is fire-and-forget with onerror console.warn.

### Verdict: Zone BG system is solid and well-guarded. Minor naming/boundary mismatch between ZONE_BGS and stage zones array.

---

## 2. MERGED STAGE STRUCTURE

**STORY_STAGES array (lines 521-649):** 4 stages total.

| Stage | ID | Name | Width | Boss | Notes |
|-------|-----|------|-------|------|-------|
| 1 | 1 | LANDING ZONE | 6900px | None | Combined stage: Desert (0-3000) + Tunnel (3000-3400) + Alien Base (3400-6900). Has zones, tunnelRange, spikes, movingPlats, acidPools, turrets, breakableWalls, ammoCrates, weaponPickups |
| 2 | 2 | THE DREADNOUGHT | 1800px | MEGA GRUNT (200 HP) | jumpPads, disappearPlats. Short teaching level. |
| 3 | 3 | THE HIVE | 4000px | None | Full gauntlet: crumblePlats, acidPools, turrets, jumpPads, movingPlats, disappearPlats, breakableWalls. |
| 4 | 4 | THRONE OF THE HIVE QUEEN | 1800px | HIVE QUEEN (350 HP) | Final boss, minimal platforming. |

**Key observations:**
- Stage 1 is the large combined 6900px level as expected
- Stages 2-4 are the former stages 3-5 (comments in code confirm: "STAGE 3: THE DREADNOUGHT", etc.)
- Victory triggers at stage >= 4 (line 3295)
- Difficulty scales by player count: HP x1.4 for 2P, x1.8 for 3P; damage x1.2/x1.4

---

## 3. NEW FEATURES STATUS

### Feature Status Table

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Musical stings (playMusicalSting) | NOT IMPLEMENTED | N/A | No function found. No sting on boss intro, stage clear, etc. |
| Enemy variants (green/red/gold) | NOT IMPLEMENTED | N/A | All enemies use single color from ENEMY_DEFS. No variant system. |
| Health bars on enemies | IMPLEMENTED | Line 3454-3458 | Shows when HP < maxHP. Green bar over enemy head. |
| Boss intro cutscenes | NOT IMPLEMENTED | N/A | Boss activates silently when player enters range (line 2986). No cutscene, no name reveal animation. |
| Stage transition briefings | NOT IMPLEMENTED | N/A | Shop screen appears between stages, but no narrative/mission briefing. |
| Halo Magnum pistol design in drawGun | IMPLEMENTED | Lines 1106-1133 | Detailed multi-part design: receiver, slide cuts, orange front sight, grip texture, trigger guard, magazine well. Labeled "Halo Magnum style" in comment. |
| Pause menu in story mode with stats | IMPLEMENTED | Lines 3704-3738 | Shows stage, lives, coins, per-player weapon/HP, owned cards. Two options: RESUME, QUIT TO TITLE. |
| Manual reload (X button) | NOT IMPLEMENTED | N/A | Reload is automatic when ammo hits 0. No X/key binding for manual reload. Controller X is mapped to shoot. |
| LIFE STEAL card | IMPLEMENTED | Line 310 | `lifesteal2` card: "+LIFE STEAL", heals on kills, lifeSteal:3. Also VAMPIRE card (line 295). |
| COIN MAGNET card | IMPLEMENTED | Line 311 | `coinmagnet` card: coinMagnetRange:50. Magnet effect coded at lines 3198-3209. |
| LUCKY card | IMPLEMENTED | Line 312 | `lucky` card: luckyMultiplier:0.5. Applied at coin drop (line 3118). |
| Ammo crates | IMPLEMENTED | Lines 570, 591, 629, 3189-3196 | Present in all 4 stages. Refills weapon ammo + 1 grenade. Visual: brown box with bullet icon. |
| Shop improvements (heal, reroll) | IMPLEMENTED | Lines 3748-3837 | ARMORY screen: weapon shop (5 weapons), FULL HEAL (20 coins), card shop (60 coins each), REROLL (10 coins). |
| Grenades (LT / keyboard) | IMPLEMENTED | Lines 1793-1797, 2766 | Controller LT throws grenade. 3 starting grenades per player. 1.5s fuse, 70px blast radius. |
| Weapon switching (Y/RB) | IMPLEMENTED | Lines 1781-1792 | Cycles through owned weapons on Y or RB press. |
| Dash (B button) | IMPLEMENTED | Lines 1776-1779 | B button dash with 1s cooldown. 8-frame dash at 14x speed. Trail afterimages. |
| Wall jump | IMPLEMENTED | Lines 1812-1815 | Kick off wall with 6x horizontal + -10 vertical. Wall slide particles. |
| Bomber enemy type | IMPLEMENTED | Lines 652-656, 2919-2957 | Flying suicide bomber with wings. Explodes on contact or surface hit. 60px radius, 50% maxHP damage. |
| Multi-player co-op (story) | IMPLEMENTED | Lines 2816-2852 | Up to 3 players in story mode. Full input/physics for each. |
| Revive system | IMPLEMENTED | Lines 3248-3282 | Downed players have 3s revive window. Alive player auto-revives by proximity, transfers 30% HP. |
| Kill streaks | IMPLEMENTED | Lines 2111-2117 | DOUBLE KILL, TRIPLE KILL, UNSTOPPABLE text. |
| Ragdoll death | IMPLEMENTED | Lines 2154-2165 | 6-part ragdoll: head, body, 2 legs, 2 arms with physics. |

---

## 4. MISSION BOARD

**Location:** Lines 3869-4099

The Mission Board IS the main menu. It replaces the old title screen on game start (line 4103: `startMissionBoard()`).

**Flow:**
1. Splash phase: "PRESS ANY BUTTON TO START" with animated commandos + muzzle flashes
2. Main board: 3 modes displayed in a military-style board UI:
   - CAMPAIGN (routes to story mode, 1-3 players sub-menu)
   - VERSUS (routes to classic mode, 2P/3P/4P/2v2 sub-menus)
   - GUN GAME (routes to gungame mode, 2P/3P/4P sub-menus)
3. Sub-panel: mode-specific player count selection
4. `launchMode()` sets gameType/gameMode/storyPlayers and calls `startMatch()`

**All 3 modes routed correctly:** YES. Campaign -> story, Versus -> classic, Gun Game -> gungame.

**Old title screen still exists** at `renderTitle()` (line 1375) and is accessible via `goTitle()`. The old title screen has its own mode/settings system that parallels the Mission Board. This is redundant -- `goTitle()` is called from pause menu "MAIN MENU" option in versus mode (line 1016) but it calls `startMissionBoard()` (line 1547), so the old renderTitle screen is only reachable through the mission board's MODE sub-panel internally.

### Issue (LOW): The old title screen code (renderTitle, menuSub, menuRowCount, etc.) at lines 1375-1427 is partially dead code. `goTitle()` at line 1547 calls `startMissionBoard()`, making the old HTML-based title screen unreachable. However, the versus pause menu "MAIN MENU" option still uses `goTitle()` which correctly redirects. The `showScreen("title")` path and `renderTitle()` remain but are only reachable from internal mission board navigation.

---

## 5. CORE GAMEPLAY VERIFICATION

### Modes
| Mode | Exists | Entry Point |
|------|--------|-------------|
| Versus (classic) | YES | startMatch -> startRound + startGameLoop |
| Gun Game | YES | startMatch -> startRound + startGameLoop (GG_WEAPONS progression) |
| Story | YES | startMatch -> startStory -> loadStoryStage + startStoryLoop |

### Weapons (GG_WEAPONS array, lines 511-519)
7 weapons: PISTOL, SMG, SHOTGUN, SNIPER, ROCKET, BOUNCER, GOLDEN GUN. Each has: ammo, fireRate, damage, speed, spread, count, sz, bounces, explode, color, crateRefill, icon.

### Cards
34 total cards defined (lines 267-313). Categories: offense, defense, movement, utility, wild. Rarity system (COMMON/UNCOMMON/RARE).

### Arenas (versus mode)
8 arenas: WAREHOUSE, ICE RINK, RUINS, VOLCANO, SPACE, FOREST, FORTRESS, NEON. Each with multiple layouts (4-5 per arena), unique hazards (icicles, lava pits, sawblades, moving platforms).

### Core Mechanics
- Dash: Double-tap or B button, afterimage trail
- Wall jump: Wall slide + jump input
- Wall slide: Friction lines drawn, slows descent
- Wall wrap: Bottom zone wraps horizontally, top zone has solid walls
- Screen shake, hitstop, slow-mo on KO
- Missiles: Homing projectiles from pickup
- Grenades: Throwable with physics, 1.5s fuse

---

## 6. STATE MANAGEMENT

### Mode Cleanup
- `startMissionBoard()` (line 3884): Cancels mbAnimId, animId, menuAnimId, storyAnimId. Stops music. Properly cleans up all animation loops.
- `startMatch()` (line 1549): Cancels mbAnimId. Resets frame, prevPad.
- `startStory()` (line 2626): Cancels mbAnimId. Calls initStory + loadStoryStage.
- `startGameLoop()` (line 1694): Cancels animId, menuAnimId, mbAnimId.
- `startStoryLoop()` (line 2692): Cancels storyAnimId, animId, menuAnimId.
- `goTitle()` (line 1547): Resets scores, pcards, rWin, mWin, rnd, menuRow, menuSub. Calls startMissionBoard.

### Potential Leaks

**CRITICAL: storyState persists across mode switches.** `storyState` is a global variable initialized in `initStory()` but never nulled out when switching to versus/gun game modes. The `storyState.player` getter could return stale data if something references it after leaving story mode. However, the code guards against this well -- story functions check `if(!ss.players.length)` and story-specific loops only run when `gameType==="story"`.

**MEDIUM: Global `g` state not cleaned on story mode entry.** When entering story mode, `g` (the versus game state) is not explicitly set to null. The story loop doesn't use `g` directly, but the versus `draw()` function references `g` and could theoretically be called if an old animId fires before cancellation completes. In practice, the cancellation happens synchronously before the new loop starts, so this is very low risk.

**MEDIUM: setTimeout in gun game respawn (line 2138-2152).** Uses `setTimeout` with 1500ms delay. If the game ends or mode switches during this window, the callback checks `if(!g||g.over)return;` which is a good guard. However, if a new versus match starts within 1.5s, the old `g` reference in the closure is stale (the check `!g` would fail since `g` is reassigned). The `deadP` reference still points to the old player object, so the mutation would affect the old (now discarded) state. This is harmless but sloppy.

**LOW: prevPad array shared across modes.** All modes share the same `prevPad[0-3]` array. Reset happens on mode entry, which is correct.

---

## 7. DEAD CODE

| Item | Location | Type |
|------|----------|------|
| TODO comment: grenade weapon card unreachable | Line 1852 | Dead code path after `else if(laser)` |
| `renderSplash()` function | Line 1337 | Never called. Mission board replaced splash. |
| `renderTitle()` / old title screen logic | Lines 1375-1427 | Partially dead. Only reachable through internal mode sub-panel of mission board, not as standalone screen. |
| `showScreen("splash")` path | Line 1328 | Never triggered. No code sets `screen="splash"` anymore. |
| `screen==="splash"` keyboard handler | Line 1004 | Dead -- splash is handled by mission board now. |
| `screen==="splash"` gamepad handler | Line 1651 | Dead -- same reason. |
| `MUSIC.tracks.forest` | Line 208 | FOREST arena music exists but story mode music mapping (line 2696) maps stages 1-5 to ["warehouse","ruins","lava","space","neon"]. Forest music is only used in versus mode when FOREST arena is randomly selected. Not dead, but the story mode never uses it. |
| `HAZARDS.fortress.sawblades` / `HAZARDS.neon.sawblades` | Lines 415-416 | Used in versus mode. Not dead. |
| `SPAWNS_3`, `SPAWNS_4` | Lines 450-451 | Used for 3P/4P versus spawns. Not dead. |
| Splash screen HTML div | Line 62 | `<div id="splash-screen">` -- never populated. |

---

## 8. PERFORMANCE

### Line Count
- **Total:** 4107 lines (72 HTML/CSS, 4035 JS)
- Single `<script>` block, no modules, no bundling

### Particle Bounds
- Versus particles: filtered each frame by `life > 0` (line 1993). No position bounds check -- particles can exist off-screen. Low impact since they have short life.
- Story particles: same pattern (line 3242). Casings have `life=600` when landed (line 3243), which means up to hundreds of casing particles can accumulate in long story levels. Each is a simple fillRect, so GPU impact is minimal.
- Coins on ground: no despawn timer. In theory, coins can accumulate indefinitely. Each is 2 draw calls (circle + highlight).

### Background Efficiency
- Zone BG system draws at most 2 images per frame (current + blend). Good.
- Versus mode draws grid lines every 40px (20 vertical + 12 horizontal = ~32 lines per frame), plus light rays. Acceptable.
- Story mode calls `drawStageBG` once, then draws platforms with visibility culling (`if(px>W+50||px+pl.w<-50)return`). Good.

### Enemy/Bullet Culling
- Enemies: culled if `e.x > ss.cameraX + W + 200` (line 2872). Good.
- Enemy draw: culled if `ex > W+50 || ex < -50` (line 3375). Good.
- Enemy bullets: culled if outside camera+50px (line 3099). Good.
- Versus bullets: no camera (fixed screen), filtered by W+10/H+10 bounds. Good.

### Potential Performance Issue (LOW)
- `Date.now()` is called many times per frame in story mode (in storyUpdate, updateLevelElements, etc.). Could be cached once per frame. Micro-optimization, unlikely to matter.

---

## SEVERITY SUMMARY

### CRITICAL
None found. The game is functionally complete for its current feature set.

### MEDIUM

1. **Zone boundary mismatch** (ZONE_BGS vs stage zones array) -- startX/endX values differ between the two definitions. Could cause HUD zone name to show wrong name relative to background.

2. **Missing features from spec:**
   - Musical stings -- no audio feedback for boss encounters, stage clears, etc.
   - Enemy variants (green/red/gold) -- all enemies are single-colored
   - Boss intro cutscenes -- bosses just activate silently
   - Stage transition briefings -- no narrative context between stages
   - Manual reload -- no way to reload before magazine is empty

3. **storyState not nulled on mode exit** -- persists with stale data when switching to versus/gun game.

### LOW

4. **Dead code accumulation** -- renderSplash, splash screen handlers, old title screen code. ~50-100 lines of unreachable code.

5. **TODO comment** at line 1852 about unreachable grenade weapon card path.

6. **setTimeout in gun game respawn** -- closure captures stale `g` reference if mode switches quickly.

7. **Casing particle accumulation** -- casings persist for 600 frames (10 seconds) after landing. Long story stages could accumulate many.

8. **Story mode music mapping** only covers 5 tracks for 4 stages (stage 5 mapping is unused since there are only 4 stages). `"neon"` is mapped to a non-existent stage 5 index.

---

## RECOMMENDED FIX ORDER

1. **Zone boundary alignment** -- Sync ZONE_BGS startX/endX with STORY_STAGES[0].zones for consistent HUD/BG behavior.

2. **Add musical stings** -- Short synthesized audio cues for: boss activation, boss death, stage clear, player death, revive. Use existing `sfx()` infrastructure.

3. **Boss intro cutscene** -- Even a simple 2-second overlay with boss name + HP bar reveal would improve the experience dramatically.

4. **Stage transition briefings** -- Add a brief text overlay before each stage loads (between shop and gameplay).

5. **Manual reload** -- Bind X key (keyboard) / LB (controller) to trigger reload when ammo < max.

6. **Enemy variants** -- Add color tinting system: green (normal), red (enraged, 1.5x speed), gold (more coins, more HP). Simple multiplier system on spawn.

7. **Clean dead code** -- Remove renderSplash, old splash handlers, unreachable grenade weapon path.

8. **Null storyState on versus/gungame entry** -- Add `storyState = null;` in startRound() when gameType !== "story".

9. **Fix music mapping** -- Story mode music array has 5 entries but only 4 stages. Trim or map correctly.

10. **Casing cleanup** -- Add position-based culling for casings that fall behind camera in story mode.

---

## ARCHITECTURE NOTES

- The codebase is well-structured for a single-file game. Clear separation between versus loop (`update`/`draw` in `startGameLoop`), story loop (`storyUpdate`/`storyDraw` in `startStoryLoop`), and menu system (`mbUpdate`/`mbDraw` in `startMissionBoard`).
- The `drawPerson` function (lines 1136-1310) is impressively detailed -- full Contra-style commando with bandana, bandolier, combat boots, muscle definition.
- Boss AI is well-differentiated: MEGA GRUNT has melee/charge/stomp/blob-spit, HIVE QUEEN has hover/slime-shots/grunt-spawning/slime-rain with 3 difficulty phases.
- The shop/armory system is complete with weapon purchases, card purchases, healing, and rerolling.
- Input handling supports keyboard (4 players with different key maps) and gamepad (4 controllers) simultaneously.
