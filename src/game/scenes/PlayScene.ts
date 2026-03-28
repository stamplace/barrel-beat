import { MusicController } from '../../audio/music.js';
import { createBoss, createGoal, createHero } from '../entities/HeroFactory.js';
import { PLATFORM_YS, getPlayerYForLevel } from '../level/LevelModel.js';
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

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
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
  private lastLadderHintAt = 0;

  private leftPressed = false;
  private rightPressed = false;
  private upPressed = false;
  private downPressed = false;
  private domCleanup: Array<() => void> = [];

  private music = new MusicController();

  constructor() {
    super('play');
  }

  create(): void {
    const { width, height } = this.scale;
    this.best = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0');

    this.cameras.main.setBackgroundColor('#120d08');
    this.drawWorld();

    this.player = createHero(this, 42, getPlayerYForLevel(0));
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(22, 34);
    this.playerBody.setOffset(-11, -17);

    this.goal = createGoal(this, width - 42, PLATFORM_YS[PLATFORM_YS.length - 1] - 22);
    this.physics.add.existing(this.goal, true);

    this.boss = createBoss(this, width - 88, PLATFORM_YS[PLATFORM_YS.length - 1] - 8);

    this.barrels = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.barrelSystem = new BarrelSystem(this, this.barrels);
    this.feedback = new FeedbackSystem(this);

    this.cursors = this.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;

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

    this.levelText = this.add.text(width - 16, 40, 'LEVEL 1', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#ffd7a3',
    }).setOrigin(1, 0);

    this.physics.add.overlap(this.player, this.barrels, () => this.onBarrelHit(), undefined, this);
    this.physics.add.overlap(this.player, this.goal, () => this.onGoalReached(), undefined, this);

    this.time.addEvent({
      delay: 1360,
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

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameOver && this.started && !this.activeClimb && !this.snapToLadder) {
        this.player.x = Phaser.Math.Clamp(pointer.x, 18, width - 18);
      }
    });

    this.setupDomControls();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const cleanup of this.domCleanup) cleanup();
      this.domCleanup = [];
    });
  }

  private drawWorld(): void {
    const { width, height } = this.scale;

    for (let i = 0; i < 8; i += 1) {
      const bx = 24 + i * 46;
      const bh = 40 + (i % 4) * 26;
      this.add.rectangle(bx, height - bh / 2, 28, bh, 0x1f2937, 0.34);
    }

    this.add.text(width / 2, 38, 'BARREL BEAT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffb347',
    }).setOrigin(0.5);

    this.add.text(width / 2, 68, 'Climb ladders • dodge barrels • reach the beacon', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#f3e9dc',
    }).setOrigin(0.5);

    for (let i = 0; i < PLATFORM_YS.length; i += 1) {
      const y = PLATFORM_YS[i];
      const color = i % 2 === 0 ? 0x6b3f1d : 0x7a4520;
      this.add.rectangle(width / 2, y, width - 28, 12, color).setOrigin(0.5);

      for (let x = 26; x < width - 20; x += 28) {
        this.add.rectangle(x, y - 4, 14, 2, 0x2b1607, 0.28).setOrigin(0.5);
      }
    }

    const ladderLayer = drawLadderLayer(this);
    this.ladderHints = ladderLayer.hints;
    this.ladderMarkers = ladderLayer.markers;
  }

  private restartRun(): void {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.downPressed = false;
    this.snapToLadder = null;
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    document.getElementById('start-overlay')?.classList.add('hidden');
    this.scene.restart();
  }

  private setupDomControls(): void {
    const bindHold = (
      id: string,
      onChange: (value: boolean) => void,
      startRun = false,
    ): void => {
      const element = document.getElementById(id);
      if (!element) return;

      const press = (event: Event) => {
        event.preventDefault();
        onChange(true);
        if (startRun && !this.started && !this.gameOver) {
          this.beginRun();
        }
      };

      const release = (event: Event) => {
        event.preventDefault();
        onChange(false);
      };

      element.addEventListener('pointerdown', press);
      element.addEventListener('pointerup', release);
      element.addEventListener('pointercancel', release);
      element.addEventListener('pointerleave', release);
      element.addEventListener('touchstart', press, { passive: false });
      element.addEventListener('touchend', release, { passive: false });

      this.domCleanup.push(() => {
        element.removeEventListener('pointerdown', press);
        element.removeEventListener('pointerup', release);
        element.removeEventListener('pointercancel', release);
        element.removeEventListener('pointerleave', release);
        element.removeEventListener('touchstart', press);
        element.removeEventListener('touchend', release);
      });
    };

    bindHold('control-left', (value) => { this.leftPressed = value; }, true);
    bindHold('control-right', (value) => { this.rightPressed = value; }, true);
    bindHold('control-up', (value) => { this.upPressed = value; }, true);
    bindHold('control-down', (value) => { this.downPressed = value; }, true);

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

      const text = `I reached score ${this.score} on Barrel Beat, level ${this.stage}.`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'Barrel Beat',
            text,
            url: window.location.href,
          });
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        }
      } catch {
        // no-op
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

  private beginRun(): void {
    if (this.started) return;
    this.started = true;
    document.getElementById('start-overlay')?.classList.add('hidden');
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    this.music.start();
    this.feedback.showBanner(`STAGE ${this.stage}`, 'Reach the beacon', 1000);
  }

  private spawnBarrelFromBoss(): void {
    if (this.gameOver || !this.started) return;

    this.feedback.pulse(this.boss);

    this.tweens.add({
      targets: this.boss,
      x: this.boss.x - 10,
      duration: 100,
      yoyo: true,
    });

    this.barrelSystem.spawnFromBoss(this.boss.x);
  }

  private tryStartClimb(): void {
    if (this.activeClimb || this.snapToLadder) return;

    const wantsUp = this.cursors.up?.isDown || this.upPressed;
    const wantsDown = this.cursors.down?.isDown || this.downPressed;

    if (!wantsUp && !wantsDown) return;

    const direction: 'up' | 'down' = wantsUp ? 'up' : 'down';
    const ladder = findNearestLadder(this.player.x, this.currentLevelIndex, direction, 170);

    if (!ladder) {
      if (this.time.now - this.lastLadderHintAt > 650) {
        this.feedback.showBanner('MOVE TO ⇅', 'Stand near a ladder', 520);
        this.lastLadderHintAt = this.time.now;
      }
      return;
    }

    this.snapToLadder = {
      x: ladder.x,
      targetLevel: direction === 'up' ? ladder.to : ladder.from,
      targetY: getPlayerYForLevel(direction === 'up' ? ladder.to : ladder.from),
      direction: direction === 'up' ? -1 : 1,
    };
  }

  private updateSnapToLadder(): void {
    if (!this.snapToLadder) return;

    this.player.x = Phaser.Math.Linear(this.player.x, this.snapToLadder.x, 0.48);

    if (Math.abs(this.player.x - this.snapToLadder.x) < 4) {
      this.player.x = this.snapToLadder.x;
      this.activeClimb = {
        x: this.snapToLadder.x,
        targetLevel: this.snapToLadder.targetLevel,
        targetY: this.snapToLadder.targetY,
        direction: this.snapToLadder.direction,
      };
      this.snapToLadder = null;
      this.feedback.showBanner(
        this.activeClimb.direction === -1 ? 'CLIMB' : 'DOWN',
        '',
        380,
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
    }
  }

  private onBarrelHit(): void {
    if (this.gameOver || !this.started) return;

    this.lives -= 1;
    this.livesText.setText(`LIVES ${this.lives}`);
    this.feedback.flash(0xef4444, 0.22, 220);
    this.feedback.pulse(this.player);
    this.cameras.main.shake(150, 0.01);
    this.barrelSystem.clear();
    this.resetPlayerToBottom();

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.feedback.showBanner('HIT!', 'Back to the bottom', 720);
  }

  private onGoalReached(): void {
    if (!this.started || this.gameOver) return;
    if (this.currentLevelIndex !== PLATFORM_YS.length - 1) return;
    if (this.player.x < this.scale.width - 82) return;

    this.stage += 1;
    this.score += 250;
    this.scoreText.setText(`SCORE ${this.score}`);
    this.levelText.setText(`LEVEL ${this.stage}`);
    this.barrelSystem.clear();
    this.resetPlayerToBottom();
    this.feedback.flash(0x38bdf8, 0.18, 260);
    this.feedback.showBanner(`LEVEL ${this.stage}`, 'Faster barrels', 900);
  }

  private resetPlayerToBottom(): void {
    this.currentLevelIndex = 0;
    this.activeClimb = null;
    this.snapToLadder = null;
    this.playerBody.setVelocity(0);
    this.player.x = 42;
    this.player.y = getPlayerYForLevel(0);
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    if (this.score > this.best) {
      this.best = this.score;
      window.localStorage.setItem(HIGH_SCORE_KEY, String(this.best));
      this.bestText.setText(`BEST ${this.best}`);
    }

    const finalScore = document.getElementById('final-score');
    const bestScore = document.getElementById('best-score');
    const gameoverOverlay = document.getElementById('gameover-overlay');

    if (finalScore) finalScore.textContent = String(this.score);
    if (bestScore) bestScore.textContent = String(this.best);

    this.feedback.flash(0xffffff, 0.14, 260);
    gameoverOverlay?.classList.remove('hidden');
    this.music.stop();
  }

  update(): void {
    if (this.gameOver || !this.started) return;

    const movingLeft = this.cursors.left?.isDown || this.leftPressed;
    const movingRight = this.cursors.right?.isDown || this.rightPressed;
    const wantsVertical =
      this.cursors.up?.isDown || this.upPressed || this.cursors.down?.isDown || this.downPressed;

    updateLadderVisuals(this.player.x, this.ladderHints, this.ladderMarkers, 170);

    if (this.activeClimb) {
      this.updateClimb();
    } else if (this.snapToLadder) {
      this.updateSnapToLadder();
    } else {
      this.player.y = getPlayerYForLevel(this.currentLevelIndex);

      if (!wantsVertical) {
        if (movingLeft) {
          this.player.x -= 3.6;
        } else if (movingRight) {
          this.player.x += 3.6;
        }
      }

      this.player.x = Phaser.Math.Clamp(this.player.x, 18, this.scale.width - 18);
      this.tryStartClimb();
    }

    this.barrelSystem.update(this.stage, this.scale.width);
    this.boss.y = PLATFORM_YS[PLATFORM_YS.length - 1] - 8 + Math.sin(this.time.now / 180) * 2;
  }
}
