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

type BarrelState = {
  row: number;
  direction: -1 | 1;
  dropping: boolean;
  targetRow: number | null;
  targetY: number | null;
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

  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private goal!: Phaser.GameObjects.Container;
  private boss!: Phaser.GameObjects.Container;
  private barrels!: Phaser.Physics.Arcade.Group;
  private ladderHints: Phaser.GameObjects.Rectangle[] = [];

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

    this.player = this.createHero(42, this.getPlayerYForLevel(0));
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(22, 34);
    this.playerBody.setOffset(-11, -17);

    this.goal = this.createGoal(width - 42, this.platformYs[this.platformYs.length - 1] - 22);
    this.physics.add.existing(this.goal, true);

    this.boss = this.createBoss(width - 88, this.platformYs[this.platformYs.length - 1] - 8);

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
      delay: 1450,
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

  private createHero(x: number, y: number): Phaser.GameObjects.Container {
    const legL = this.add.rectangle(-5, 19, 4, 10, 0x60a5fa);
    const legR = this.add.rectangle(5, 19, 4, 10, 0x60a5fa);
    const armL = this.add.rectangle(-12, 5, 4, 10, 0xffdfb5);
    const armR = this.add.rectangle(12, 5, 4, 10, 0xffdfb5);
    const body = this.add.rectangle(0, 6, 18, 18, 0xff7b00);
    const head = this.add.circle(0, -10, 8, 0xffdfb5);
    const hat = this.add.rectangle(0, -17, 18, 5, 0xd62828);
    return this.add.container(x, y, [legL, legR, armL, armR, body, head, hat]);
  }

  private createGoal(x: number, y: number): Phaser.GameObjects.Container {
    const glow = this.add.circle(0, -8, 14, 0x38bdf8, 0.35);
    const beacon = this.add.rectangle(0, 0, 12, 32, 0x7dd3fc);
    const top = this.add.circle(0, -18, 8, 0xe0f2fe);
    return this.add.container(x, y, [glow, beacon, top]);
  }

  private createBoss(x: number, y: number): Phaser.GameObjects.Container {
    const body = this.add.ellipse(0, 0, 46, 34, 0x8b4513);
    const head = this.add.circle(-4, -22, 12, 0xb45309);
    const eyeL = this.add.circle(-8, -24, 2, 0xffffff);
    const eyeR = this.add.circle(0, -24, 2, 0xffffff);
    const arm = this.add.rectangle(18, -2, 20, 8, 0x8b4513);
    const barrel = this.add.circle(28, 2, 8, 0xd97706);
    return this.add.container(x, y, [body, head, eyeL, eyeR, arm, barrel]);
  }

  private createBarrel(x: number, y: number): Phaser.GameObjects.Container {
    const outer = this.add.circle(0, 0, 13, 0xd97706);
    const bandL = this.add.rectangle(-6, 0, 3, 22, 0x78350f);
    const bandR = this.add.rectangle(6, 0, 3, 22, 0x78350f);
    const middle = this.add.rectangle(0, 0, 4, 22, 0x92400e);
    return this.add.container(x, y, [outer, bandL, bandR, middle]);
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
      this.add.rectangle(width / 2, y, width - 28, 12, color).setOrigin(0.5);

      for (let x = 26; x < width - 20; x += 28) {
        this.add.rectangle(x, y - 4, 14, 2, 0x2b1607, 0.28).setOrigin(0.5);
      }
    }

    for (const ladder of this.ladders) {
      const yTop = this.platformYs[ladder.to];
      const yBottom = this.platformYs[ladder.from];
      const centerY = (yTop + yBottom) / 2;
      const ladderHeight = yBottom - yTop - 18;

      const hint = this.add.rectangle(ladder.x, centerY, 44, ladderHeight + 26, 0xfbbf24, 0.05).setOrigin(0.5);
      this.ladderHints.push(hint);

      this.add.rectangle(ladder.x, centerY, 10, ladderHeight, 0x94a3b8).setOrigin(0.5);

      for (let y = yTop + 16; y < yBottom - 12; y += 18) {
        this.add.rectangle(ladder.x, y, 26, 4, 0xcbd5e1).setOrigin(0.5);
      }
    }
  }

  private restartRun(): void {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.downPressed = false;
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
    this.messageText.setVisible(false);
    document.getElementById('start-overlay')?.classList.add('hidden');
    document.getElementById('gameover-overlay')?.classList.add('hidden');
    this.music.start();
  }

  private getPlayerYForLevel(levelIndex: number): number {
    return this.platformYs[levelIndex] - 24;
  }

  private directionForRow(row: number): -1 | 1 {
    return row % 2 === 0 ? -1 : 1;
  }

  private spawnBarrelFromBoss(): void {
    if (this.gameOver || !this.started) return;

    this.tweens.add({
      targets: this.boss,
      x: this.boss.x - 8,
      duration: 120,
      yoyo: true,
    });

    const topRow = this.platformYs.length - 1;
    const barrel = this.createBarrel(this.boss.x - 24, this.platformYs[topRow] - 18);

    this.physics.add.existing(barrel);
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

  private findNearestLadder(direction: 'up' | 'down'): LadderLink | null {
    const candidates = this.ladders.filter((ladder) =>
      direction === 'up'
        ? this.currentLevelIndex === ladder.from
        : this.currentLevelIndex === ladder.to,
    );

    if (candidates.length === 0) return null;

    let nearest: LadderLink | null = null;
    let nearestDistance = Infinity;

    for (const ladder of candidates) {
      const distance = Math.abs(this.player.x - ladder.x);
      if (distance < nearestDistance) {
        nearest = ladder;
        nearestDistance = distance;
      }
    }

    return nearestDistance <= 90 ? nearest : null;
  }

  private tryStartClimb(): void {
    if (this.activeClimb) return;

    const wantsUp = this.cursors.up?.isDown || this.upPressed;
    const wantsDown = this.cursors.down?.isDown || this.downPressed;

    if (wantsUp) {
      const ladder = this.findNearestLadder('up');
      if (ladder) {
        this.activeClimb = {
          x: ladder.x,
          targetLevel: ladder.to,
          targetY: this.getPlayerYForLevel(ladder.to),
          direction: -1,
        };
        this.showMessage('CLIMB');
        return;
      }
    }

    if (wantsDown) {
      const ladder = this.findNearestLadder('down');
      if (ladder) {
        this.activeClimb = {
          x: ladder.x,
          targetLevel: ladder.from,
          targetY: this.getPlayerYForLevel(ladder.from),
          direction: 1,
        };
        this.showMessage('DOWN');
      }
    }
  }

  private updateClimb(): void {
    if (!this.activeClimb) return;

    this.player.x = Phaser.Math.Linear(this.player.x, this.activeClimb.x, 0.34);
    this.player.y += this.activeClimb.direction * 3.6;

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

  private updateBarrels(): void {
    const barrels = this.barrels.getChildren() as Phaser.GameObjects.Container[];

    for (const barrel of barrels) {
      const state = barrel.getData('state') as BarrelState | undefined;
      if (!state) continue;

      barrel.rotation += 0.08 * state.direction;

      if (state.dropping && state.targetRow !== null && state.targetY !== null) {
        barrel.y += 4.2;

        if (barrel.y >= state.targetY) {
          barrel.y = state.targetY;
          state.row = state.targetRow;
          state.targetRow = null;
          state.targetY = null;
          state.dropping = false;
          state.direction = this.directionForRow(state.row);
          barrel.setData('state', state);
        }

        continue;
      }

      barrel.x += state.direction * (1.7 + this.stage * 0.18);

      const ladderBelow = this.ladders.find((ladder) => ladder.to === state.row);
      if (ladderBelow) {
        const crossed =
          (state.direction < 0 && barrel.x <= ladderBelow.x) ||
          (state.direction > 0 && barrel.x >= ladderBelow.x);

        if (crossed) {
          state.dropping = true;
          state.targetRow = ladderBelow.from;
          state.targetY = this.platformYs[ladderBelow.from] - 18;
          barrel.x = ladderBelow.x;
          barrel.setData('state', state);
          continue;
        }
      }

      if (barrel.x < -50 || barrel.x > this.scale.width + 50) {
        barrel.destroy();
      }
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

    this.showMessage('HIT!');
  }

  private onGoalReached(): void {
    if (!this.started || this.gameOver) return;
    if (this.currentLevelIndex !== this.platformYs.length - 1) return;
    if (this.player.x < this.scale.width - 82) return;

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
    this.playerBody.setVelocity(0);
    this.player.x = 42;
    this.player.y = this.getPlayerYForLevel(0);
  }

  private clearBarrels(): void {
    const children = this.barrels.getChildren() as Phaser.GameObjects.Container[];
    for (const barrel of children) {
      barrel.destroy();
    }
  }

  private showMessage(text: string): void {
    this.messageText.setText(text).setVisible(true);
    this.time.delayedCall(700, () => {
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

    const movingLeft = this.cursors.left?.isDown || this.leftPressed;
    const movingRight = this.cursors.right?.isDown || this.rightPressed;

    for (const hint of this.ladderHints) {
      hint.setAlpha(Math.abs(this.player.x - hint.x) < 90 ? 0.16 : 0.05);
    }

    if (this.activeClimb) {
      this.updateClimb();
    } else {
      this.player.y = this.getPlayerYForLevel(this.currentLevelIndex);

      if (movingLeft) {
        this.player.x -= 3.2;
      } else if (movingRight) {
        this.player.x += 3.2;
      }

      this.player.x = Phaser.Math.Clamp(this.player.x, 18, this.scale.width - 18);
      this.tryStartClimb();
    }

    this.updateBarrels();
    this.boss.y = this.platformYs[this.platformYs.length - 1] - 8 + Math.sin(this.time.now / 180) * 2;
  }
}
