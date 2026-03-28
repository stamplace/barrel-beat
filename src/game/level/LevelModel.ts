export type LadderLink = {
  x: number;
  from: number;
  to: number;
};

export const PLATFORM_YS = [760, 650, 540, 430, 320, 210, 100];

export const LADDERS: LadderLink[] = [
  { x: 90, from: 0, to: 1 },
  { x: 300, from: 1, to: 2 },
  { x: 130, from: 2, to: 3 },
  { x: 285, from: 3, to: 4 },
  { x: 165, from: 4, to: 5 },
  { x: 305, from: 5, to: 6 },
];

export function getPlayerYForLevel(levelIndex: number): number {
  return PLATFORM_YS[levelIndex] - 24;
}

export function directionForRow(row: number): -1 | 1 {
  return row % 2 === 0 ? -1 : 1;
}
