# Barrel Beat — Asset Plan

Status: PRODUCTION_ASSET_PIPELINE_FOUNDATION

## Goal
להכין צינור נכסים אמיתי למשחק כך שנוכל לעבור מ-vector placeholders
לנכסי production אמיתיים בלי לשבור את המשחק החי.

---

## Visual Direction
כיוון חזותי מומלץ:
- Retro Arcade
- Warm industrial palette
- Clear silhouettes
- Mobile-first readability
- Slightly exaggerated character proportions

---

## Required Production Assets

### Hero
Files:
- hero-sheet.png

Animations:
- hero-idle
- hero-run
- hero-climb
- hero-hit

Suggested frame size:
- 64x64

---

### Boss
Files:
- boss-sheet.png

Animations:
- boss-idle
- boss-windup
- boss-throw
- boss-recoil

Suggested frame size:
- 96x96

---

### Barrel
Files:
- barrel-sheet.png

Animations:
- barrel-roll
- barrel-danger

Suggested frame size:
- 32x32

---

### Goal
Files:
- goal-sheet.png

Animations:
- goal-idle
- goal-pulse

Suggested frame size:
- 48x48

---

### Environment
Files:
- platform-tile.png
- ladder-tile.png
- bg-layer-back.png
- bg-layer-front.png

---

### UI
Files:
- logo.png
- button-primary.png
- button-secondary.png

---

### Audio
Files:
- theme-main.mp3
- sfx-throw.mp3
- sfx-hit.mp3
- sfx-goal.mp3
- sfx-climb.mp3
- sfx-restart.mp3
- sfx-gameover.mp3

---

## Naming Convention

Textures:
- hero-sheet
- boss-sheet
- barrel-sheet
- goal-sheet
- platform-tile
- ladder-tile
- bg-layer-back
- bg-layer-front
- logo

Audio:
- theme-main
- sfx-throw
- sfx-hit
- sfx-goal
- sfx-climb
- sfx-restart
- sfx-gameover

Animations:
- hero-idle
- hero-run
- hero-climb
- hero-hit
- boss-idle
- boss-windup
- boss-throw
- boss-recoil
- barrel-roll
- barrel-danger
- goal-idle
- goal-pulse

---

## Integration Rule
כל נכס production חדש נכנס קודם ל:
- public/assets/
ואז נרשם ב:
- public/assets/asset-manifest.json

אם asset חסר:
- המשחק חייב להמשיך לעבוד עם fallback vector/code path

---

## Definition of Done
Asset pipeline נחשב מוכן כשיש:
1. manifest עם entries ראשוניים
2. naming קבוע
3. hooks טכניים לשמות assets/animations
4. docs ברורים להכנסת נכסים
5. fallback קיים ממשיך לעבוד
