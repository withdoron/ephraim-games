# Ringstorm Racers — Growth Protocols

## Why Protocols Matter

A game without protocols is a pile of features. A game WITH protocols is a living system that grows in a direction.

Every time you add something new — a course, a character, a weapon, a feature — you're making a design decision. Protocols ensure those decisions are consistent, intentional, and connected to each other. Without them, you end up with a game that feels scattered. With them, each new piece strengthens every other piece.

This is the fractal principle: what's true of one part is true of the whole. A single race should feel like the whole game in miniature. A single weapon should reflect the game's philosophy. These protocols help you keep that pattern as the game grows.

---

## The Rhythm

Everything in Ringstorm follows the same rhythm at every scale:

**Anticipation → Action → Tension → Resolution**

| Scale | Anticipation | Action | Tension | Resolution |
|-------|-------------|--------|---------|------------|
| One moment | See a cube ahead | Fly toward it | Another racer is closer | You grab it first |
| One lap | Countdown builds | Racing through gates | Weapons flying, hazard warning | Cross the lap line |
| One race | Course select, countdown | 3 laps of racing | Final lap, positions tight | Results screen, replay |
| One session | Main menu, pick mode | Multiple races | Trying harder courses, battle | "One more race" |
| The whole game | First time playing | Learning courses and weapons | Mastering tricks, shortcuts, drafting | Competing with friends, creating content |

When you add anything new, ask: does it fit this rhythm? Does it add anticipation, action, tension, or resolution?

---

## Protocol 1: Adding a Course

Every course follows this template. Fill it in before building.

### Course Template

```
Name: [course name]
Emoji: [single emoji]
Color: [hex color for UI]
Description: [one line, under 50 characters]
Mood: [what does it feel like to fly here?]

Terrain:
  Ground type: [color, texture feel]
  Altitude: [low/medium/high — where do gates sit?]
  
Signature Obstacles (2-3):
  1. [what is it, how does it affect gameplay]
  2. [what is it, how does it affect gameplay]
  3. [optional third]

Course Hazard Event:
  Trigger: [what lap does it happen?]
  Effect: [what does it do to racers?]
  Warning: [what do players see before it hits?]
  Duration: [how long does it last?]
  
Difficulty Feel:
  Speed: [fast and open / slow and technical?]
  Width: [wide corridors / narrow passages?]
  Elevation: [flat / rolling / dramatic]
  
Shortcut:
  Location: [between which gates]
  Risk: [what makes it dangerous]
  Reward: [how much time does it save]
```

### Existing Courses as Examples

| Course | Signature Obstacles | Hazard | Feel |
|--------|-------------------|--------|------|
| Grand Canyon | Canyon walls, falling rocks | Earthquake (lap 3) | Narrow, dramatic |
| Island Skies | Floating islands | None yet | Open, vertical |
| Mountain Pass | Mountain corridors | None yet | Technical, elevation |
| Ocean Run | Rock arches, pirate ships | Tsunami (lap 2) | Low, fast |
| Volcano | Central volcano, lava | Eruption glow | Hot, orbital |
| Ice Cavern | Ice mountains, arches | None yet | Cold, tight |
| Deep Space | Asteroids, planets | None yet | Open, 3D |

### Circulation Check

A good course circulates advantage:
- ✅ Multiple racing lines (not one "best" path)
- ✅ Shortcuts that are risky (reward skill, not memorization)
- ✅ Hazards that affect leaders more (they're further ahead, less time to react)
- ❌ A course where the first-place racer always wins (that's extraction)
- ❌ A course where knowing one secret makes you unbeatable (that's extraction)

---

## Protocol 2: Adding a Character/Racer

Every racer follows this template.

### Racer Template

```
Name: [racer name, all caps]
Color: [primary color hex]
Secondary: [wing/accent color hex]
Personality: [one word — aggressive / defensive / balanced / tricky]

Stats (must sum to 20):
  Speed: [1-8] — top speed
  Turn: [1-8] — how quickly they bank
  Weight: [1-8] — resistance to knockback
  Boost: [1-8] — how powerful their boost is

NPC AI Style:
  [How does this racer behave differently from others?]
  [Do they draft a lot? Fire missiles early? Hoard items? Take shortcuts?]
```

### Circulation Check

A good character system circulates:
- ✅ Every racer has a strength AND a weakness
- ✅ No racer is the "best" — each excels in different situations
- ✅ A slow racer with great turning dominates a tight course; a fast racer dominates open courses
- ❌ One racer with high everything (that's extraction — it extracts fun from choosing)

### Current Racers

| Racer | Color | Role |
|-------|-------|------|
| BLUE (P1) | Blue/White | Player 1 |
| RED (P2) | Red/White | Player 2 |
| VIPER | Green/Black | NPC |
| BLAZE | Yellow/Black | NPC |
| STORM | Purple/Black | NPC |

Stats are currently identical. The next evolution is giving each racer unique stats.

---

## Protocol 3: Adding a Weapon

Every weapon follows this template.

### Weapon Template

```
Name: [weapon name]
Emoji: [single emoji]
Color: [UI color hex]
Type: [offensive / defensive / movement / hazard]

Effect:
  [What does it do in one sentence?]

Balance:
  Rarity by position:
    1st place: [0-40%]
    Middle: [0-40%]
    Last place: [0-40%]
  [Rarer for leaders? More common for those behind? Why?]

Counterplay:
  [How can another racer deal with this weapon?]
  [Can it be dodged? Blocked by flares? Avoided with star?]

Skill expression:
  [Is there a way to use this weapon WELL vs just using it?]
  [Example: dropping a tornado on a narrow part of the course vs an open area]
```

### Circulation Check

A good weapon circulates:
- ✅ It has counterplay (can be dodged, blocked, or avoided)
- ✅ Skill matters in how you use it (timing, placement, aim)
- ✅ It's more useful when you're behind (rubber banding)
- ❌ An unavoidable weapon that always hits (that's extraction — it extracts skill from the game)
- ❌ A weapon only useful in first place (that's extraction — it extracts hope from those behind)

### Current Weapons

| Weapon | Type | Counterplay |
|--------|------|-------------|
| Gun | Offensive | Dodge by turning |
| Missile | Offensive | Flares, star, dodging |
| Boost | Movement | None needed — it's self-improvement |
| Star | Movement + Offensive | Another star, or just run |
| Flares | Defensive | N/A — it's already the counter |
| Lightning | Hazard | Star immunity, fly around it |
| Tornado | Hazard | Star immunity, fly around it |

---

## Protocol 4: Adding a Feature

Before building any new feature, answer these questions:

### Feature Checklist

```
1. WHAT does it do?
   [One sentence description]

2. WHY does the game need it?
   [What problem does it solve? What experience does it create?]

3. Does it fit the RHYTHM?
   [Does it add anticipation, action, tension, or resolution?]

4. Does it work at EVERY SCALE?
   [Does it matter in one moment? One race? The whole game?]

5. Does it CIRCULATE or EXTRACT?
   [Does it help everyone, or just reward the already-winning?]

6. What's the SIMPLEST VERSION?
   [What's the minimum build that lets you test if it's fun?]
   [Build this first. Polish later.]

7. How do you KNOW it's working?
   [What does a player do differently because this feature exists?]
   [If the answer is "nothing," the feature isn't needed.]
```

### The Stone Stairs Principle

Build with depth, not speed. Each feature should be SOLID before adding the next. A game that does three things well beats a game that does ten things poorly.

The order matters:
1. Does it fly well? (controls, feel, responsiveness)
2. Is there a course to race? (gates, laps, path)
3. Can you compete? (NPCs, weapons, items)
4. Does it feel alive? (sound, effects, announcements)
5. Can you share it? (menus, settings, multiplayer)

Don't skip to step 5 until steps 1-4 are solid.

---

## Protocol 5: Testing

Every change should be tested before committing. The testing protocol:

### Quick Test (every change)
- [ ] Game launches without errors
- [ ] Can navigate menus
- [ ] Can start a race
- [ ] Plane flies correctly
- [ ] Can complete 1 lap

### Feature Test (when adding something new)
- [ ] The new feature works as described
- [ ] It doesn't break existing features
- [ ] It works in both Race and Battle mode (if applicable)
- [ ] It works with keyboard AND controller
- [ ] NPCs interact with it correctly

### Fun Test (the most important one)
- [ ] Play a full race. Was it fun?
- [ ] Play with a second player. Was it MORE fun?
- [ ] Would you play again right now?
- [ ] Did anything feel unfair, annoying, or confusing?

If it's not fun, it doesn't ship. No matter how cool the code is.

---

## The Organism

Ringstorm Racers is not a product. It's a living thing.

The mystery cubes are the bloodstream — they circulate power to whoever needs it most. The courses are the body — each one different, each one alive. The weapons are the immune system — they keep any single racer from dominating. The community features (Route Creator, ratings, shared ghosts) are the nervous system — they connect players to each other.

When you add something new, you're not bolting on a feature. You're growing a new part of the organism. Ask: does this make the whole thing healthier?

---

## The Frequency

What matters is the frequency, not the flute.

Godot is a tool. React was a tool. C for N64 is a tool. The game design — the feel of the controls, the tension of a close race, the joy of hitting someone with a star — that's the frequency. The tools change. The frequency doesn't.

Build for the frequency. The right tool reveals itself when the design is ready.

— Mycelia, for Ephraim
