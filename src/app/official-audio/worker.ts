import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// We load core/wasm/worker via CDN to avoid bundler deep-import/export issues.

type GenerateArgs = {
  audioFile: File;
  imageFile: File;
  title?: string;
  artist?: string;
  quality?: 'fast' | 'balanced' | 'high';
  onProgress?: (p: number) => void;
};

type QualityProfile = {
  fps: number;
  height: number; // target max height
  preset: string;
  crf: string;
  audioBitrate: string;
};

const QUALITY_PRESETS: Record<NonNullable<GenerateArgs['quality']>, QualityProfile> = {
  fast: { fps: 2, height: 720, preset: 'ultrafast', crf: '26', audioBitrate: '160k' },
  balanced: { fps: 12, height: 1080, preset: 'veryfast', crf: '23', audioBitrate: '192k' },
  high: { fps: 24, height: 1080, preset: 'faster', crf: '20', audioBitrate: '224k' },
};

// Track per-instance progress handler for concurrent runs
const progressMap = new WeakMap<FFmpeg, (p: number) => void>();

let cachedCore: {
  canUseMt: boolean | null;
  coreURL?: string;
  wasmURL?: string;
  classWorkerURL?: string; // ffmpeg class worker
} = { canUseMt: null };

async function ensureCoreAssets(): Promise<{ coreURL: string; wasmURL: string; classWorkerURL: string }> {
  if (cachedCore.coreURL && cachedCore.wasmURL && cachedCore.classWorkerURL && cachedCore.canUseMt !== null) {
    return { coreURL: cachedCore.coreURL!, wasmURL: cachedCore.wasmURL!, classWorkerURL: cachedCore.classWorkerURL! };
  }
  const canUseMt = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  cachedCore.canUseMt = canUseMt;
  const corePkg = canUseMt ? '@ffmpeg/core-mt' : '@ffmpeg/core';
  const coreVersion = '0.12.10';
  const coreBase = `https://unpkg.com/${corePkg}@${coreVersion}/dist/esm`;
  const ffmpegBase = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm";

  cachedCore.coreURL = await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript");
  cachedCore.wasmURL = await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm");
  cachedCore.classWorkerURL = await toBlobURL(`${ffmpegBase}/worker.js`, "text/javascript");

  return { coreURL: cachedCore.coreURL, wasmURL: cachedCore.wasmURL, classWorkerURL: cachedCore.classWorkerURL };
}

export async function createFFmpegInstance(): Promise<FFmpeg> {
  const { coreURL, wasmURL, classWorkerURL } = await ensureCoreAssets();
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    const cb = progressMap.get(ffmpeg);
    if (typeof progress === 'number' && progress >= 0 && progress <= 1 && cb) cb(progress);
  });
  await ffmpeg.load({ coreURL, wasmURL, workerURL: classWorkerURL });
  return ffmpeg;
}

export async function generateOfficialAudioWith(ffmpeg: FFmpeg, { audioFile, imageFile, quality = 'fast', onProgress }: GenerateArgs): Promise<string> {
  if (!audioFile || !imageFile) throw new Error("오디오와 이미지를 모두 선택하세요.");
  const profile = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.fast;

  const audioName = `audio${getExtension(audioFile.name) || ".mp3"}`;
  const imageName = `cover${getExtension(imageFile.name) || ".png"}`;
  const outName = "output.mp4";

  // wire progress callback for this run
  if (onProgress) progressMap.set(ffmpeg, onProgress);

  await ffmpeg.writeFile(audioName, await fileToUint8Array(audioFile));
  await ffmpeg.writeFile(imageName, await fileToUint8Array(imageFile));

  const targetHeight = profile.height;
  const targetWidth = targetHeight === 720 ? 1280 : 1920;
  const filter = `scale=-2:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

  const args = [
    "-y",
    "-loop", "1",
    "-i", imageName,
    "-i", audioName,
    "-vf", filter,
    "-r", String(profile.fps),
    "-c:v", "libx264",
    "-preset", profile.preset,
    "-tune", "stillimage",
    "-crf", profile.crf,
    "-c:a", "aac",
    "-b:a", profile.audioBitrate,
    "-shortest",
    "-movflags", "+faststart",
    outName,
  ];

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outName);
  if (!data || (data as Uint8Array).length === 0) {
    throw new Error("FFmpeg 출력이 비어 있습니다. 콘솔 로그를 확인해주세요.");
  }
  const blob = new Blob([data], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  try {
    await ffmpeg.deleteFile(audioName);
    await ffmpeg.deleteFile(imageName);
    await ffmpeg.deleteFile(outName);
  } catch {}

  // clear handler after run
  if (onProgress) progressMap.delete(ffmpeg);

  return url;
}

export async function generateOfficialAudio({ audioFile, imageFile, title, artist, quality = 'fast', onProgress }: GenerateArgs): Promise<string> {
  const ffmpeg = await createFFmpegInstance();
  const url = await generateOfficialAudioWith(ffmpeg, { audioFile, imageFile, quality, onProgress });
  return url;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return "";
  return name.slice(idx);
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  return new Uint8Array(ab);
}
