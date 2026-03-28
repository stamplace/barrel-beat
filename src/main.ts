import { BootScene } from './game/scenes/BootScene.js';
import { PlayScene } from './game/scenes/PlayScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 390,
  height: 844,
  backgroundColor: '#120d08',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, PlayScene],
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
