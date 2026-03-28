import { createBarrel, type BarrelState } from '../entities/BarrelFactory.js';
import { LADDERS, PLATFORM_YS, directionForRow } from '../level/LevelModel.js';

export class BarrelSystem {
  constructor(
    private scene: Phaser.Scene,
    private barrels: Phaser.Physics.Arcade.Group,
  ) {}

  spawnFromBoss(bossX: number): void {
    const topRow = PLATFORM_YS.length - 1;
    const barrel = createBarrel(this.scene, bossX - 24, PLATFORM_YS[topRow] - 18);

    this.scene.physics.add.existing(barrel);
    const body = barrel.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(24, 24);
    body.setOffset(-12, -12);

    barrel.setData('state', {
      row: topRow,
      direction: -1,
      dropping: false,
      targetRow: null,
      targetY: null,
    } as BarrelState);

    this.barrels.add(barrel);
  }

  clear(): void {
    const children = this.barrels.getChildren() as Phaser.GameObjects.Container[];
    for (const barrel of children) {
      barrel.destroy();
    }
  }

  update(stage: number, sceneWidth: number): void {
    const barrels = this.barrels.getChildren() as Phaser.GameObjects.Container[];

    for (const barrel of barrels) {
      const state = barrel.getData('state') as BarrelState | undefined;
      if (!state) continue;

      barrel.rotation += 0.08 * state.direction;

      if (state.dropping && state.targetRow !== null && state.targetY !== null) {
        barrel.y += 5.2;

        if (barrel.y >= state.targetY) {
          barrel.y = state.targetY;
          state.row = state.targetRow;
          state.targetRow = null;
          state.targetY = null;
          state.dropping = false;
          state.direction = directionForRow(state.row);
          barrel.setData('state', state);
        }

        continue;
      }

      barrel.x += state.direction * (2.2 + stage * 0.22);

      const ladderBelow = LADDERS.find((ladder) => ladder.to === state.row);
      if (ladderBelow) {
        const crossed =
          (state.direction < 0 && barrel.x <= ladderBelow.x) ||
          (state.direction > 0 && barrel.x >= ladderBelow.x);

        if (crossed) {
          state.dropping = true;
          state.targetRow = ladderBelow.from;
          state.targetY = PLATFORM_YS[ladderBelow.from] - 18;
          barrel.x = ladderBelow.x;
          barrel.setData('state', state);
          continue;
        }
      }

      if (barrel.x < -50 || barrel.x > sceneWidth + 50) {
        barrel.destroy();
      }
    }
  }
}
