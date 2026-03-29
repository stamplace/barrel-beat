export type ManifestImage = {
  key: string;
  url: string;
};

export type ManifestSpriteSheet = {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  startFrame?: number;
  endFrame?: number;
};

export type ManifestAtlas = {
  key: string;
  textureURL: string;
  atlasURL: string;
};

export type ManifestAudio = {
  key: string;
  urls: string[];
};

export type ManifestAnimation = {
  key: string;
  texture: string;
  frames?: Array<number | string>;
  start?: number;
  end?: number;
  frameRate?: number;
  repeat?: number;
  yoyo?: boolean;
};

export type AssetManifest = {
  images: ManifestImage[];
  spritesheets: ManifestSpriteSheet[];
  atlases: ManifestAtlas[];
  audio: ManifestAudio[];
  animations: ManifestAnimation[];
};

export const EMPTY_ASSET_MANIFEST: AssetManifest = {
  images: [],
  spritesheets: [],
  atlases: [],
  audio: [],
  animations: [],
};

export function normalizeAssetManifest(input: unknown): AssetManifest {
  const raw = (input ?? {}) as Partial<AssetManifest>;

  return {
    images: Array.isArray(raw.images) ? raw.images : [],
    spritesheets: Array.isArray(raw.spritesheets) ? raw.spritesheets : [],
    atlases: Array.isArray(raw.atlases) ? raw.atlases : [],
    audio: Array.isArray(raw.audio) ? raw.audio : [],
    animations: Array.isArray(raw.animations) ? raw.animations : [],
  };
}

export function queueAssetManifest(
  loader: Phaser.Loader.LoaderPlugin,
  manifest: AssetManifest,
): number {
  let count = 0;

  for (const image of manifest.images) {
    loader.image(image.key, image.url);
    count += 1;
  }

  for (const sheet of manifest.spritesheets) {
    loader.spritesheet(sheet.key, sheet.url, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
      startFrame: sheet.startFrame ?? 0,
      endFrame: sheet.endFrame ?? -1,
    });
    count += 1;
  }

  for (const atlas of manifest.atlases) {
    loader.atlas(atlas.key, atlas.textureURL, atlas.atlasURL);
    count += 1;
  }

  for (const audio of manifest.audio) {
    loader.audio(audio.key, audio.urls);
    count += 1;
  }

  return count;
}
