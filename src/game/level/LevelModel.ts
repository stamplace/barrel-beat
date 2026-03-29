export type LadderLink = {
  x: number;
  from: number;
  to: number;
};

export type LevelLayout = {
  name: string;
  platformYs: number[];
  ladders: LadderLink[];
};

const LEVEL_LAYOUTS: LevelLayout[] = [
  {
    name: 'Classic Lift',
    platformYs: [760, 650, 540, 430, 320, 210, 100],
    ladders: [
      { x: 90, from: 0, to: 1 },
      { x: 300, from: 1, to: 2 },
      { x: 130, from: 2, to: 3 },
      { x: 285, from: 3, to: 4 },
      { x: 165, from: 4, to: 5 },
      { x: 305, from: 5, to: 6 },
    ],
  },
  {
    name: 'Zigzag Shift',
    platformYs: [760, 650, 540, 430, 320, 210, 100],
    ladders: [
      { x: 300, from: 0, to: 1 },
      { x: 120, from: 1, to: 2 },
      { x: 285, from: 2, to: 3 },
      { x: 110, from: 3, to: 4 },
      { x: 300, from: 4, to: 5 },
      { x: 150, from: 5, to: 6 },
    ],
  },
];

const initialLayout = LEVEL_LAYOUTS[0];

export const PLATFORM_YS: number[] = [...initialLayout.platformYs];
export const LADDERS: LadderLink[] = initialLayout.ladders.map((ladder) => ({ ...ladder }));

export function getStageLayout(stage: number): LevelLayout {
  return LEVEL_LAYOUTS[(Math.max(stage, 1) - 1) % LEVEL_LAYOUTS.length];
}

export function getStageLayoutName(stage: number): string {
  return getStageLayout(stage).name;
}

export function applyStageLayout(stage: number): void {
  const layout = getStageLayout(stage);

  PLATFORM_YS.splice(0, PLATFORM_YS.length, ...layout.platformYs);
  LADDERS.splice(0, LADDERS.length, ...layout.ladders.map((ladder) => ({ ...ladder })));
}

export function getPlayerYForLevel(levelIndex: number): number {
  return PLATFORM_YS[levelIndex] - 24;
}

export function directionForRow(row: number): -1 | 1 {
  return row % 2 === 0 ? -1 : 1;
}
