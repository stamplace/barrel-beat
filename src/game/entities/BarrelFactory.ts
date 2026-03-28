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
  const outer = scene.add.circle(0, 0, 13, 0xd97706);
  const bandL = scene.add.rectangle(-6, 0, 3, 22, 0x78350f);
  const bandR = scene.add.rectangle(6, 0, 3, 22, 0x78350f);
  const middle = scene.add.rectangle(0, 0, 4, 22, 0x92400e);

  return scene.add.container(x, y, [outer, bandL, bandR, middle]);
}
