const THEME_ENABLED = false;
const THEME_PATH = './assets/audio/theme.mp3';

export class MusicController {
  private started = false;
  private music: Howl | null = null;

  start(): void {
    if (this.started || !THEME_ENABLED) return;
    this.started = true;

    try {
      this.music = new Howl({
        src: [THEME_PATH],
        loop: true,
        volume: 0.65,
        preload: true,
      });

      this.music.play();
    } catch {
      this.started = false;
    }
  }

  stop(): void {
    this.music?.stop();
  }
}
