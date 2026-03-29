import type { AssetManifest, ManifestAnimation } from '../assets/assetManifest.js';

function buildFrames(
  scene: Phaser.Scene,
  entry: ManifestAnimation,
): Phaser.Types.Animations.AnimationFrame[] {
  if (Array.isArray(entry.frames) && entry.frames.length > 0) {
    return entry.frames.map((frame) => ({
      key: entry.texture,
      frame,
    }));
  }

  if (typeof entry.start === 'number' && typeof entry.end === 'number') {
    return scene.anims.generateFrameNumbers(entry.texture, {
      start: entry.start,
      end: entry.end,
    });
  }

  return [];
}

export function registerAnimationsFromManifest(
  scene: Phaser.Scene,
  manifest: AssetManifest,
): void {
  for (const entry of manifest.animations) {
    if (scene.anims.exists(entry.key)) continue;
    if (!scene.textures.exists(entry.texture)) continue;

    const frames = buildFrames(scene, entry);
    if (frames.length === 0) continue;

    scene.anims.create({
      key: entry.key,
      frames,
      frameRate: entry.frameRate ?? 10,
      repeat: entry.repeat ?? 0,
      yoyo: entry.yoyo ?? false,
    });
  }
}
