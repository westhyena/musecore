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
  width: number;
  height: number; // target size (we precompose to this)
  preset: string;
  crf: string;
  audioBitrate: string;
};

const QUALITY_PRESETS: Record<NonNullable<GenerateArgs['quality']>, QualityProfile> = {
  fast: { fps: 1, width: 1280, height: 720, preset: 'ultrafast', crf: '26', audioBitrate: '160k' },
  balanced: { fps: 8, width: 1920, height: 1080, preset: 'veryfast', crf: '23', audioBitrate: '192k' },
  high: { fps: 24, width: 1920, height: 1080, preset: 'faster', crf: '20', audioBitrate: '224k' },
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
  const imageName = `cover.png`;
  const outName = "output.mp4";

  // wire progress callback for this run
  if (onProgress) progressMap.set(ffmpeg, onProgress);

  // Precompose image to target canvas (letterbox) to avoid heavy FFmpeg scaling
  const composed = await precomposeCover(imageFile, profile.width, profile.height);
  await ffmpeg.writeFile(imageName, composed);

  await ffmpeg.writeFile(audioName, await fileToUint8Array(audioFile));

  const audioCopy = isAacLike(audioFile.name, audioFile.type);

  const args = [
    "-y",
    "-loop", "1",
    "-framerate", String(profile.fps),
    "-i", imageName,
    "-i", audioName,
    // No scaling: already composed to target size; ensure yuv420p for compatibility
    "-vf", "format=yuv420p",
    "-c:v", "libx264",
    "-preset", profile.preset,
    "-tune", "stillimage",
    "-crf", profile.crf,
    ...(audioCopy ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", profile.audioBitrate]),
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

function isAacLike(name: string, mime?: string): boolean {
  const lower = name.toLowerCase();
  if (mime && /aac|mp4|m4a/.test(mime)) return true;
  return lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.endsWith('.mp4');
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  return new Uint8Array(ab);
}

async function precomposeCover(file: File, targetW: number, targetH: number): Promise<Uint8Array> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const { canvas, ctx } = createCanvas(targetW, targetH);
    // fill background (letterbox color)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetW, targetH);
    // fit image into target with aspect ratio
    const scale = Math.min(targetW / (img as any).width, targetH / (img as any).height);
    const drawW = Math.round((img as any).width * scale);
    const drawH = Math.round((img as any).height * scale);
    const dx = Math.round((targetW - drawW) / 2);
    const dy = Math.round((targetH - drawH) / 2);
    // drawImage for ImageBitmap or HTMLImageElement
    // @ts-ignore - TS can't infer overloaded drawImage types with union here
    ctx.drawImage(img as any, dx, dy, drawW, drawH);

    const blob = await canvasToBlob(canvas, 'image/png');
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    return { canvas, ctx } as any;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return { canvas, ctx } as any;
}

function loadImage(url: string): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap !== 'undefined') {
    return fetch(url).then(r => r.blob()).then(b => createImageBitmap(b));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string): Promise<Blob> {
  if (typeof (canvas as any).convertToBlob === 'function') {
    return (canvas as any).convertToBlob({ type });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), type);
  });
}
