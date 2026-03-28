export class FeedbackSystem {
  private flashRect: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;

    this.flashRect = scene.add
      .rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setDepth(40)
      .setVisible(false);

    this.titleText = scene.add
      .text(width / 2, height / 2 - 10, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '28px',
        color: '#ffcf7d',
        stroke: '#120d08',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setVisible(false);

    this.subtitleText = scene.add
      .text(width / 2, height / 2 + 22, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#f3e9dc',
        stroke: '#120d08',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setVisible(false);
  }

  flash(color: number, alpha = 0.18, duration = 180): void {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect
      .setFillStyle(color, 1)
      .setAlpha(alpha)
      .setVisible(true);

    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration,
      onComplete: () => this.flashRect.setVisible(false),
    });
  }

  showBanner(title: string, subtitle = '', duration = 800): void {
    this.scene.tweens.killTweensOf([this.titleText, this.subtitleText]);

    this.titleText.setText(title).setAlpha(1).setVisible(true);
    this.subtitleText.setText(subtitle).setAlpha(subtitle ? 1 : 0).setVisible(!!subtitle);

    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: [this.titleText, this.subtitleText],
        alpha: 0,
        duration: 180,
        onComplete: () => {
          this.titleText.setVisible(false);
          this.subtitleText.setVisible(false);
        },
      });
    });
  }

  pulse(target: Phaser.GameObjects.Container): void {
    this.scene.tweens.killTweensOf(target);
    this.scene.tweens.add({
      targets: target,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 90,
      yoyo: true,
    });
  }
}
