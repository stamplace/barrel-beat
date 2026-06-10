export type LadderLink = {
  x: number;
  from: number;
  to: number;
};


export type FloorSpec = {
  floorIndex: number;
  role?: string;
  widthClass?: 'wide' | 'medium' | 'narrow';
  xAlign?: 'left' | 'center' | 'right';
  ladderEntrySide?: 'left' | 'right' | 'center';
  ladderExitSide?: 'left' | 'right' | 'center' | 'center-short';
  frontness?: 'front' | 'mid' | 'rear';
  hazardProfile?: string;
  eventHook?: string;
  visualVariant?: string;
};

export type LevelLayout = {
  name: string;
  platformYs: number[];
  ladders: LadderLink[];
};

const LEVEL_LAYOUTS: LevelLayout[] = [
  {
    name: 'Temple Tower V1',
    platformYs: [742, 605, 468, 320],
    ladders: [
      { x: 196, from: 0, to: 1 },
      { x: 208, from: 1, to: 2 },
      { x: 198, from: 2, to: 3 },
    ],
  },
  {
    name: 'Temple Tower V1 Shift',
    platformYs: [742, 605, 468, 320],
    ladders: [
      { x: 194, from: 0, to: 1 },
      { x: 206, from: 1, to: 2 },
      { x: 200, from: 2, to: 3 },
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



export function getFloorSpec(stage: number, levelIndex: number): FloorSpec | null {
  return null;
}

export function getPlayerYForLevel(levelIndex: number): number {
  return PLATFORM_YS[levelIndex] - 24;
}

export function directionForRow(row: number): -1 | 1 {
  return row % 2 === 0 ? 1 : -1;
}

export function getFloorBounds(
  stage: number,
  levelIndex: number,
  sceneWidth: number,
): { minX: number; maxX: number; centerX: number; width: number } {
  const widths = [286, 252, 236, 312];
  const centers = [195, 191, 199, 195];

  const width = widths[Math.max(0, Math.min(levelIndex, widths.length - 1))];
  const centerX = centers[Math.max(0, Math.min(levelIndex, centers.length - 1))];

  return {
    minX: Math.max(22, centerX - width / 2),
    maxX: Math.min(sceneWidth - 22, centerX + width / 2),
    centerX,
    width,
  };
}
