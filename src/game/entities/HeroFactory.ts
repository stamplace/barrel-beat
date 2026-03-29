function outlinedRect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  strokeColor = 0x2b1607,
  strokeWidth = 2,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(x, y, width, height, fillColor)
    .setStrokeStyle(strokeWidth, strokeColor, 0.95);
}

function outlinedCircle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  fillColor: number,
  strokeColor = 0x2b1607,
  strokeWidth = 2,
): Phaser.GameObjects.Arc {
  return scene.add
    .circle(x, y, radius, fillColor)
    .setStrokeStyle(strokeWidth, strokeColor, 0.95);
}

export function createHero(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 24, 26, 8, 0x000000, 0.18);

  const bootL = outlinedRect(scene, -5, 23, 7, 5, 0x1e293b);
  const bootR = outlinedRect(scene, 5, 23, 7, 5, 0x1e293b);

  const legL = outlinedRect(scene, -5, 16, 6, 11, 0x5fa8ff);
  const legR = outlinedRect(scene, 5, 16, 6, 11, 0x5fa8ff);

  const torso = outlinedRect(scene, 0, 4, 20, 20, 0xf97316);
  const belt = outlinedRect(scene, 0, 10, 20, 4, 0x6b3f1d, 0x1f1207, 1);
  const buttonL = outlinedCircle(scene, -4, 4, 1.8, 0xffe082, 0x6b3f1d, 1);
  const buttonR = outlinedCircle(scene, 4, 4, 1.8, 0xffe082, 0x6b3f1d, 1);

  const armL = outlinedRect(scene, -14, 4, 5, 12, 0xffd9b5);
  const armR = outlinedRect(scene, 14, 4, 5, 12, 0xffd9b5);
  const gloveL = outlinedRect(scene, -14, 11, 6, 5, 0x24180f, 0x24180f, 1);
  const gloveR = outlinedRect(scene, 14, 11, 6, 5, 0x24180f, 0x24180f, 1);

  const head = outlinedCircle(scene, 0, -10, 8, 0xffd9b5);
  const hair = outlinedRect(scene, 0, -14, 16, 4, 0x6b3415);
  const nose = outlinedRect(scene, 0, -9, 3, 4, 0xe7b98d, 0xb17a52, 1);
  const eyeL = outlinedCircle(scene, -3, -11, 1.4, 0xffffff, 0x3a2412, 1);
  const eyeR = outlinedCircle(scene, 3, -11, 1.4, 0xffffff, 0x3a2412, 1);
  const pupilL = outlinedCircle(scene, -3, -11, 0.6, 0x24180f, 0x24180f, 1);
  const pupilR = outlinedCircle(scene, 3, -11, 0.6, 0x24180f, 0x24180f, 1);

  const capTop = outlinedRect(scene, 0, -19, 18, 5, 0xd62828);
  const capBrim = outlinedRect(scene, 4, -16, 10, 2, 0x8f1616, 0x5b0d0d, 1);

  const hero = scene.add.container(x, y, [
    shadow,
    bootL, bootR,
    legL, legR,
    torso, belt, buttonL, buttonR,
    armL, armR, gloveL, gloveR,
    head, hair, nose, eyeL, eyeR, pupilL, pupilR,
    capTop, capBrim,
  ]);

  hero.setDataEnabled();
  hero.setData('parts', {
    shadow,
    bootL, bootR,
    legL, legR,
    torso,
    armL, armR,
    head,
  });

  return hero;
}

export function createBoss(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 18, 54, 10, 0x000000, 0.2);

  const legL = outlinedRect(scene, -13, 12, 10, 10, 0x7a3b14);
  const legR = outlinedRect(scene, 5, 12, 10, 10, 0x7a3b14);

  const torso = scene.add
    .ellipse(0, 0, 52, 36, 0x9a4f1d)
    .setStrokeStyle(2, 0x4a240c, 0.95);

  const chest = scene.add
    .ellipse(0, 4, 22, 16, 0xc48a56)
    .setStrokeStyle(1, 0x6b3415, 0.8);

  const armL = outlinedRect(scene, -24, 3, 14, 8, 0x8c4517);
  const armR = outlinedRect(scene, 24, 3, 18, 8, 0x8c4517);
  const fistL = outlinedCircle(scene, -31, 4, 5, 0x9a4f1d);
  const fistR = outlinedCircle(scene, 34, 6, 6, 0x9a4f1d);

  const head = outlinedCircle(scene, -4, -19, 13, 0x8f4517);
  const brow = outlinedRect(scene, -4, -22, 14, 4, 0x4a240c, 0x4a240c, 1);
  const eyeL = outlinedCircle(scene, -8, -19, 1.8, 0xffffff, 0x24180f, 1);
  const eyeR = outlinedCircle(scene, 0, -19, 1.8, 0xffffff, 0x24180f, 1);
  const pupilL = outlinedCircle(scene, -8, -19, 0.7, 0x24180f, 0x24180f, 1);
  const pupilR = outlinedCircle(scene, 0, -19, 0.7, 0x24180f, 0x24180f, 1);

  const mouth = outlinedRect(scene, -4, -13, 8, 2, 0x4a240c, 0x4a240c, 1);
  const heldBarrel = outlinedCircle(scene, 28, 4, 8, 0xce7a18, 0x6b3415, 2);
  const heldRingL = outlinedRect(scene, 24, 4, 2, 12, 0x7a4a20, 0x7a4a20, 1);
  const heldRingR = outlinedRect(scene, 32, 4, 2, 12, 0x7a4a20, 0x7a4a20, 1);

  return scene.add.container(x, y, [
    shadow,
    legL, legR,
    torso, chest,
    armL, armR, fistL, fistR,
    head, brow, eyeL, eyeR, pupilL, pupilR, mouth,
    heldBarrel, heldRingL, heldRingR,
  ]);
}

export function createGoal(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const glow = scene.add.circle(0, -16, 20, 0x38bdf8, 0.18);
  const pole = outlinedRect(scene, 0, 0, 6, 34, 0xa5c7d8, 0x2b4a56, 1);
  const flag = outlinedRect(scene, 10, -12, 18, 10, 0x7dd3fc, 0x2b4a56, 1).setOrigin(0.5);
  const cap = outlinedCircle(scene, 0, -18, 7, 0xe0f2fe, 0x2b4a56, 1);
  const star = scene.add.star(0, -18, 5, 3, 6, 0xffffff, 0.9).setScale(0.55);

  return scene.add.container(x, y, [glow, pole, flag, cap, star]);
}
