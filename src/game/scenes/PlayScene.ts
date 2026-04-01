import { MusicController } from '../../audio/music.js';
import { SfxController } from '../../audio/sfx.js';
import { createBoss, createGoal, createHero } from '../entities/HeroFactory.js';
import { PLATFORM_YS, applyStageLayout, getFloorBounds, getFloorSpec, getPlayerYForLevel, getStageLayoutName } from '../level/LevelModel.js';
import {
  BARREL_OPENING_GRACE_MS,
  BARREL_SPAWN_INTERVAL_MS,
  BOSS_WARNING_DURATION_MS,
  HERO_AUTO_MOVE_SPEED,
  INITIAL_INVULNERABLE_MS,
  LADDER_TAP_RADIUS,
  LADDER_VISUAL_RADIUS,
  MOVE_MARKER_Y_OFFSET,
  RESPAWN_INVULNERABLE_MS,
} from '../data/BalanceConfig.js';
import { BarrelSystem } from '../systems/BarrelSystem.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import {
  drawLadderLayer,
  findNearestLadder,
  updateLadderVisuals,
} from '../systems/LadderSystem.js';

const HIGH_SCORE_KEY = 'barrel-beat-high-score';

type ActiveClimb = {
  x: number;
  targetLevel: number;
  targetY: number;
  direction: -1 | 1;
};

type LadderSnap = {
  x: number;
  targetLevel: number;
  targetY: number;
  direction: -1 | 1;
};

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private goal!: Phaser.GameObjects.Container;
  private boss!: Phaser.GameObjects.Container;
  private barrels!: Phaser.Physics.Arcade.Group;
  private barrelSystem!: BarrelSystem;
  private feedback!: FeedbackSystem;

  private ladderHints: Phaser.GameObjects.Rectangle[] = [];
  private ladderMarkers: Phaser.GameObjects.Text[] = [];
  private moveMarker!: Phaser.GameObjects.Container;
  private bossWarning!: Phaser.GameObjects.Container;
  private heroParts: Record<string, Phaser.GameObjects.Shape> | null = null;
  private bossParts: Record<string, any> | null = null;
  private bossThrowPulseUntil = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  private score = 0;
  private best = 0;
  private lives = 3;
  private stage = 1;
  private gameOver = false;
  private started = false;

  private currentLevelIndex = 0;
  private activeClimb: ActiveClimb | null = null;
  private snapToLadder: LadderSnap | null = null;
  private targetMoveX: number | null = null;
  private lastLadderHintAt = 0;
  private runStartedAt = 0;
  private invulnerableUntil = 0;
  private carryScore = 0;
  private carryLives = 3;
  private carryStage = 1;
  private carryBest = 0;
  private autoStart = false;

  private domCleanup: Array<() => void> = [];
  private music = new MusicController();
  private sfx = new SfxController();

  constructor() {
    super('play');
  }

  init(data: {
    score?: number;
    lives?: number;
    stage?: number;
    best?: number;
    autoStart?: boolean;
  } = {}): void {
    this.carryScore = data.score ?? 0;
    this.carryLives = data.lives ?? 3;
    this.carryStage = data.stage ?? 1;
    this.carryBest = data.best ?? 0;
    this.autoStart = data.autoStart ?? false;
  }

  private resetSceneState(): void {
    this.score = this.carryScore;
    this.lives = this.carryLives;
    this.stage = this.carryStage;
    this.gameOver = false;
    this.started = false;
    this.currentLevelIndex = 0;
    this.activeClimb = null;
    this.snapToLadder = null;
    this.targetMoveX = null;
    this.lastLadderHintAt = 0;
    this.runStartedAt = 0;
    this.invulnerableUntil = 0;
    this.bossThrowPulseUntil = 0;
  }

  create(): void {
    this.resetSceneState();
    applyStageLayout(this.stage);

    const { width } = this.scale;
    this.best = Math.max(Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0'), this.carryBest);

    this.cameras.main.setBackgroundColor('#120d08');
    this.drawWorld();

    const startBounds = this.getDeckBounds(0);
    const topBounds = this.getDeckBounds(PLATFORM_YS.length - 1);
    this.player = createHero(this, startBounds.minX + 24, getPlayerYForLevel(0));
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(22, 34);
    this.playerBody.setOffset(-11, -17);
    this.heroParts = this.player.getData('parts') as Record<string, Phaser.GameObjects.Shape> | null;
    const heroAssetMode = this.player.getData('assetMode');

    this.goal = createGoal(this, topBounds.maxX - 22, PLATFORM_YS[PLATFORM_YS.length - 1] - 30);
    this.physics.add.existing(this.goal, true);
    this.goal.setScale(0.86);
    this.goal.setDepth(13);

    const structure = this.add.graphics();
    structure.setDepth(1);

    let towerMinX = width;
    let towerMaxX = 0;

    const floorRects: Array<{
      minX: number;
      maxX: number;
      centerX: number;
      y: number;
      floorIndex: number;
    }> = [];

    for (let floorIndex = 0; floorIndex < PLATFORM_YS.length; floorIndex += 1) {
      const bounds = getFloorBounds(this.stage, floorIndex, width);
      floorRects.push({
        minX: bounds.minX,
        maxX: bounds.maxX,
        centerX: bounds.centerX,
        y: PLATFORM_YS[floorIndex],
        floorIndex,
      });

      towerMinX = Math.min(towerMinX, bounds.minX);
      towerMaxX = Math.max(towerMaxX, bounds.maxX);
    }

    towerMinX -= 34;
    towerMaxX += 34;

    const towerTop = PLATFORM_YS[PLATFORM_YS.length - 1] - 56;
    const towerBottom = PLATFORM_YS[0] + 86;
    const towerWidth = towerMaxX - towerMinX;
    const towerHeight = towerBottom - towerTop;

    structure.fillStyle(0x10141b, 0.26);
    structure.fillRoundedRect(towerMinX, towerTop, towerWidth, towerHeight, 18);

    structure.fillStyle(0x1a2029, 0.24);
    structure.fillRoundedRect(towerMinX + 18, towerTop + 12, towerWidth - 36, towerHeight - 24, 14);

    const pillarXs = [
      towerMinX + 28,
      towerMinX + towerWidth * 0.34,
      towerMinX + towerWidth * 0.66,
      towerMaxX - 28,
    ];

    structure.fillStyle(0x0b0e13, 0.30);
    for (const pillarX of pillarXs) {
      structure.fillRoundedRect(pillarX - 7, towerTop + 20, 14, towerHeight - 40, 7);
    }

    structure.fillStyle(0x2a1e14, 0.18);
    for (let i = 0; i < floorRects.length; i += 1) {
      const rect = floorRects[i];

      structure.fillRoundedRect(
        rect.minX - 10,
        rect.y + 8,
        rect.maxX - rect.minX + 20,
        26,
        6
      );

      structure.fillStyle(0x0c0f14, 0.26);
      structure.fillRoundedRect(
        rect.minX + 12,
        rect.y + 36,
        rect.maxX - rect.minX - 24,
        42,
        8
      );

      if (i < floorRects.length - 1) {
        const next = floorRects[i + 1];
        const bridgeMinX = Math.min(rect.centerX, next.centerX) - 16;
        const bridgeMaxX = Math.max(rect.centerX, next.centerX) + 16;
        const bridgeTop = next.y + 48;
        const bridgeHeight = rect.y - next.y - 88;

        if (bridgeHeight > 16) {
          structure.fillStyle(0x141920, 0.24);
          structure.fillRoundedRect(
            bridgeMinX,
            bridgeTop,
            bridgeMaxX - bridgeMinX,
            bridgeHeight,
            10
          );
        }
      }
    }

    const baseY = PLATFORM_YS[0] + 52;
    structure.fillStyle(0x120d09, 0.34);
    structure.fillRoundedRect(towerMinX - 16, baseY, towerWidth + 32, 56, 12);

    structure.fillStyle(0x2a1b11, 0.26);
    structure.fillRoundedRect(towerMinX - 8, baseY - 8, towerWidth + 16, 28, 10);

    structure.fillStyle(0x3a2b1d, 0.12);
    structure.fillRoundedRect(towerMinX + 18, baseY + 12, towerWidth - 36, 18, 8);

    const bossDeckY = PLATFORM_YS[PLATFORM_YS.length - 1] - 10;
    structure.fillStyle(0x24180f, 0.34);
    structure.fillRoundedRect(towerMinX + 6, bossDeckY - 4, towerWidth - 12, 30, 12);

    structure.fillStyle(0x43311f, 0.16);
    structure.fillRoundedRect(towerMinX + 24, bossDeckY + 2, towerWidth - 48, 10, 6);

    structure.fillStyle(0x1a120b, 0.22);
    structure.fillRoundedRect(towerMinX - 4, bossDeckY + 12, 26, 22, 8);
    structure.fillRoundedRect(towerMaxX - 22, bossDeckY + 12, 26, 22, 8);
    this.boss = createBoss(this, topBounds.centerX + 6, PLATFORM_YS[PLATFORM_YS.length - 1] - 14);
    this.boss.setScale(1.34);
    this.boss.setDepth(12);
    this.bossParts = this.boss.getData('parts') as Record<string, any> | null;

    this.barrels = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.barrelSystem = new BarrelSystem(this, this.barrels);
    this.feedback = new FeedbackSystem(this);

    this.scoreText = this.add.text(16, 14, 'SCORE 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.bestText = this.add.text(width - 16, 14, `BEST ${this.best}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(1, 0);

    this.livesText = this.add.text(16, 40, 'LIVES 3', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#ffd7a3',
    });

    this.levelText = this.add.text(width - 16, 40, `LEVEL ${this.stage}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#ffd7a3',
    }).setOrigin(1, 0);

    this.moveMarker = this.createMoveMarker();
    this.moveMarker.setScale(0.8);
    this.bossWarning = this.createBossWarning();

    this.physics.add.overlap(this.player, this.barrels, () => this.onBarrelHit(), undefined, this);
    this.physics.add.overlap(this.player, this.goal, () => this.onGoalReached(), undefined, this);

    this.time.addEvent({
      delay: BARREL_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawnBarrelFromBoss,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        if (this.gameOver || !this.started) return;
        this.score += 1;
        this.scoreText.setText(`SCORE ${this.score}`);
      },
    });

    this.input.on('pointerdown', this.handleWorldTap, this);
    this.setupOverlayControls();
    this.updateStartOverlay();

    if (this.autoStart) {
      this.beginRun();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const cleanup of this.domCleanup) cleanup();
      this.domCleanup = [];
    });
  }

  private createMoveMarker(): Phaser.GameObjects.Container {
    const ring = this.add.circle(0, 0, 14, 0x7dd3fc, 0.14).setStrokeStyle(2, 0x7dd3fc, 0.85);
    const dot = this.add.circle(0, 0, 3, 0xe0f2fe, 1);
    return this.add.container(0, 0, [ring, dot]).setVisible(false).setDepth(22);
  }

  private createBossWarning(): Phaser.GameObjects.Container {
    const ring = this.add.circle(0, 0, 18, 0xffc857, 0.14).setStrokeStyle(3, 0xffc857, 0.95);
    const mark = this.add.text(0, 0, '!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#ffe08a',
      stroke: '#5b3412',
      strokeThickness: 4,
    }).setOrigin(0.5);
    return this.add.container(0, 0, [ring, mark]).setVisible(false).setDepth(25);
  }

  private easeHeroPart(
    key: string,
    property: 'angle' | 'y' | 'scaleX' | 'alpha',
    target: number,
    factor = 0.18,
  ): void {
    const part = this.heroParts?.[key] as any;
    if (!part) return;
    part[property] += (target - part[property]) * factor;
  }

  private updateHeroAnimation(): void {
    if (!this.heroParts || Object.keys(this.heroParts).length === 0) return;

    const wave = Math.sin(this.time.now / 95);
    const climbWave = Math.sin(this.time.now / 80);

    if (this.activeClimb || this.snapToLadder) {
      this.easeHeroPart('armL', 'angle', -55 + climbWave * 14, 0.22);
      this.easeHeroPart('armR', 'angle', 55 - climbWave * 14, 0.22);
      this.easeHeroPart('legL', 'angle', -12 - climbWave * 10, 0.22);
      this.easeHeroPart('legR', 'angle', 12 + climbWave * 10, 0.22);
      this.easeHeroPart('head', 'y', -10 + climbWave * 0.8, 0.2);
      this.easeHeroPart('torso', 'angle', 0, 0.18);
      this.easeHeroPart('shadow', 'scaleX', 0.86, 0.14);
      this.easeHeroPart('shadow', 'alpha', 0.09, 0.14);
      return;
    }

    if (this.targetMoveX !== null) {
      this.easeHeroPart('armL', 'angle', -22 + wave * 28, 0.22);
      this.easeHeroPart('armR', 'angle', 22 - wave * 28, 0.22);
      this.easeHeroPart('legL', 'angle', 18 - wave * 26, 0.22);
      this.easeHeroPart('legR', 'angle', -18 + wave * 26, 0.22);
      this.easeHeroPart('head', 'y', -10 + Math.abs(wave) * 0.9, 0.2);
      this.easeHeroPart('torso', 'angle', wave * 2.8, 0.18);
      this.easeHeroPart('shadow', 'scaleX', 1.08, 0.14);
      this.easeHeroPart('shadow', 'alpha', 0.18, 0.14);
      return;
    }

    this.easeHeroPart('armL', 'angle', 0, 0.18);
    this.easeHeroPart('armR', 'angle', 0, 0.18);
    this.easeHeroPart('legL', 'angle', 0, 0.18);
    this.easeHeroPart('legR', 'angle', 0, 0.18);
    this.easeHeroPart('head', 'y', -10 + Math.sin(this.time.now / 220) * 0.4, 0.12);
    this.easeHeroPart('torso', 'angle', 0, 0.14);
    this.easeHeroPart('shadow', 'scaleX', 1, 0.12);
    this.easeHeroPart('shadow', 'alpha', 0.14, 0.12);
  }

  private easeBossPart(
    key: string,
    property: 'angle' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'alpha',
    target: number,
    factor = 0.16,
  ): void {
    const part = this.bossParts?.[key] as any;
    if (!part) return;
    part[property] += (target - part[property]) * factor;
  }

  private updateBossAnimation(): void {
    if (!this.bossParts || Object.keys(this.bossParts).length === 0) return;

    const idle = Math.sin(this.time.now / 210);
    const warningPose = this.bossWarning.visible;
    const recoilPose = this.time.now < this.bossThrowPulseUntil;

    if (warningPose) {
      this.easeBossPart('armL', 'angle', -12, 0.22);
      this.easeBossPart('armR', 'angle', -28, 0.22);
      this.easeBossPart('fistR', 'x', 39, 0.22);
      this.easeBossPart('heldBarrel', 'x', 34, 0.22);
      this.easeBossPart('heldBarrel', 'y', 1, 0.22);
      this.easeBossPart('head', 'y', -21, 0.2);
      this.easeBossPart('torso', 'scaleY', 1.04, 0.16);
      this.easeBossPart('shadow', 'scaleX', 1.06, 0.16);
      return;
    }

    if (recoilPose) {
      this.easeBossPart('armL', 'angle', 10, 0.24);
      this.easeBossPart('armR', 'angle', 24, 0.24);
      this.easeBossPart('fistR', 'x', 32, 0.24);
      this.easeBossPart('heldBarrel', 'x', 26, 0.24);
      this.easeBossPart('heldBarrel', 'y', 6, 0.24);
      this.easeBossPart('head', 'y', -18, 0.2);
      this.easeBossPart('torso', 'scaleY', 0.97, 0.18);
      this.easeBossPart('shadow', 'scaleX', 0.95, 0.16);
      return;
    }

    this.easeBossPart('armL', 'angle', -3 + idle * 3, 0.14);
    this.easeBossPart('armR', 'angle', 4 - idle * 4, 0.14);
    this.easeBossPart('fistR', 'x', 34 + idle * 0.8, 0.14);
    this.easeBossPart('heldBarrel', 'x', 28 + idle * 0.8, 0.14);
    this.easeBossPart('heldBarrel', 'y', 4 + Math.abs(idle) * 0.5, 0.14);
    this.easeBossPart('head', 'y', -19 + idle * 0.6, 0.12);
    this.easeBossPart('torso', 'scaleY', 1 + idle * 0.015, 0.12);
    this.easeBossPart('shadow', 'scaleX', 1, 0.12);
  }


  private getDeckWidth(floorIndex: number): number {
    const width = this.scale.width;
    const widths = [
      width - 104,
      width - 132,
      width - 112,
      width - 132,
      width - 108,
      width - 96,
    ];
    return Math.max(164, widths[floorIndex % widths.length]);
  }

  private getDeckOffset(floorIndex: number): number {
    const offsets = [0, -10, 10, -8, 8, 0];
    return offsets[floorIndex % offsets.length];
  }

  private getDeckBounds(floorIndex: number): { minX: number; maxX: number; centerX: number; width: number } {
    const width = this.getDeckWidth(floorIndex);
    const centerX = this.scale.width / 2 + this.getDeckOffset(floorIndex);
    return {
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      centerX,
      width,
    };
  }


  private getFloorWidth(levelIndex: number): number {
    const width = this.scale.width;
    const widths = [
      width - 74,
      width - 96,
      width - 84,
      width - 96,
      width - 82,
      width - 72,
    ];
    return Math.max(190, widths[levelIndex % widths.length]);
  }

  private getFloorOffset(levelIndex: number): number {
    const offsets = [0, -6, 6, -5, 5, 0];
    return offsets[levelIndex % offsets.length];
  }

  private getFloorBounds(levelIndex: number): { minX: number; maxX: number; centerX: number; width: number } {
    const width = this.getFloorWidth(levelIndex);
    const centerX = this.scale.width / 2 + this.getFloorOffset(levelIndex);
    return {
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      centerX,
      width,
    };
  }


  private getCoreBounds(): { centerX: number; width: number; topY: number; bottomY: number } {
    return {
      centerX: 195,
      width: 74,
      topY: 320,
      bottomY: 742,
    };
  }

  private getSideMasses(): Array<{ centerX: number; width: number; topY: number; bottomY: number; alpha: number }> {
    return [
      { centerX: 102, width: 42, topY: 605, bottomY: 742, alpha: 0.24 },
      { centerX: 288, width: 42, topY: 468, bottomY: 605, alpha: 0.22 },
      { centerX: 118, width: 34, topY: 320, bottomY: 468, alpha: 0.18 },
    ];
  }

  private drawWorld(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('boss-ui-scene-bg')) {
      this.add.image(width / 2, height / 2, 'boss-ui-scene-bg')
        .setOrigin(0.5)
        .setDisplaySize(width, height)
        .setAlpha(0.28)
        .setDepth(-30);
    }

    this.add.rectangle(width / 2, height / 2, width - 12, height - 12, 0x0f0a07, 0.10)
      .setStrokeStyle(1, 0x6b4a2f, 0.32)
      .setDepth(-29);

    for (let i = 0; i < 8; i += 1) {
      const bx = 24 + i * 46;
      const bh = 40 + (i % 4) * 26;
      this.add.rectangle(bx, height - bh / 2, 28, bh, 0x1f2937, 0.28).setDepth(-28);
    }

    this.add.text(width / 2, 38, 'BARREL BEAT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffb347',
    }).setOrigin(0.5).setDepth(30);

    this.add.text(width / 2, 68, 'Climb ladders • dodge barrels • reach the beacon', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#f3e9dc',
    }).setOrigin(0.5).setDepth(30);

    const core = this.getCoreBounds();
    this.add.rectangle(core.centerX, (core.topY + core.bottomY) / 2, core.width, core.bottomY - core.topY + 70, 0x1b1815, 0.20)
      .setDepth(-8);

    this.add.rectangle(core.centerX, (core.topY + core.bottomY) / 2, 36, core.bottomY - core.topY + 54, 0x6a6f72, 0.14)
      .setDepth(-7);

    for (const mass of this.getSideMasses()) {
      this.add.rectangle(
        mass.centerX,
        (mass.topY + mass.bottomY) / 2,
        mass.width,
        mass.bottomY - mass.topY + 30,
        0x171411,
        mass.alpha,
      ).setDepth(-9);
    }

    const hasDeckSet =
      this.textures.exists('deck-left') &&
      this.textures.exists('deck-middle') &&
      this.textures.exists('deck-right');

    const hasFacadeSet =
      this.textures.exists('facade-platform-clean') &&
      this.textures.exists('facade-platform-cracked');

    for (let i = 0; i < PLATFORM_YS.length; i += 1) {
      const y = PLATFORM_YS[i];
      const bounds = getFloorBounds(this.stage, i, this.scale.width);

      if (hasDeckSet) {
        const sideWidth = i === PLATFORM_YS.length - 1 ? 112 : 104;
        const middleWidth = Math.max(176, bounds.width - sideWidth * 2 + 20);
        const deckCenterY = y + 18;
        const leftX = bounds.minX + sideWidth / 2;
        const rightX = bounds.maxX - sideWidth / 2;
        const middleKey = i === 2 && this.textures.exists('deck-cracked') ? 'deck-cracked' : 'deck-middle';

        this.add.image(bounds.centerX, deckCenterY, middleKey)
          .setOrigin(0.5)
          .setDisplaySize(middleWidth, i === 3 ? 126 : 118)
          .setDepth(3);

        this.add.image(leftX, deckCenterY, 'deck-left')
          .setOrigin(0.5)
          .setDisplaySize(sideWidth, i === 3 ? 130 : 122)
          .setDepth(4);

        this.add.image(rightX, deckCenterY, 'deck-right')
          .setOrigin(0.5)
          .setDisplaySize(sideWidth, i === 3 ? 130 : 122)
          .setDepth(4);
      } else if (hasFacadeSet) {
        const facadeKey = i === 2 ? 'facade-platform-cracked' : 'facade-platform-clean';
        this.add.image(bounds.centerX, y + 18, facadeKey)
          .setOrigin(0.5)
          .setDisplaySize(bounds.width + 24, i === 3 ? 126 : 118)
          .setDepth(3);
      } else {
        this.add.rectangle(bounds.centerX, y + 18, bounds.width, i === 3 ? 54 : 46, 0x7a4520).setDepth(3);
      }

      this.add.rectangle(bounds.centerX, y - 1, bounds.width - 10, 8, 0xe8ddba, 0.14).setDepth(5);
    }

    const crownY = 228;
    this.add.rectangle(195, crownY + 42, 238, 108, 0x181512, 0.18).setDepth(-10);
    this.add.rectangle(195, crownY + 8, 214, 18, 0xb98b4b, 0.10).setDepth(-9);

    const ladderLayer = drawLadderLayer(this);
    this.ladderHints = ladderLayer.hints;
    this.ladderMarkers = ladderLayer.markers;
  }

  private updateStartOverlay(): void {
    const startBest = document.getElementById('start-best');
    const startTarget = document.getElementById('start-target');
    const startHook = document.getElementById('start-hook');
    const startMeta = document.getElementById('start-meta');

    const bestValue = Math.max(this.best, this.score);
    const targetValue = Math.max(300, bestValue + 120);

    if (startBest) startBest.textContent = String(bestValue);
    if (startTarget) startTarget.textContent = String(targetValue);

    if (startHook) {
      startHook.textContent =
        bestValue < 300
          ? 'Reach 300. Unlock the chase.'
          : bestValue < 900
            ? 'Beat your best. Push into the next stage.'
            : 'This run matters. Hold the lead and send the challenge.';
    }

    if (startMeta) {
      startMeta.textContent =
        bestValue < 300
          ? 'Clear stage one. Learn the route. Build momentum.'
          : `Best ${bestValue}. Next target ${targetValue}.`;
    }
  }

  private showTransition(title: string, subtitle: string, duration = 620): void {
    const overlay = document.getElementById('transition-overlay');
    const titleNode = document.getElementById('transition-title');
    const subtitleNode = document.getElementById('transition-subtitle');

    if (titleNode) titleNode.textContent = title;
    if (subtitleNode) subtitleNode.textContent = subtitle;
    overlay?.classList.add('visible');

    this.time.delayedCall(duration, () => {
      overlay?.classList.remove('visible');
    });
  }

  private setupOverlayControls(): void {
    const startOverlay = document.getElementById('start-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const shareButton = document.getElementById('share-button');
    const gameoverCard = document.getElementById('gameover-card');

    startOverlay?.classList.remove('hidden');
    gameoverOverlay?.classList.add('hidden');

    const startHandler = (event: Event) => {
      event.preventDefault();
      this.beginRun();
    };

    const restartHandler = (event: Event) => {
      event.preventDefault();
      this.restartRun();
    };

    const shareHandler = async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      const challengeScore = Math.max(this.best, this.score);
      const shareText =
        this.score >= challengeScore
          ? `I just set a new Barrel Beat best: ${this.score}. Think you can beat it?`
          : `I scored ${this.score} on Barrel Beat and reached stage ${this.stage}. Beat my best: ${challengeScore}.`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'Barrel Beat',
            text: shareText,
            url: window.location.href,
          });
          this.feedback.showBanner('CHALLENGE SENT', 'Now beat it again', 720);
          this.sfx.share();
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
          this.feedback.showBanner('LINK COPIED', 'Challenge ready to send', 720);
          this.sfx.share();
          return;
        }

        this.feedback.showBanner('SHARE READY', shareText, 900);
        this.sfx.share();
      } catch {
        this.feedback.showBanner('SHARE CANCELLED', '', 520);
      }
    };

    startButton?.addEventListener('click', startHandler);
    restartButton?.addEventListener('click', restartHandler);
    gameoverCard?.addEventListener('click', restartHandler);
    shareButton?.addEventListener('click', shareHandler);

    this.domCleanup.push(() => startButton?.removeEventListener('click', startHandler));
    this.domCleanup.push(() => restartButton?.removeEventListener('click', restartHandler));
    this.domCleanup.push(() => gameoverCard?.removeEventListener('click', restartHandler));
    this.domCleanup.push(() => shareButton?.removeEventListener('click', shareHandler));
  }

  private restartRun(): void {
    this.snapToLadder = null;
    this.activeClimb = null;
    this.targetMoveX = null;
    this.moveMarker.setVisible(false);
    this.bossWarning.setVisible(false);
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    document.getElementById('start-overlay')?.classList.add('hidden');
    this.sfx.restart();
    this.scene.restart({
      stage: 1,
      score: 0,
      lives: 3,
      best: this.best,
      autoStart: false,
    });
  }

  private beginRun(): void {
    if (this.started) return;
    this.started = true;
    this.runStartedAt = this.time.now;
    this.invulnerableUntil = this.time.now + INITIAL_INVULNERABLE_MS;

    document.getElementById('start-overlay')?.classList.add('hidden');
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    document.getElementById('top-hint')?.classList.remove('hidden');
    this.time.delayedCall(2400, () => {
      document.getElementById('top-hint')?.classList.add('hidden');
    });

    this.showTransition(`STAGE ${this.stage}`, getStageLayoutName(this.stage), 700);
    this.cameras.main.flash(180, 255, 220, 160, true);
    this.sfx.unlock();
    this.sfx.start();
    this.music.start();
    this.feedback.showBanner(`STAGE ${this.stage}`, getStageLayoutName(this.stage), 1200);
  }

  private handleWorldTap(pointer: Phaser.Input.Pointer): void {
    if (this.gameOver) return;

    const target = pointer.event.target as HTMLElement | null;
    if (target?.closest('.overlay')) return;

    if (!this.started) {
      this.beginRun();
    }

    if (this.activeClimb || this.snapToLadder) return;

    const upLadder = findNearestLadder(pointer.x, this.currentLevelIndex, 'up', LADDER_TAP_RADIUS);
    const downLadder = findNearestLadder(pointer.x, this.currentLevelIndex, 'down', LADDER_TAP_RADIUS);

    if (upLadder || downLadder) {
      const chosen = upLadder ?? downLadder;
      if (!chosen) return;

      const direction = upLadder ? -1 : 1;
      const targetLevel = upLadder ? chosen.to : chosen.from;

      this.snapToLadder = {
        x: chosen.x,
        targetLevel,
        targetY: getPlayerYForLevel(targetLevel),
        direction,
      };

      this.targetMoveX = null;
      this.sfx.ladder();
      this.moveMarker.setPosition(chosen.x, getPlayerYForLevel(this.currentLevelIndex) + MOVE_MARKER_Y_OFFSET).setVisible(true);
      this.feedback.showBanner(direction === -1 ? 'LADDER UP' : 'LADDER DOWN', '', 260);
      return;
    }

    const floorBounds = getFloorBounds(this.stage, this.currentLevelIndex, this.scale.width);
    this.targetMoveX = Phaser.Math.Clamp(pointer.x, floorBounds.minX, floorBounds.maxX);
    this.sfx.move();
    this.moveMarker
      .setPosition(this.targetMoveX, getPlayerYForLevel(this.currentLevelIndex) + MOVE_MARKER_Y_OFFSET)
      .setVisible(true);
  }

  private spawnBarrelFromBoss(): void {
    if (this.gameOver || !this.started) return;
    if (this.time.now - this.runStartedAt < BARREL_OPENING_GRACE_MS) return;

    const warnX = this.boss.x + 10;
    const warnY = PLATFORM_YS[PLATFORM_YS.length - 1] - 18;

    this.sfx.warn();
    this.feedback.pulse(this.boss);
    this.bossWarning.setPosition(warnX, warnY).setVisible(true).setAlpha(1).setScale(0.8);

    this.tweens.add({
      targets: this.bossWarning,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: BOSS_WARNING_DURATION_MS,
      onComplete: () => {
        this.bossWarning.setVisible(false);
        if (!this.gameOver && this.started) {
          this.bossThrowPulseUntil = this.time.now + 220;
          this.sfx.throw();
          this.barrelSystem.spawnFromBoss(this.boss.x);
        }
      },
    });

    this.tweens.add({
      targets: this.boss,
      x: this.boss.x - 10,
      duration: 100,
      yoyo: true,
    });
  }

  private updateSnapToLadder(): void {
    if (!this.snapToLadder) return;

    this.player.x = Phaser.Math.Linear(this.player.x, this.snapToLadder.x, 0.48);
    this.moveMarker
      .setPosition(this.snapToLadder.x, getPlayerYForLevel(this.currentLevelIndex) + MOVE_MARKER_Y_OFFSET)
      .setVisible(true);

    if (Math.abs(this.player.x - this.snapToLadder.x) < 4) {
      this.player.x = this.snapToLadder.x;
      this.activeClimb = {
        x: this.snapToLadder.x,
        targetLevel: this.snapToLadder.targetLevel,
        targetY: this.snapToLadder.targetY,
        direction: this.snapToLadder.direction,
      };
      this.snapToLadder = null;
      this.moveMarker.setVisible(false);
      this.feedback.showBanner(
        this.activeClimb.direction === -1 ? 'CLIMB' : 'DOWN',
        '',
        320,
      );
    }
  }

  private updateClimb(): void {
    if (!this.activeClimb) return;

    this.player.x = Phaser.Math.Linear(this.player.x, this.activeClimb.x, 0.46);
    this.player.y += this.activeClimb.direction * 4.8;

    const reached =
      this.activeClimb.direction === -1
        ? this.player.y <= this.activeClimb.targetY
        : this.player.y >= this.activeClimb.targetY;

    if (reached) {
      this.player.y = this.activeClimb.targetY;
      this.currentLevelIndex = this.activeClimb.targetLevel;
      this.activeClimb = null;
      this.moveMarker.setVisible(false);
    }
  }

  private updateAutoMove(): void {
    if (this.targetMoveX === null) return;

    const delta = this.targetMoveX - this.player.x;
    if (Math.abs(delta) < 4) {
      this.player.x = this.targetMoveX;
      this.targetMoveX = null;
      this.moveMarker.setVisible(false);
      return;
    }

    this.player.x += Math.sign(delta) * HERO_AUTO_MOVE_SPEED;
  }

  private onBarrelHit(): void {
    if (this.gameOver || !this.started) return;
    if (this.time.now < this.invulnerableUntil) return;

    this.lives -= 1;
    this.livesText.setText(`LIVES ${this.lives}`);
    this.sfx.hit();
    this.feedback.flash(0xef4444, 0.22, 220);
    this.feedback.pulse(this.player);
    this.cameras.main.shake(150, 0.01);
    this.barrelSystem.clear();
    this.resetPlayerToBottom();
    this.invulnerableUntil = this.time.now + RESPAWN_INVULNERABLE_MS;

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.feedback.showBanner('HIT!', 'Short shield active', 720);
  }

  private onGoalReached(): void {
    if (!this.started || this.gameOver) return;
    if (this.currentLevelIndex !== PLATFORM_YS.length - 1) return;
    const topBounds = this.getFloorBounds(PLATFORM_YS.length - 1);
    if (this.player.x < topBounds.maxX - 52) return;

    this.stage += 1;
    this.score += 250;
    this.scoreText.setText(`SCORE ${this.score}`);
    this.sfx.goal();
    this.levelText.setText(`LEVEL ${this.stage}`);

    this.started = false;
    this.targetMoveX = null;
    this.activeClimb = null;
    this.snapToLadder = null;
    this.barrelSystem.clear();
    this.moveMarker.setVisible(false);
    this.bossWarning.setVisible(false);

    this.feedback.flash(0x38bdf8, 0.18, 260);
    this.feedback.showBanner(`STAGE ${this.stage}`, getStageLayoutName(this.stage), 900);
    this.showTransition(`STAGE ${this.stage}`, getStageLayoutName(this.stage), 760);

    this.time.delayedCall(760, () => {
      this.scene.restart({
        stage: this.stage,
        score: this.score,
        lives: this.lives,
        best: Math.max(this.best, this.score),
        autoStart: true,
      });
    });
  }

  private resetPlayerToBottom(): void {
    this.currentLevelIndex = 0;
    this.activeClimb = null;
    this.snapToLadder = null;
    this.targetMoveX = null;
    this.playerBody.setVelocity(0);
    const bottomBounds = getFloorBounds(this.stage, 0, this.scale.width);
    this.player.x = bottomBounds.minX + 24;
    this.player.y = getPlayerYForLevel(0);
    this.moveMarker.setScale(0.8);
    this.moveMarker.setVisible(false);
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    const isNewBest = this.score > this.best;

    if (isNewBest) {
      this.best = this.score;
      window.localStorage.setItem(HIGH_SCORE_KEY, String(this.best));
      this.bestText.setText(`BEST ${this.best}`);
    }

    const finalScore = document.getElementById('final-score');
    const finalStage = document.getElementById('final-stage');
    const bestScore = document.getElementById('best-score');
    const challengeCopy = document.getElementById('challenge-copy');
    const resultEyebrow = document.getElementById('result-eyebrow');
    const gameoverOverlay = document.getElementById('gameover-overlay');

    if (finalScore) finalScore.textContent = String(this.score);
    if (finalStage) finalStage.textContent = String(this.stage);
    if (bestScore) bestScore.textContent = String(this.best);

    if (resultEyebrow) {
      resultEyebrow.textContent = isNewBest ? 'New best' : 'Run complete';
    }

    if (challengeCopy) {
      challengeCopy.textContent = isNewBest
        ? `New best: ${this.score}. Send the challenge and see who beats it first.`
        : `You reached stage ${this.stage}. Challenge a friend to beat ${this.best}.`;
    }

    this.updateStartOverlay();
    this.feedback.flash(0xffffff, 0.14, 260);
    gameoverOverlay?.classList.remove('hidden');
    this.moveMarker.setVisible(false);
    this.bossWarning.setVisible(false);
    this.sfx.gameOver();
    this.music.stop();
  }

  update(): void {
    if (!this.goal) return;

    this.goal.setScale(1 + Math.sin(this.time.now / 180) * 0.04);

    if (this.gameOver || !this.started) return;

    updateLadderVisuals(this.player.x, this.ladderHints, this.ladderMarkers, LADDER_VISUAL_RADIUS);

    if (this.time.now < this.invulnerableUntil) {
      this.player.alpha = Math.floor(this.time.now / 80) % 2 === 0 ? 0.55 : 1;
    } else {
      this.player.alpha = 1;
    }

    if (this.activeClimb) {
      this.updateClimb();
    } else if (this.snapToLadder) {
      this.updateSnapToLadder();
    } else {
      this.player.y = getPlayerYForLevel(this.currentLevelIndex);
      this.updateAutoMove();
      const floorBounds = getFloorBounds(this.stage, this.currentLevelIndex, this.scale.width);
      this.player.x = Phaser.Math.Clamp(this.player.x, floorBounds.minX, floorBounds.maxX);
    }

    this.updateHeroAnimation();
    this.updateBossAnimation();
    this.barrelSystem.update(this.stage, this.scale.width);
    this.boss.y = PLATFORM_YS[PLATFORM_YS.length - 1] - 14 + Math.sin(this.time.now / 180) * 2;
  }
}
