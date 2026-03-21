# Ringstorm Racers — Game Design Document

A flying racing game by Ephraim. Think Mario Kart N64 but with airplanes.

**Current Version:** Build 7 (prototype in Claude.ai artifacts)

## Concept

Fly an airplane through a 3D course. Race through ring gates, collect powerups, battle other racers. 3 laps to win. Split-screen 2-player support.

## Game Modes

* **RACE** — 3 laps, fly through gates in order, 5 racers total (players + NPCs)
* **BATTLE** — 3 lives each, last plane flying wins
* Both modes support 1P or 2P

## Racers

* **BLUE** (P1) — accent #3b82f6
* **RED** (P2) — accent #ef4444
* **VIPER** (NPC) — accent #22c55e
* **BLAZE** (NPC) — accent #f97316
* **STORM** (NPC) — accent #a855f7

## Controls

### Player 1

* WASD — Throttle & Turn
* Space — Pull Up
* Q — Dive
* F — Use Weapon

### Player 2

* Arrow Up/Down — Throttle
* Arrow Left/Right — Turn
* / — Pull Up
* . — Dive
* Shift — Use Weapon

## Powerups (collected from purple rings)

* 🔫 **Machine Gun** — rapid fire forward, 8 rounds
* 🚀 **Rocket Boost** — burst of speed
* 💥 **Homing Missile** — locks onto nearest racer, tracks them
* ⭐ **Star Power** — invincible + speed boost
* 🛡️ **Flares** — deflect homing missiles

## Course Elements

* Ring gates (green = next, gold = upcoming)
* Mountains (3D, with snow caps)
* Floating islands (bob up and down)
* Rock pillars
* Canyon ridges
* Golden course ribbon on ground showing optimal path

## Features Built

* 3D canvas rendering with depth sorting
* Third-person chase camera
* Banking physics (roll → yaw)
* Split-screen 2P
* NPC AI (follows course, uses weapons, varies skill)
* Starting grid with 3-2-1-GO countdown
* Heat-seeking missiles with flare counter
* Crash explosions with respawn
* Race results (1st-5th with times)
* Battle results (kills, remaining lives)
* 3-button menu (Race / Battle / Controls)

## Planned Features

* Smoother course with wider turns
* Trick system (barrel roll through rings for speed boost)
* More course variety
* Sound effects
* Online multiplayer (future — Godot migration)

## Future: Godot Migration

When game design is locked, rebuild in Godot 4 for:

* Real 3D rendering with models and textures
* Physics engine
* Online multiplayer via Nakama
* Export to web (itch.io), desktop, mobile
* Potential N64 cartridge (stretch goal)
