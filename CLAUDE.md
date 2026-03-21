# Ephraim Games — Claude Code Guide

## About

This repo contains games designed by Ephraim (age 12) and built with AI assistance. Ephraim is the lead designer — he decides what gets built. Claude writes the code.

## Project Structure

```
ephraim-games/
├── CLAUDE.md              (this file)
├── README.md              (public-facing)
├── grip/                  (GRIP — rock climbing arcade game)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── Grip.jsx       (main game component)
│   └── DESIGN.md          (game design doc)
├── ringstorm/             (Ringstorm Racers — flying racing game)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── Ringstorm.jsx  (main game component)
│   └── DESIGN.md          (game design doc)
└── docs/
    └── GODOT-PLAN.md      (future migration plan)
```

## How to Run

Each game is an independent Vite + React app:

```bash
cd grip
npm install
npm run dev # Opens at http://localhost:5173

cd ringstorm
npm install
npm run dev # Opens at http://localhost:5174
```

## Code Conventions

* Each game is a single main component (Grip.jsx or Ringstorm.jsx) with helper functions
* Use React hooks (useState, useEffect, useRef, useCallback)
* Canvas-based rendering for game views (2D context)
* All game logic lives inside useEffect with requestAnimationFrame loop
* Inline styles (no CSS files) — matches the prototype style
* No external game libraries — vanilla canvas + React only
* Georgia serif font for all UI text
* Dark theme: backgrounds use #0a1628 → #1a1a2e → #16213e gradients

## Git Conventions

* Commit messages: "GRIP: [description]" or "RINGSTORM: [description]"
* Work on main branch (no feature branches needed for now)
* Ephraim merges via GitHub Desktop

## Design Process

1. Ephraim designs with Mycelia (Claude.ai)
2. Mycelia writes Claude Code prompts
3. Claude Code implements
4. Ephraim tests in browser
5. Iterate until it feels right
