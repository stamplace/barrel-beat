import { MusicController } from '../../audio/music.js';

const HIGH_SCORE_KEY = 'barrel-beat-high-score';

type LadderLink = {
  x: number;
  from: number;
  to: number;
};

type ActiveClimb = {
  x: number;
  targetLevel: number;
  targetY: number;
  direction: -1 | 1;
};

export class PlayScene extends Phaser.Scene {
  private readonly platformYs = [760, 650, 540, 430, 320, 210, 100];
  private readonly ladders: LadderLink[] = [
    { x: 90, from: 0, to: 1 },
    { x: 300, from: 1, to: 2 },
    { x: 130, from: 2, to: 3 },
    { x: 285, from: 3, to: 4 },
    { x: 165, from: 4, to: 5 },
    { x: 305, from: 5, to: 6 },
  ];

  private player!: Phaser.GameObjects.Rectangle;
  private goal!: Phaser.GameObjects.Rectangle;
  private barrels!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private score = 0;
  private best = 0;
  private lives = 3;
  private stage = 1;
  private gameOver = false;
  private started = false;

  private currentLevelIndex = 0;
  private activeClimb: ActiveClimb | null = null;

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

    this.player = this.add.rectangle(42, this.getPlayerYForLevel(0), 26, 30, 0xffd166);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    playerBody.setCollideWorldBounds(true);

    this.goal = this.add.rectangle(width - 40, this.platformYs[this.platformYs.length - 1] - 24, 28, 42, 0x7dd3fc);
    this.physics.add.existing(this.goal, true);

    this.barrels = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

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

    this.messageText = this.add.text(width / 2, height / 2, 'CLIMB TO THE TOP', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      color: '#ffcf7d',
      align: 'center',
      backgroundColor: 'rgba(0,0,0,0.18)',
    }).setOrigin(0.5);

    this.physics.add.overlap(
      this.player,
      this.barrels,
      () => this.onBarrelHit(),
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.goal,
      () => this.onGoalReached(),
      undefined,
      this,
    );

    this.time.addEvent({
      delay: 1700,
      loop: true,
      callback: this.spawnBarrel,
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
      if (!this.gameOver && this.started && !this.activeClimb) {
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
    const { width } = this.scale;

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

    for (let i = 0; i < this.platformYs.length; i += 1) {
      const y = this.platformYs[i];
      const color = i % 2 === 0 ? 0x6b3f1d : 0x7a4520;
      this.add.rectangle(width / 2, y, width - 28, 10, color).setOrigin(0.5);
    }

    for (const ladder of this.ladders) {
      const yTop = this.platformYs[ladder.to];
      const yBottom = this.platformYs[ladder.from];
      const centerY = (yTop + yBottom) / 2;
      const ladderHeight = yBottom - yTop - 18;

      this.add.rectangle(ladder.x, centerY, 10, ladderHeight, 0x94a3b8).setOrigin(0.5);

      for (let y = yTop + 16; y < yBottom - 12; y += 18) {
        this.add.rectangle(ladder.x, y, 26, 4, 0xcbd5e1).setOrigin(0.5);
      }
    }

    this.add.circle(width - 40, this.platformYs[this.platformYs.length - 1] - 36, 12, 0x38bdf8);
    this.add.text(width - 40, this.platformYs[this.platformYs.length - 1] - 62, 'GOAL', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#bae6fd',
    }).setOrigin(0.5);
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

    bindHold('control-left', (value) => {
      this.leftPressed = value;
    }, true);

    bindHold('control-right', (value) => {
      this.rightPressed = value;
    }, true);

    bindHold('control-up', (value) => {
      this.upPressed = value;
    }, true);

    bindHold('control-down', (value) => {
      this.downPressed = value;
    }, true);

    const startOverlay = document.getElementById('start-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const shareButton = document.getElementById('share-button');

    startOverlay?.classList.remove('hidden');
    gameoverOverlay?.classList.add('hidden');

    const startHandler = (event: Event) => {
      event.preventDefault();
      this.beginRun();
    };

    const restartHandler = (event: Event) => {
      event.preventDefault();
      this.scene.restart();
    };

    const shareHandler = async (event: Event) => {
      event.preventDefault();
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
    shareButton?.addEventListener('click', shareHandler);

    this.domCleanup.push(() => startButton?.removeEventListener('click', startHandler));
    this.domCleanup.push(() => restartButton?.removeEventListener('click', restartHandler));
    this.domCleanup.push(() => shareButton?.removeEventListener('click', shareHandler));
  }

  private beginRun(): void {
    if (this.started) return;
    this.started = true;
    this.messageText.setVisible(false);
    document.getElementById('start-overlay')?.classList.add('hidden');
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    this.music.start();
  }

  private getPlayerYForLevel(levelIndex: number): number {
    return this.platformYs[levelIndex] - 20;
  }

  private spawnBarrel(): void {
    if (this.gameOver || !this.started) return;

    const row = Phaser.Math.Between(1, this.platformYs.length - 1);
    const fromLeft = row % 2 === 0;
    const barrel = this.add.circle(
      fromLeft ? -20 : this.scale.width + 20,
      this.platformYs[row] - 16,
      13,
      0xd97706,
    );

    this.physics.add.existing(barrel);
    const body = barrel.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX((fromLeft ? 1 : -1) * (130 + this.stage * 24));

    this.barrels.add(barrel);
  }

  private tryStartClimb(): void {
    if (this.activeClimb) return;

    const wantsUp = this.cursors.up?.isDown || this.upPressed;
    const wantsDown = this.cursors.down?.isDown || this.downPressed;

    for (const ladder of this.ladders) {
      const nearLadder = Math.abs(this.player.x - ladder.x) < 20;

      if (!nearLadder) continue;

      if (wantsUp && this.currentLevelIndex === ladder.from) {
        this.activeClimb = {
          x: ladder.x,
          targetLevel: ladder.to,
          targetY: this.getPlayerYForLevel(ladder.to),
          direction: -1,
        };
        return;
      }

      if (wantsDown && this.currentLevelIndex === ladder.to) {
        this.activeClimb = {
          x: ladder.x,
          targetLevel: ladder.from,
          targetY: this.getPlayerYForLevel(ladder.from),
          direction: 1,
        };
        return;
      }
    }
  }

  private updateClimb(): void {
    if (!this.activeClimb) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.player.x = this.activeClimb.x;
    body.setVelocityX(0);
    body.setVelocityY(this.activeClimb.direction * 180);

    const reached =
      this.activeClimb.direction === -1
        ? this.player.y <= this.activeClimb.targetY
        : this.player.y >= this.activeClimb.targetY;

    if (reached) {
      this.player.y = this.activeClimb.targetY;
      body.setVelocityY(0);
      this.currentLevelIndex = this.activeClimb.targetLevel;
      this.activeClimb = null;
    }
  }

  private onBarrelHit(): void {
    if (this.gameOver || !this.started) return;

    this.lives -= 1;
    this.livesText.setText(`LIVES ${this.lives}`);
    this.cameras.main.shake(150, 0.01);
    this.clearBarrels();
    this.resetPlayerToBottom();

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.showMessage('HIT! KEEP CLIMBING');
  }

  private onGoalReached(): void {
    if (!this.started || this.gameOver) return;
    if (this.currentLevelIndex !== this.platformYs.length - 1) return;
    if (this.player.x < this.scale.width - 72) return;

    this.stage += 1;
    this.score += 250;
    this.scoreText.setText(`SCORE ${this.score}`);
    this.levelText.setText(`LEVEL ${this.stage}`);
    this.clearBarrels();
    this.resetPlayerToBottom();
    this.showMessage(`LEVEL ${this.stage}`);
  }

  private resetPlayerToBottom(): void {
    this.currentLevelIndex = 0;
    this.activeClimb = null;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    this.player.x = 42;
    this.player.y = this.getPlayerYForLevel(0);
  }

  private clearBarrels(): void {
    const children = this.barrels.getChildren() as Phaser.GameObjects.Arc[];
    for (const barrel of children) {
      barrel.destroy();
    }
  }

  private showMessage(text: string): void {
    this.messageText.setText(text).setVisible(true);
    this.time.delayedCall(900, () => {
      if (!this.gameOver && this.started) {
        this.messageText.setVisible(false);
      }
    });
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

    this.messageText.setVisible(false);
    gameoverOverlay?.classList.remove('hidden');
    this.music.stop();
  }

  update(): void {
    if (this.gameOver || !this.started) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const movingLeft = this.cursors.left?.isDown || this.leftPressed;
    const movingRight = this.cursors.right?.isDown || this.rightPressed;

    if (this.activeClimb) {
      this.updateClimb();
    } else {
      body.setVelocityY(0);
      this.player.y = this.getPlayerYForLevel(this.currentLevelIndex);

      if (movingLeft) {
        body.setVelocityX(-220);
      } else if (movingRight) {
        body.setVelocityX(220);
      } else {
        body.setVelocityX(0);
      }

      this.tryStartClimb();
    }

    const children = this.barrels.getChildren() as Phaser.GameObjects.Arc[];
    for (const barrel of children) {
      if (barrel.x < -40 || barrel.x > this.scale.width + 40) {
        barrel.destroy();
      }
    }
  }
}
