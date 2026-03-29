export const BARREL_SPAWN_INTERVAL_MS = 1650;
export const BARREL_OPENING_GRACE_MS = 2200;

export const INITIAL_INVULNERABLE_MS = 1800;
export const RESPAWN_INVULNERABLE_MS = 1200;

export const LADDER_TAP_RADIUS = 64;
export const LADDER_VISUAL_RADIUS = 170;
export const MOVE_MARKER_Y_OFFSET = 16;

export const BOSS_WARNING_DURATION_MS = 260;

export const HERO_AUTO_MOVE_SPEED = 4.4;

export const BARREL_DROP_SPEED = 4.4;
export const BARREL_DESPAWN_MARGIN = 50;

export function getBarrelHorizontalSpeed(stage: number): number {
  if (stage <= 1) return 1.45;
  if (stage === 2) return 1.8;
  return 1.9 + stage * 0.16;
}

export function getBarrelDropChance(stage: number): number {
  if (stage <= 1) return 0.28;
  if (stage === 2) return 0.42;
  if (stage === 3) return 0.56;
  return 0.68;
}
