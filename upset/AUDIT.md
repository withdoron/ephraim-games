# UPSET - Comprehensive Code Audit

**File:** `index.html`
**Total lines:** 3991
**Approximate JS lines:** ~3920 (lines 72-3988)
**Date:** 2026-04-05

---

## CRITICAL (Broken / Will Cause Bugs)

### C1. Music engine `gains` array never cleaned up properly
**Lines 122-175.** `MUSIC.start()` creates `bassG` and `melG` gain nodes and stores them in `this.gains`, but the per-step oscillator and gain nodes created inside `setInterval` (lines 146-166) are never tracked or disconnected. Over a long session this creates hundreds of orphaned AudioContext nodes. The two tracked gains in `this.gains` are disconnected on `stop()`, but the intermediate per-note nodes rely solely on garbage collection.

### C2. Story mode `storyDraw` guard uses `ss.player` getter that returns `null` when all players are dead
**Line 3181:** `if(!ss||!ss.player)return;` -- The getter `ss.player` returns `this.players[0]||null`. If players array is empty (shouldn't happen) or player 0 is dead but still in array (will still return the object), this guard is misleading. The real problem: after all players die and `_gameOverTriggered` fires on a 2-second timeout (line 3162), the `storyLoop` continues running, calling `storyDraw` which tries to read `ss.player` properties. Between death and the gameover screen, the draw function accesses `p.x`, `p.hp` etc on a dead player without protection.

### C3. `goTitle()` function is overridden but the original is saved and never called
**Lines 3983-3984:** `const _origGoTitle=goTitle;` saves the original, then `goTitle` is reassigned to a new function. The `_origGoTitle` variable is never referenced anywhere, making it dead code. More importantly, the override calls `startMissionBoard()` instead of `showScreen("title")`, but several paths still call the old-style `showScreen("title")` + `renderTitle()` (e.g., controls screen back button). This means the title screen (HTML-based) is orphaned -- navigating back from controls goes to the old DOM-based title screen instead of the canvas-based mission board.

### C4. Pause during story mode uses classic mode's `g` variable
**Line 906:** `togglePause()` checks `screen!=="fight"||!g||g.over` -- but in story mode, the game state is in `storyState`, not `g`. When story mode is active, `g` may be `null` (never set by story mode), causing `togglePause()` to return early. Pause in story mode appears to rely only on `paused` being checked in `storyUpdate` (line 2609), but the guard at line 906 prevents `paused` from ever being set to `true` during story mode because `g` is null.

### C5. `drawCommando` function defined but never called
**Lines 3720-3763.** The `drawCommando()` helper function is defined for the mission board, but the mission board draw function (`mbDraw`) at lines 3877-3886 uses `drawPerson()` instead. `drawCommando` is completely dead code.

### C6. Story mode reload timer ignores weapon-specific fire rates
**Line 2616:** `if(p.reloading&&now-p.reloadStart>=RELOAD_TIME)` uses the global constant `RELOAD_TIME=1200` for all story players, ignoring weapon-specific timings. Meanwhile, classic mode (line 1643) correctly uses `Math.max(300,RELOAD_TIME+p.stats.reloadMult)`. This means story mode reload is always 1200ms regardless of fast-reload cards.

### C7. Extra players (P2/P3) in story mode don't get `reloadMult` applied
**Lines 2697-2719.** Extra player reload check at line 2697 also uses `RELOAD_TIME` directly, not factoring in card bonuses.

---

## MEDIUM (Fragile / Potential Bugs)

### M1. Event listeners for `audioCtx.resume` reference `audioCtx` without null check
**Lines 179-180:** `if(audioCtx.state==="suspended")` will throw if `audioCtx` is null (line 74 catch block sets it to null). These listeners fire on the first click/keydown and could crash before the game even starts on browsers that don't support Web Audio.

### M2. `prevPad` state is updated in multiple places, causing race conditions
The `prevPad` array is written to in:
- `startMenuPoll` (line 1582)
- `update()` inside the game loop (line 1759)
- Story mode P1 input (line 2671)
- Story mode extra players (line 2720)

When transitioning between modes, stale `prevPad` data can cause ghost button presses.

### M3. No `cancelAnimationFrame(storyAnimId)` in `goTitle()`
**Line 3984:** The overridden `goTitle` calls `startMissionBoard()` which cancels `storyAnimId` (line 3770), but if `startMissionBoard` ever changes, story mode's animation loop would keep running in the background.

### M4. Gun Game respawn uses `setTimeout` with closure over `g`
**Lines 2036-2047:** The respawn timeout captures `g` in closure. If the round ends and a new round starts before the 1.5s timeout fires, `g` will point to the old round's state. The guard `if(!g||g.over)return;` helps, but if a new `g` is created by then, `deadP` references the old round's player object and the respawn writes to stale data.

### M5. `shopHeal` charges 20 coins but checks `canHeal` in HTML, not in the function
**Lines 3665-3671:** `shopHeal()` checks `ss.coins>=20&&healed` but does the heal before checking coins. If somehow called with <20 coins, all players get healed but coins aren't deducted. The HTML guard normally prevents this, but direct console calls could exploit it.

### M6. Story mode `coinMagnet` only uses P1's stats for coin drop multiplier
**Line 2994:** `const coinAmt=Math.round(e.coins*(1+(p.stats.luckyMultiplier||0)));` uses `p` which is always `ss.players[0]`. If P2 or P3 has the Lucky card, it doesn't affect coin drops from enemies they kill.

### M7. Boss `lastSlime`, `lastBlob`, `lastSpawn`, `lastRain`, `lastSlam` initialized to 0
**Line 2567.** These timestamps are compared against `Date.now()` (e.g., `now-b.lastSlime>1500`). Since `lastSlime=0` and `now` is ~1.7 trillion ms, all attack cooldowns fire immediately on the first frame, causing a burst of attacks when the boss activates.

### M8. HAZARDS references arenas `fortress` and `neon` with sawblades, but sawblades config uses hardcoded x/y that may not match platform layouts
**Lines 334-335.** `fortress` has sawblades at `{x:400,y:270,r:22}` and `neon` at `{x:300,y:300,r:18},{x:500,y:200,r:18}`. These positions are not relative to any platform, so they may float in mid-air depending on the random layout chosen.

### M9. Wall wrap behavior inconsistency
**Lines 1777-1791.** Players wrap through walls below y=350 but hit solid walls above. Bullets do NOT wrap (lines 1853-1888, checked against `W+10` and `-10` only). This means a player can wrap to the other side but their bullets disappear at the edge.

### M10. `ice` arena has `friction:0.92` and `ice:false`
**Line 259.** The `ice` property is `false`, yet the arena has reduced friction (0.92). The code at line 1695 checks `if(a.ice)` for ice physics, which will be false. The friction value (0.92) is applied separately at lines 1764 and 1770 via `if(a.ice)p.vx*=a.friction`. Since `a.ice` is false, the ice friction is never applied despite the arena being named "ICE RINK" and having friction configured.

---

## LOW (Cleanup / Code Smell)

### L1. `drawCommando` function is dead code (3720-3763)
Fully replaced by `drawPerson` in mission board rendering.

### L2. `_origGoTitle` variable (line 3983) is dead code
Saved but never referenced.

### L3. `TEAMS` and `TEAM_COLORS`/`TEAM_NAMES` constants defined at lines 237-239 but only used in 2v2 mode
Not a bug, but they occupy global scope unconditionally.

### L4. Duplicate grenade rendering code
Grenade drawing logic is copy-pasted nearly identically between:
- Classic mode draw (lines 2427-2441)
- Story mode draw (lines 3436-3446)

Should be extracted to a shared `drawGrenade()` function.

### L5. Duplicate grenade physics/explosion code
Grenade update logic exists in:
- Classic mode (lines 1892-1910)
- Story mode (lines 3088-3110)

Nearly identical; should be shared.

### L6. Duplicate ragdoll update code
- Classic mode (lines 1997-2002)
- Story mode (line 3117)

### L7. Duplicate damage number update code
- Classic mode (line 1975)
- Story mode (line 3116)

### L8. Duplicate platform collision code
Player-platform collision logic is repeated for:
- Classic mode players (lines 1765-1775)
- Story mode P1 (lines 2677-2682)
- Story mode extra players (line 2724)
- Story mode enemies (lines 2837-2845)

### L9. `slowFrame` variable scoped inside `startGameLoop` closure but conceptually global
**Line 2507.** Works fine but is reset every time `startGameLoop` is called, which is correct behavior but non-obvious.

### L10. Card `lifesteal2` has stat `lifeSteal` identical to `vampire` card
**Lines 214 and 229.** Both `vampire` and `lifesteal2` add `lifeSteal:3`. They are effectively duplicates with different names/icons. Intentional for pool variety but could confuse players.

### L11. `PICKUP_SPOTS` array (line 185) uses hardcoded positions that may not align with random platform layouts
Pickups can spawn floating in mid-air if the selected layout doesn't have platforms near those coordinates.

### L12. `roundRect` helper defined (line 1214) but also used via native canvas path calls in some places
Inconsistent usage -- sometimes `roundRect()` is called, sometimes raw arc/line drawing is used for rounded shapes.

### L13. CSS class `card.sel` has `transform:translateY(-12px) scale(1.12)` but card selection is managed by JS re-render
Every card hover triggers a full `renderCards()` DOM rebuild. This is inefficient -- could use CSS-only hover states.

---

## State Management Issues

### S1. `frame` counter never resets between rounds or modes
**Line 887:** `frame=0` is set at initialization, but `frame++` happens in both classic (line 1639) and story (line 2610) mode loops without resetting. Frame count grows indefinitely. This affects animations that use `frame` modulo (e.g., `frame%6`, `frame%15`), which are fine, but `frame*0.3` style calculations will eventually lose floating-point precision.

### S2. `g` (game state) persists between rounds
When a new round starts via `startRound()`, `g` is fully replaced (line 1480). This is correct. However, if `endRound()` triggers with a timeout (line 1502) and `startRound()` is called before the timeout fires, the timeout callback closes over the old `g`. The guard `if(!g||g.over)` partially protects this.

### S3. `storyState` is never nulled when leaving story mode
After story mode ends and the player returns to the title/mission board, `storyState` retains all stage data, enemies, particles, etc. in memory.

### S4. `keys` object accumulates keys but never clears on screen transitions
**Line 888.** If a key is held during a screen transition, the held key state persists. The mission board explicitly clears keys (line 3793) but other transitions do not.

### S5. `paused` state is not reset on mode transitions
**Line 429.** `showScreen()` sets `paused=false` (line 1222), which is good, but `togglePause()` doesn't check the game type, so pause state could theoretically leak.

### S6. `ggLevels` array persists across matches in gun game
**Line 884.** `ggLevels` is reset in `startMatch()` (line 1449), which is correct. However, if the player goes to title and back, `startMatch()` is called again, so this is fine.

---

## Event Listener Issues

### E1. `resize` listener added once, never removed
**Line 903.** This is correct behavior for this type of app -- the listener should persist.

### E2. `keydown` and `keyup` listeners are global and always active
**Lines 918, 967.** All keyboard input flows through a single handler regardless of screen. This is fine architecturally but means key events are processed even during screens where they shouldn't matter (e.g., pressing game keys during splash).

### E3. Audio resume listeners use `{once:true}` -- correct
**Lines 179-180.** These fire only once and are properly cleaned up.

### E4. No gamepad disconnect cleanup
**Line 970.** The `gamepaddisconnected` handler updates `gpOn` but doesn't clear `prevPad` for the disconnected controller, which could cause stale state.

---

## Canvas / Rendering Issues

### R1. `globalAlpha` not always restored after conditional setting
Several places set `ctx.globalAlpha` conditionally and restore it afterward, but some paths could skip the restore:
- Line 2279: `if(p.invisible)ctx.globalAlpha=0.15;` restored at 2289, but if `p.invisible && p.dashing>0` both apply, the second overwrite (0.5) is used, and the restore at 2289 checks both conditions.
- Lines 794-800: Disappearing platforms set `ctx.globalAlpha` and restore it, which is correct.

### R2. Shadow blur set but never cleared in mission board
**Lines 3892-3894:** `ctx.shadowBlur=30` is set for the title text, then `ctx.shadowBlur=0` clears it. This is correct, but if an error occurs between setting and clearing, the shadow persists for all subsequent draws.

### R3. Canvas never cleared between story mode draw calls when game is paused
The story draw always redraws the full canvas (line 3188 fills background), so this is not an issue.

### R4. Bullet casings in story mode are stored as particles with a `casing` flag
**Line 2663.** Casings have `life:999` and `landed:false`. Once landed, they persist with `life:999` forever. Over a long story mode session, the particle array grows unboundedly with landed casings that are never removed. The filter at line 3118 keeps all casing particles indefinitely: `if(pt.casing){...return true;}`.

---

## Mode Transition Issues

### T1. Classic mode -> Title -> Story mode: `pcards` array not cleared for story
`goTitle()` resets `pcards=[[],[],[],[]]` (line 3984), but story mode uses `storyState.playerCards` (line 873). These are independent, so no leak.

### T2. Mission board -> Controls -> Back navigates to old HTML title screen
**Line 3810:** In the mission board, pressing X/H calls `showScreen("controls");renderControls();startMenuPoll()`. When the user presses back from controls (line 924), it calls `showScreen("title");renderTitle()` -- this shows the OLD HTML-based title screen, not the canvas mission board. The mission board animation loop (`mbAnimId`) was cancelled by `startMenuPoll` but is never restarted.

### T3. `startMatch()` cancels `mbAnimId` but `mbAnimId` is only set inside `startMissionBoard`
**Line 1446.** If `startMatch` is called from the HTML title screen (which is still accessible via T2), `mbAnimId` is null, and the cancel is a no-op. This is fine.

### T4. Animation loop conflicts
Three separate animation loops exist:
- `animId` (classic mode game loop)
- `storyAnimId` (story mode game loop)
- `mbAnimId` (mission board loop)
- `menuAnimId` (menu gamepad polling)

Each start function cancels the others, but the cancellation is fragile:
- `startGameLoop` cancels `animId`, `menuAnimId`, `mbAnimId` but NOT `storyAnimId`
- `startStoryLoop` cancels `storyAnimId`, `animId`, `menuAnimId` but NOT `mbAnimId` (actually does at line 2523 via `startStory`)
- `startMissionBoard` cancels all four

If any new loop type is added, all start functions must be updated.

---

## Mission Board Menu Integration

### MB1. Mission board correctly routes to all three game types
- Campaign -> `startStory()` with player count
- Versus -> `startMatch()` with classic mode + player config
- Gun Game -> `startMatch()` with gungame mode + player config

### MB2. Mission board does not expose arena selection
Classic mode randomizes arena each round (line 1456). There is no way for the player to choose a specific arena. The old title screen had no arena selector either, so this is by design.

### MB3. Mission board "CONTROLS" shortcut breaks flow (see T2)
Navigating to controls from the mission board and pressing back returns to the wrong screen.

### MB4. Mission board splash screen key clearing is aggressive
**Line 3793:** `for(const kk in keys)keys[kk]=false;` clears ALL keys. This could interfere if a key is genuinely still held.

---

## Story Mode Cleanup Between Stages

### ST1. `loadStoryStage` properly resets all stage-specific arrays
**Lines 2530-2584.** Enemies, bullets, coins, particles, damage numbers, ragdolls, casings, grenades, and all level elements are re-initialized. Player HP is NOT reset (carried over from previous stage), which is intentional (shop healing exists).

### ST2. Player weapons and owned weapons persist across stages (correct)
Weapon state is stored on `storyState` and not cleared by `loadStoryStage`.

### ST3. `storyState._gameOverTriggered` is set but never cleared
**Line 3161.** If the game over timeout fires and the player retries, `initStory()` creates a fresh `storyState` object, so the flag doesn't persist. This is fine.

### ST4. Story mode countdown resets per stage (correct)
**Line 2583.** Each `loadStoryStage` call sets up a fresh countdown.

### ST5. Casings accumulate across story mode with no cleanup
See R4 above. The `particles` array is cleared per stage in `loadStoryStage` (line 2534), so casings don't leak across stages. However, within a single stage, landed casings grow forever.

---

## Feature Inventory

| # | Feature | Status | Lines |
|---|---------|--------|-------|
| 1 | Web Audio sound effects (SFX) | Working | 73-119 |
| 2 | Procedural music engine (6 tracks) | Working | 121-176 |
| 3 | 8 arenas (warehouse, ice, ruins, lava, space, forest, fortress, neon) | Working | 241-366 |
| 4 | Arena hazards (lava pits, falling objects, sawblades, moving platforms) | Working | 327-336, 1919-1971 |
| 5 | 2P/3P/4P FFA modes | Working | 371 |
| 6 | 4P 2v2 team mode | Working | 237-238, 397-398 |
| 7 | Friendly fire toggle | Working | 419, 429 |
| 8 | 35 upgrade cards (offense/defense/movement/utility/wild) | Working | 186-232 |
| 9 | Card rarity system (Common/Uncommon/Rare) | Working | 406-407 |
| 10 | Card category art/backgrounds | Working | 403-405 |
| 11 | Keyboard support (4 players) | Working | 373-378 |
| 12 | Gamepad support (4 controllers) | Working | 395, 969-970 |
| 13 | Gun Game mode (7 weapon tiers) | Working | 430-438 |
| 14 | Gun Game respawn system | Working | 2033-2047 |
| 15 | Story mode (5 stages) | Working | 440-574 |
| 16 | Story mode bosses (Mega Grunt, Hive Queen) | Working | 2860-2960 |
| 17 | Story mode enemies (grunt, rusher, tank, stalker, bomber) | Working | 576-582 |
| 18 | Story mode level elements (spikes, acid, moving plats, disappearing plats, turrets, jump pads, crumbling plats, weapon pickups, breakable walls) | Working | 584-868 |
| 19 | Story mode shop/armory between stages | Working | 3584-3674 |
| 20 | Story mode co-op (1-3 players) | Working | 2570-2580, 2694-2729 |
| 21 | Story mode revive system | Working | 3124-3157 |
| 22 | Coin economy (drops, magnet, lucky multiplier) | Working | 3044-3084 |
| 23 | Multiple weapons in story mode (pistol, SMG, shotgun, sniper, rocket) | Working | 430-438 |
| 24 | Weapon switching (Y/RB button) | Working | 1676-1687 |
| 25 | Grenades (LT button) | Working | 1688-1694 |
| 26 | Dash mechanic (B button) | Working | 1652-1658, 1670-1674 |
| 27 | Wall jump / wall slide | Working | 1707-1709, 1784-1791 |
| 28 | Screen wrap (bottom zone) | Working | 1777-1783 |
| 29 | Kill streaks (double/triple/unstoppable) | Working | 2006-2013 |
| 30 | Ragdoll death system | Working | 2050-2061 |
| 31 | Homing missiles (pickup) | Working | 1821-1851 |
| 32 | Medpack pickup | Working | 1808-1811 |
| 33 | Pause menu (resume/restart/main menu) | Partially broken (see C4) | 905-915 |
| 34 | Countdown before round | Working | 1604-1618 |
| 35 | VS overlay before round | Working | 2400-2425 |
| 36 | K.O. slow motion + overlay | Working | 2476-2487 |
| 37 | Mission board (canvas-based menu) | Working, with T2 bug | 3706-3987 |
| 38 | Splash screen (mission board) | Working | 3786-3797 |
| 39 | Controls screen (HTML) | Working | 1240-1268 |
| 40 | Gameover / victory screens | Working | 1406-1417, 3681-3703 |
| 41 | HUD (HP bars, scores, ammo, cards) | Working | 2362-2398 |
| 42 | Story mode HUD (lives, coins, stage, weapon slots) | Working | 3509-3566 |
| 43 | Damage numbers (floating text) | Working | 2457-2460 |
| 44 | Muzzle flash effects | Working | 2291-2295 |
| 45 | Landing squash animation | Working | 2284-2288 |
| 46 | Low HP pulse animation | Working | 2282-2283 |
| 47 | Bullet casings | Working | 1988 |
| 48 | Detailed character sprites (Contra-inspired) | Working | 1032-1206 |
| 49 | Detailed gun sprites (7 weapon types) | Working | 973-1030 |
| 50 | Detailed enemy sprites (alien bug style) | Working | 3249-3335 |
| 51 | Boss sprites (Mega Grunt + Hive Queen) | Working | 3344-3432 |
| 52 | 3D-depth platform rendering | Working | 2174-2189 |
| 53 | Platform support columns | Working | 2162-2172 |
| 54 | Arena-specific visual effects (stars, ice sparkle, light rays, lava glow) | Working | 2100-2154 |
| 55 | Responsive canvas scaling | Working | 897-903 |

---

## Missing Features / Incomplete

1. **No arena selection UI** -- Arenas are randomized per round. No picker exists.
2. **No save/load** -- Story mode progress is lost on page refresh.
3. **No volume control** -- All audio is hardcoded volume levels.
4. **No fullscreen toggle** -- Canvas scales but no F11/button.
5. **Pause does not work in story mode** (see C4).
6. **Old HTML title screen is still accessible** via back-from-controls bug (see T2).
7. **Story mode only has 5 stages** -- `STORY_STAGES` array has 5 entries. The shop `CONTINUE` button shows stage 6 name as "?" if reached from stage 5 completion.
8. **`coinmagnet` and `lucky` cards** are defined but only affect story mode. They have no effect in classic/gun game modes (no coin system).
9. **`grenade` weapon type** is handled in classic mode bullet creation (line 1747-1749) but there is no grenade weapon in `GG_WEAPONS`. The `grenade` weapon path in classic mode's card system (`p.stats.weapon==="grenade"`) cannot be reached because no card sets `weapon:"grenade"`.
10. **`KMAPS` for P3 and P4** use `j/l/i/h` and `4/6/8/0` respectively -- numpad keys may conflict with browser shortcuts.

---

## Recommendations

### High Priority
1. **Fix story mode pause** (C4): Change `togglePause()` to check `storyState` when `gameType==="story"`, or set `g` to a minimal shim during story mode.
2. **Fix controls-back navigation** (T2/MB3): When returning from controls, detect if the session was launched from the mission board and call `startMissionBoard()` instead of `showScreen("title")`.
3. **Fix ice arena friction** (M10): Change `ice:false` to `ice:true` on the ice arena definition, or change the friction code to check `a.friction<1` instead of `a.ice`.
4. **Fix boss attack cooldown burst** (M7): Initialize `lastSlime`, `lastBlob`, etc. to `Date.now()` instead of `0` when the boss is created.
5. **Fix story mode reload to respect card bonuses** (C6/C7): Use `Math.max(300,RELOAD_TIME+sp.stats.reloadMult)` for story mode reload checks.

### Medium Priority
6. **Add null guard for `audioCtx`** on lines 179-180.
7. **Cap story mode particle/casing array growth** (R4): Add a lifetime or max-count for landed casings.
8. **Extract duplicated logic**: grenade drawing, grenade physics, ragdoll updates, platform collision, damage number updates. Create shared utility functions.
9. **Remove dead code**: `drawCommando` function (L1), `_origGoTitle` variable (L2).
10. **Centralize animation loop management**: Create a single `stopAllLoops()` function called at the start of every mode transition.

### Low Priority
11. **Add `storyState=null` cleanup** when leaving story mode.
12. **Clear `prevPad` on gamepad disconnect** (E4).
13. **Consider extracting story mode into a separate module/section** -- it accounts for roughly 1500 lines of the file.
14. **Replace innerHTML card rendering with DOM diffing or template cloning** for better performance during card selection.
15. **Consider adding a simple localStorage save** for story mode progress.

---

## File Size and Structure

| Section | Lines | % |
|---------|-------|---|
| HTML + CSS | 1-71 | 1.8% |
| Sound engine (SFX + Music) | 72-176 | 2.6% |
| Constants (dimensions, cards, arenas, spawns) | 177-406 | 5.8% |
| Card display helpers | 401-406 | 0.1% |
| Menu/game type state + helpers | 409-427 | 0.5% |
| Global state + canvas setup | 428-903 | 12% |
| Pause + Input handlers | 904-970 | 1.7% |
| Drawing helpers (gun, person, shade, roundRect) | 972-1218 | 6.2% |
| Screen rendering (splash, controls, title, cards, gameover) | 1220-1417 | 5% |
| Classic mode game logic (rounds, pickups, bullets, physics) | 1418-2517 | 27.6% |
| Story mode game logic | 2518-3582 | 26.7% |
| Story mode shop | 3584-3703 | 3% |
| Mission board | 3706-3987 | 7.1% |

**Total: ~3920 lines of JavaScript in a single file.**

The file would benefit from being split into logical modules, but as a single-file HTML game, the monolithic structure is understandable for distribution simplicity.
