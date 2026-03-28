export class MusicController {
  private started = false;
  private music: Howl | null = null;

  start(): void {
    if (this.started) return;
    this.started = true;

    try {
      this.music = new Howl({
        src: ['./assets/audio/theme.mp3'],
        loop: true,
        volume: 0.65,
        preload: true,
      });
      this.music.play();
    } catch {
      // no-op until a real track is added
    }
  }
}
