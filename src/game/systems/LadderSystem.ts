import { LADDERS, PLATFORM_YS, type LadderLink } from '../level/LevelModel.js';

export type LadderLayer = {
  hints: Phaser.GameObjects.Rectangle[];
  markers: Phaser.GameObjects.Text[];
};

export function drawLadderLayer(scene: Phaser.Scene): LadderLayer {
  const hints: Phaser.GameObjects.Rectangle[] = [];
  const markers: Phaser.GameObjects.Text[] = [];

  for (const ladder of LADDERS) {
    const yTop = PLATFORM_YS[ladder.to];
    const yBottom = PLATFORM_YS[ladder.from];
    const centerY = (yTop + yBottom) / 2;
    const ladderHeight = yBottom - yTop - 18;

    const hint = scene.add
      .rectangle(ladder.x, centerY, 70, ladderHeight + 38, 0xfbbf24, 0.04)
      .setOrigin(0.5);
    hints.push(hint);

    scene.add.rectangle(ladder.x, centerY, 10, ladderHeight, 0x94a3b8).setOrigin(0.5);

    for (let y = yTop + 16; y < yBottom - 12; y += 18) {
      scene.add.rectangle(ladder.x, y, 26, 4, 0xcbd5e1).setOrigin(0.5);
    }

    const marker = scene.add
      .text(ladder.x, yBottom - 28, '⇅', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '16px',
        color: '#fde68a',
      })
      .setOrigin(0.5)
      .setAlpha(0.24);

    markers.push(marker);
  }

  return { hints, markers };
}

export function updateLadderVisuals(
  playerX: number,
  hints: Phaser.GameObjects.Rectangle[],
  markers: Phaser.GameObjects.Text[],
  activeDistance = 148,
): void {
  for (const hint of hints) {
    hint.setAlpha(Math.abs(playerX - hint.x) < activeDistance ? 0.16 : 0.04);
  }

  for (const marker of markers) {
    marker.setAlpha(Math.abs(playerX - marker.x) < activeDistance ? 0.92 : 0.24);
  }
}

export function findNearestLadder(
  playerX: number,
  currentLevelIndex: number,
  direction: 'up' | 'down',
  maxDistance = 148,
): LadderLink | null {
  const candidates = LADDERS.filter((ladder) =>
    direction === 'up'
      ? currentLevelIndex === ladder.from
      : currentLevelIndex === ladder.to,
  );

  if (candidates.length === 0) return null;

  let nearest: LadderLink | null = null;
  let nearestDistance = Infinity;

  for (const ladder of candidates) {
    const distance = Math.abs(playerX - ladder.x);
    if (distance < nearestDistance) {
      nearest = ladder;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= maxDistance ? nearest : null;
}
