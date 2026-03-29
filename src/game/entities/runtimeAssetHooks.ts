import { TEXTURE_KEYS } from '../assets/assetKeys.js';

export function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

export function hasHeroTexture(scene: Phaser.Scene): boolean {
  return hasTexture(scene, TEXTURE_KEYS.hero);
}

export function hasBossTexture(scene: Phaser.Scene): boolean {
  return hasTexture(scene, TEXTURE_KEYS.boss);
}

export function hasBarrelTexture(scene: Phaser.Scene): boolean {
  return hasTexture(scene, TEXTURE_KEYS.barrel);
}

export function hasGoalTexture(scene: Phaser.Scene): boolean {
  return hasTexture(scene, TEXTURE_KEYS.goal);
}
