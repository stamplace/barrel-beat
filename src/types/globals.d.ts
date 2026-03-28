/// <reference types="phaser" />

declare const Phaser: typeof import('phaser');

declare class Howl {
  constructor(options: {
    src: string[];
    loop?: boolean;
    volume?: number;
    preload?: boolean;
    onload?: () => void;
    onloaderror?: (id: number, err: unknown) => void;
  });
  play(spriteOrId?: string | number): number;
  stop(id?: number): void;
  unload(): void;
}
