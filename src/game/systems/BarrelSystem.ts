import { createBarrel, type BarrelState } from '../entities/BarrelFactory.js';
import { LADDERS, PLATFORM_YS, directionForRow } from '../level/LevelModel.js';

type RuntimeBarrelState = BarrelState & {
  dropEvaluatedRow: number | null;
};

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
      dropEvaluatedRow: null,
    } as RuntimeBarrelState);

    this.barrels.add(barrel);
  }

  clear(): void {
    const children = this.barrels.getChildren() as Phaser.GameObjects.Container[];
    for (const barrel of children) {
      barrel.destroy();
    }
  }

  private getHorizontalSpeed(stage: number): number {
    if (stage <= 1) return 1.45;
    if (stage === 2) return 1.8;
    return 1.9 + stage * 0.16;
  }

  private getDropChance(stage: number): number {
    if (stage <= 1) return 0.28;
    if (stage === 2) return 0.42;
    if (stage === 3) return 0.56;
    return 0.68;
  }

  update(stage: number, sceneWidth: number): void {
    const barrels = this.barrels.getChildren() as Phaser.GameObjects.Container[];

    for (const barrel of barrels) {
      const state = barrel.getData('state') as RuntimeBarrelState | undefined;
      if (!state) continue;

      barrel.rotation += 0.06 * state.direction;

      if (state.dropping && state.targetRow !== null && state.targetY !== null) {
        barrel.y += 4.4;

        if (barrel.y >= state.targetY) {
          barrel.y = state.targetY;
          state.row = state.targetRow;
          state.targetRow = null;
          state.targetY = null;
          state.dropping = false;
          state.direction = directionForRow(state.row);
          state.dropEvaluatedRow = null;
          barrel.setData('state', state);
        }

        continue;
      }

      barrel.x += state.direction * this.getHorizontalSpeed(stage);

      const ladderBelow = LADDERS.find((ladder) => ladder.to === state.row);
      if (ladderBelow) {
        const crossed =
          (state.direction < 0 && barrel.x <= ladderBelow.x) ||
          (state.direction > 0 && barrel.x >= ladderBelow.x);

        if (crossed && state.dropEvaluatedRow !== state.row) {
          state.dropEvaluatedRow = state.row;

          if (Math.random() < this.getDropChance(stage)) {
            state.dropping = true;
            state.targetRow = ladderBelow.from;
            state.targetY = PLATFORM_YS[ladderBelow.from] - 18;
            barrel.x = ladderBelow.x;
          }

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
