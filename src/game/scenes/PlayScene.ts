import { MusicController } from '../../audio/music.js';

const HIGH_SCORE_KEY = 'barrel-beat-high-score';

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private barrels!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private centerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private score = 0;
  private best = 0;
  private gameOver = false;
  private started = false;
  private music = new MusicController();

  private leftPressed = false;
  private rightPressed = false;
  private domCleanup: Array<() => void> = [];

  constructor() {
    super('play');
  }

  create(): void {
    const { width, height } = this.scale;
    this.best = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0');

    this.cameras.main.setBackgroundColor('#120d08');

    this.add.text(width / 2, 42, 'BARREL BEAT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffb347',
    }).setOrigin(0.5);

    this.add.text(width / 2, 72, 'Retro survival runner', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#f3e9dc',
    }).setOrigin(0.5);

    const lanes = [160, 270, 380, 490, 600, 710];
    for (const y of lanes) {
      this.add.rectangle(width / 2, y, width - 32, 10, 0x6b3f1d).setOrigin(0.5);
    }

    this.player = this.add.rectangle(width / 2, height - 96, 34, 34, 0xffd166);
    this.physics.add.existing(this.player);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);
    playerBody.setAllowGravity(false);

    this.barrels = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.cursors = this.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;

    this.scoreText = this.add.text(18, 18, 'SCORE 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.bestText = this.add.text(width - 18, 18, `BEST ${this.best}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(1, 0);

    this.centerText = this.add.text(width / 2, height / 2 - 30, 'TAP TO START', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '30px',
      color: '#ffb347',
      align: 'center',
    }).setOrigin(0.5);

    this.hintText = this.add.text(
      width / 2,
      height / 2 + 36,
      'Move left/right • survive as long as possible',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#f3e9dc',
        align: 'center',
      },
    ).setOrigin(0.5);

    this.physics.add.overlap(
      this.player,
      this.barrels,
      () => this.endGame(),
      undefined,
      this,
    );

    this.input.once('pointerdown', () => {
      this.beginRun();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameOver && this.started) {
        this.player.x = Phaser.Math.Clamp(pointer.x, 18, width - 18);
      }
    });

    this.time.addEvent({
      delay: 850,
      loop: true,
      callback: this.spawnBarrel,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        if (this.gameOver || !this.started) return;
        this.score += 1;
        this.scoreText.setText(`SCORE ${this.score}`);
      },
    });

    this.setupDomControls();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const cleanup of this.domCleanup) cleanup();
      this.domCleanup = [];
    });
  }

  private beginRun(): void {
    if (this.started) return;
    this.started = true;
    this.centerText.setVisible(false);
    this.hintText.setVisible(false);
    this.music.start();
  }

  private setupDomControls(): void {
    const leftButton = document.getElementById('control-left');
    const rightButton = document.getElementById('control-right');

    const bindHold = (
      element: HTMLElement | null,
      onChange: (value: boolean) => void,
    ): void => {
      if (!element) return;

      const press = (event: Event) => {
        event.preventDefault();
        onChange(true);
        if (!this.started && !this.gameOver) {
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

    bindHold(leftButton, (value) => {
      this.leftPressed = value;
    });

    bindHold(rightButton, (value) => {
      this.rightPressed = value;
    });
  }

  private spawnBarrel(): void {
    if (this.gameOver || !this.started) return;

    const lanes = [160, 270, 380, 490, 600, 710];
    const laneY = Phaser.Utils.Array.GetRandom(lanes);
    const fromLeft = Math.random() > 0.5;

    const barrel = this.add.circle(
      fromLeft ? -20 : this.scale.width + 20,
      laneY,
      15,
      0xd97706,
    );

    this.physics.add.existing(barrel);
    const body = barrel.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX((fromLeft ? 1 : -1) * (220 + Math.min(this.score * 2, 260)));

    this.barrels.add(barrel);
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    if (this.score > this.best) {
      this.best = this.score;
      window.localStorage.setItem(HIGH_SCORE_KEY, String(this.best));
      this.bestText.setText(`BEST ${this.best}`);
    }

    this.cameras.main.shake(180, 0.01);

    this.centerText
      .setText(`GAME OVER\nSCORE ${this.score}\nBEST ${this.best}`)
      .setVisible(true);

    this.hintText
      .setText('Tap anywhere to restart')
      .setVisible(true);

    this.input.once('pointerdown', () => {
      this.scene.restart();
    });
  }

  update(): void {
    if (this.gameOver || !this.started) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (this.cursors.left?.isDown || this.leftPressed) {
      body.setVelocityX(-300);
    } else if (this.cursors.right?.isDown || this.rightPressed) {
      body.setVelocityX(300);
    }

    const children = this.barrels.getChildren() as Phaser.GameObjects.Arc[];
    for (const barrel of children) {
      if (barrel.x < -40 || barrel.x > this.scale.width + 40) {
        barrel.destroy();
      }
    }
  }
}
