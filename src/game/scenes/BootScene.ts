import {
  EMPTY_ASSET_MANIFEST,
  normalizeAssetManifest,
  queueAssetManifest,
  type AssetManifest,
} from '../assets/assetManifest.js';
import { registerAnimationsFromManifest } from '../animations/registerAnimations.js';

const MANIFEST_KEY = 'asset-manifest';
const MANIFEST_URL = './assets/asset-manifest.json';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('boot');
  }

  preload(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#120d08');

    this.loadingText = this.add.text(width / 2, height / 2, 'Loading 0%', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ffcf7d',
    }).setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      this.loadingText.setText(`Loading ${Math.round(progress * 100)}%`);
    });

    this.load.json(MANIFEST_KEY, MANIFEST_URL);
  }

  create(): void {
    const raw = this.cache.json.get(MANIFEST_KEY) ?? EMPTY_ASSET_MANIFEST;
    const manifest: AssetManifest = normalizeAssetManifest(raw);

    const queued = queueAssetManifest(this.load, manifest);

    if (queued === 0) {
      this.loadingText.setText('Loading complete');
      this.time.delayedCall(120, () => {
        this.scene.start('play');
      });
      return;
    }

    this.load.off(Phaser.Loader.Events.PROGRESS);
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      this.loadingText.setText(`Assets ${Math.round(progress * 100)}%`);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerAnimationsFromManifest(this, manifest);
      this.loadingText.setText('Loading complete');
      this.time.delayedCall(120, () => {
        this.scene.start('play');
      });
    });

    this.load.start();
  }
}
