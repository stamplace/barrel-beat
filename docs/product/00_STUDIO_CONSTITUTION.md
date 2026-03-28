# Barrel Beat — Studio Constitution

Status: LOCKED

## Purpose
This project must stop behaving like an expanding prototype and start behaving like a studio-built vertical slice.

## Canonical Product Mode
- Primary truth: Mobile Portrait
- Desktop is preview only
- UX decisions are made for touch, thumb reach, and fast readability

## Core Laws
1. Gameplay before polish
2. Intuition before complexity
3. Explicit state machines before hidden behavior
4. One-tap restart
5. Climb must be intent-based, not precision-based
6. Every interaction must be visually explained
7. No feature is done without acceptance criteria
8. No patching when structural refactor is the correct move

## Active Arms
### 1. Gameplay
- Hero movement
- Ladder climb
- Barrel throw/drop/movement
- Goal reach
- Hit / lives / restart loop

### 2. Mobile Viewport
- Portrait canonical layout
- Touch-first controls
- Clear visual hierarchy
- No desktop-first assumptions

### 3. Feedback & Feel
- Hit feedback
- Stage banners
- Throw readability
- Goal clarity
- Motion readability

### 4. Code Architecture
- Scene = orchestration only
- Systems = isolated behavior
- Entities = visual/game objects
- Level = layout truth
- UI = overlays and controls
- Acceptance logic must stay readable

### 5. QA
Every slice must pass:
- npm run typecheck
- npm run build
- visual playtest on phone
- restart works
- climb works by intent
- fail state is recoverable
- goal state is understandable

### 6. Product Standard
A slice is not considered “good” because it runs.
A slice is considered good only if:
- a new player understands the objective quickly
- controls feel reliable
- failure feels fair
- the game looks intentional
- the next improvement is obvious

## Immediate Priorities
1. Lock mobile canonical viewport
2. Remove ambiguity between desktop-preview and phone-truth
3. Finish intuitive ladder snap
4. Improve readability of hazard flow
5. Replace placeholder-feel with slice-feel

