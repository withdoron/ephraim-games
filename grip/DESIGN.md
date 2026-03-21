# GRIP — Game Design Document

A rock climbing arcade game by Ephraim.

**Current Version:** v11c (prototype in Claude.ai artifacts)

## Concept

Select a monster character and climb a procedurally generated wall by grabbing holds. Different hold types drain stamina at different rates. Dinosaurs guard certain holds and trigger a timing-bar minigame. Checkpoints restore stamina. Reach the finish hold at the top to send the route.

## Characters

* **Pixel** 👾 — Classic arcade alien (green)
* **Dragon** 🐉 — Ancient fire breather (red)
* **Phantom** 👻 — Ghost climber (purple)

## Hold Types

* **Jug** 🟢 — Big hold, stamina recovers, no slip timer
* **Crimp** 🟡 — Small edge, drains stamina, 4s slip timer
* **Sloper** 🔴 — Round hold, drains fast, 2.5s slip timer
* **Pinch** 🟣 — Squeeze grip, moderate drain, 5s slip timer
* **Checkpoint** 🔷 — Full stamina restore
* **Start** ⬆️ — Beginning hold
* **Finish** ⭐ — Top of the wall

## Difficulty (V-scale)

* **V0** — 22-row wall, 18 holds, 1 checkpoint, 2 dinos
* **V3** — 35-row wall, 28 holds, 2 checkpoints, 3 dinos
* **V6** — 50-row wall, 42 holds, 3 checkpoints, 5 dinos
* **V9** — 65-row wall, 56 holds, 3 checkpoints, 7 dinos

## Obstacles

* **T-Rex** 🦖 — Slow timing bar, bigger green zone, +20 stamina on win
* **Raptor** 🦎 — Fast timing bar, smaller green zone, +30 stamina on win

## Features Built (v11c)

* Route Creator — grid editor, place holds/dinos/checkpoints
* Community Routes — browse and play saved routes
* Save system — routes persist during session
* Star ratings + tags on community routes
* 3 characters with selection screen
* 4 difficulty levels
* Victory screen with score

## Planned Features

* Character abilities (unique powers per monster)
* Ghost runs (race your own shadow)
* Route tags (technical, dino heavy, speed run, etc.)

## N64 Cartridge Plan

React prototype → C rewrite with libdragon SDK → compile to .z64 ROM → flash to cartridge
