export function createHero(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const legL = scene.add.rectangle(-5, 19, 4, 10, 0x60a5fa);
  const legR = scene.add.rectangle(5, 19, 4, 10, 0x60a5fa);
  const armL = scene.add.rectangle(-12, 5, 4, 10, 0xffdfb5);
  const armR = scene.add.rectangle(12, 5, 4, 10, 0xffdfb5);
  const body = scene.add.rectangle(0, 6, 18, 18, 0xff7b00);
  const head = scene.add.circle(0, -10, 8, 0xffdfb5);
  const hat = scene.add.rectangle(0, -17, 18, 5, 0xd62828);

  return scene.add.container(x, y, [legL, legR, armL, armR, body, head, hat]);
}

export function createBoss(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const body = scene.add.ellipse(0, 0, 46, 34, 0x8b4513);
  const head = scene.add.circle(-4, -22, 12, 0xb45309);
  const eyeL = scene.add.circle(-8, -24, 2, 0xffffff);
  const eyeR = scene.add.circle(0, -24, 2, 0xffffff);
  const arm = scene.add.rectangle(18, -2, 20, 8, 0x8b4513);
  const barrel = scene.add.circle(28, 2, 8, 0xd97706);

  return scene.add.container(x, y, [body, head, eyeL, eyeR, arm, barrel]);
}

export function createGoal(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const glow = scene.add.circle(0, -8, 14, 0x38bdf8, 0.35);
  const beacon = scene.add.rectangle(0, 0, 12, 32, 0x7dd3fc);
  const top = scene.add.circle(0, -18, 8, 0xe0f2fe);

  return scene.add.container(x, y, [glow, beacon, top]);
}
