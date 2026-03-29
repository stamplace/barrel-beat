# Barrel Beat Asset Pipeline

המשחק קורא manifest מ:
public/assets/asset-manifest.json

מכאן והלאה, כדי לחבר נכסים אמיתיים, מוסיפים קבצים ל:
public/assets/

ואז מעדכנים את ה-manifest.

מבנים נתמכים:

image:
{
  "key": "goal-image",
  "url": "./ui/goal.png"
}

spritesheet:
{
  "key": "hero-sheet",
  "url": "./sprites/hero-sheet.png",
  "frameWidth": 64,
  "frameHeight": 64
}

atlas:
{
  "key": "ui-atlas",
  "textureURL": "./ui/ui-atlas.png",
  "atlasURL": "./ui/ui-atlas.json"
}

audio:
{
  "key": "theme-main",
  "urls": ["./audio/theme-main.mp3"]
}

animation with explicit frames:
{
  "key": "hero-run",
  "texture": "hero-sheet",
  "frames": [4, 5, 6, 7, 8, 9],
  "frameRate": 10,
  "repeat": -1
}

animation with numeric range:
{
  "key": "hero-climb",
  "texture": "hero-sheet",
  "start": 10,
  "end": 15,
  "frameRate": 10,
  "repeat": -1
}

מינימום מומלץ לשלב הבא:
1. hero-sheet.png
2. boss-sheet.png
3. barrel-sheet.png
4. theme audio
5. animation entries ב-manifest

ברגע שתזרוק את הנכסים ותעדכן את ה-manifest,
ה-loader וה-animation registration כבר יהיו מוכנים.
