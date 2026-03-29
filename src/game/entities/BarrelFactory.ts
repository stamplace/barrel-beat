import { hasBarrelTexture } from './runtimeAssetHooks.js';

export type BarrelState = {
  row: number;
  direction: -1 | 1;
  dropping: boolean;
  targetRow: number | null;
  targetY: number | null;
};

export function createBarrel(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  if (hasBarrelTexture(scene)) {
    const barrel = scene.add.container(x, y, [
      scene.add.sprite(0, 0, 'barrel-sheet', 0),
    ]);
    barrel.setDataEnabled();
    barrel.setData('assetMode', 'sprite');
    return barrel;
  }
  const shadow = scene.add.ellipse(0, 12, 20, 6, 0x000000, 0.16);

  const outer = scene.add
    .circle(0, 0, 13, 0xd9811d)
    .setStrokeStyle(2, 0x6b3415, 0.95);

  const ringL = scene.add.rectangle(-6, 0, 2.5, 22, 0x7a4a20).setStrokeStyle(1, 0x4a2c13, 0.9);
  const ringR = scene.add.rectangle(6, 0, 2.5, 22, 0x7a4a20).setStrokeStyle(1, 0x4a2c13, 0.9);
  const center = scene.add.rectangle(0, 0, 3, 22, 0x9a5b24).setStrokeStyle(1, 0x5b3517, 0.8);

  const stripe1 = scene.add.rectangle(-2, -7, 16, 2.5, 0xb66419).setAngle(18);
  const stripe2 = scene.add.rectangle(2, 0, 16, 2.5, 0xb66419).setAngle(18);
  const stripe3 = scene.add.rectangle(-2, 7, 16, 2.5, 0xb66419).setAngle(18);

  const boltL = scene.add.circle(-6, -8, 1.2, 0xe9c28a);
  const boltR = scene.add.circle(6, 8, 1.2, 0xe9c28a);
  const shine = scene.add.ellipse(-4, -5, 7, 4, 0xffd08a, 0.22).setAngle(-28);

  return scene.add.container(x, y, [
    shadow,
    outer,
    stripe1, stripe2, stripe3,
    ringL, ringR, center,
    boltL, boltR,
    shine,
  ]);
}
