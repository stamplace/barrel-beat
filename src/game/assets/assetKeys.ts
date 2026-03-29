export const TEXTURE_KEYS = {
  hero: 'hero-sheet',
  boss: 'boss-sheet',
  barrel: 'barrel-sheet',
  goal: 'goal-sheet',
  platform: 'platform-tile',
  ladder: 'ladder-tile',
  bgBack: 'bg-layer-back',
  bgFront: 'bg-layer-front',
  logo: 'logo',
} as const;

export const AUDIO_KEYS = {
  themeMain: 'theme-main',
  throw: 'sfx-throw',
  hit: 'sfx-hit',
  goal: 'sfx-goal',
  climb: 'sfx-climb',
  restart: 'sfx-restart',
  gameOver: 'sfx-gameover',
} as const;

export const ANIMATION_KEYS = {
  heroIdle: 'hero-idle',
  heroRun: 'hero-run',
  heroClimb: 'hero-climb',
  heroHit: 'hero-hit',

  bossIdle: 'boss-idle',
  bossWindup: 'boss-windup',
  bossThrow: 'boss-throw',
  bossRecoil: 'boss-recoil',

  barrelRoll: 'barrel-roll',
  barrelDanger: 'barrel-danger',

  goalIdle: 'goal-idle',
  goalPulse: 'goal-pulse',
} as const;
