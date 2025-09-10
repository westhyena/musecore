import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// We load core/wasm/worker from same-origin /ffmpeg to avoid CORS.

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

// Track per-instance progress handler and duration for concurrent runs
const progressMap = new WeakMap<FFmpeg, (p: number) => void>();
const durationMap = new WeakMap<FFmpeg, number>();

function sameOriginConfig(mt: boolean) {
  const base = '/ffmpeg';
  if (mt) {
    return {
      coreURL: `${base}/core-mt/ffmpeg-core.js`,
      wasmURL: `${base}/core-mt/ffmpeg-core.wasm`,
      classWorkerURL: `${base}/worker.js`,
      workerURL: `${base}/core-mt/ffmpeg-core.worker.js`,
    } as const;
  }
  return {
    coreURL: `${base}/core/ffmpeg-core.js`,
    wasmURL: `${base}/core/ffmpeg-core.wasm`,
    classWorkerURL: `${base}/worker.js`,
  } as const;
}

async function loadWithTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function tryCreateFFmpeg(mt: boolean): Promise<FFmpeg> {
  const cfg = sameOriginConfig(mt);
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    const cb = progressMap.get(ffmpeg);
    if (typeof progress === 'number' && progress > 0 && progress <= 1 && cb) cb(progress);
  });
  ffmpeg.on('log', ({ message }) => {
    const cb = progressMap.get(ffmpeg);
    if (!cb) return;
    const dur = durationMap.get(ffmpeg);
    if (!dur || dur <= 0) return;
    if (message && message.includes('time=')) {
      const m = message.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (m) {
        const h = Number(m[1]);
        const mi = Number(m[2]);
        const s = Number(m[3]);
        const sec = h * 3600 + mi * 60 + s;
        const p = Math.max(0, Math.min(0.99, sec / dur));
        cb(p);
      }
    }
  });
  // @ts-ignore - workerURL used for MT, classWorkerURL used for class worker
  await loadWithTimeout(ffmpeg.load(cfg as any), mt ? 2500 : 8000, mt ? 'core-mt' : 'core');
  return ffmpeg;
}

export async function createFFmpegInstance(): Promise<FFmpeg> {
  // In prod/preview, default to single-thread to avoid intermittent pending; allow opt-in via env
  const allowMtFlag = (import.meta as any).env?.NEXT_PUBLIC_FFMPEG_MT;
  const allowMt = allowMtFlag ? String(allowMtFlag).toLowerCase() !== 'false' : (import.meta as any).env?.DEV;
  const canUseMt = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated && allowMt;
  const candidates: boolean[] = canUseMt ? [true, false] : [false];
  let lastError: unknown;
  for (const mt of candidates) {
    try {
      return await tryCreateFFmpeg(mt);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to init ffmpeg');
}

export async function generateOfficialAudioWith(ffmpeg: FFmpeg, { audioFile, imageFile, quality = 'fast', onProgress }: GenerateArgs): Promise<string> {
  if (!audioFile || !imageFile) throw new Error("오디오와 이미지를 모두 선택하세요.");
  const profile = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.fast;

  const audioName = `audio${getExtension(audioFile.name) || ".mp3"}`;
  const imageName = `cover.png`;
  const outName = "output.mp4";

  if (onProgress) progressMap.set(ffmpeg, onProgress);

  try {
    const dur = await getAudioDurationSec(audioFile);
    if (dur && isFinite(dur)) durationMap.set(ffmpeg, dur);
  } catch {}

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

  if (onProgress) progressMap.delete(ffmpeg);
  durationMap.delete(ffmpeg);

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
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetW, targetH);
    const w = (img as any).width;
    const h = (img as any).height;
    const scale = Math.min(targetW / w, targetH / h);
    const drawW = Math.round(w * scale);
    const drawH = Math.round(h * scale);
    const dx = Math.round((targetW - drawW) / 2);
    const dy = Math.round((targetH - drawH) / 2);
    // @ts-ignore
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

function getAudioDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const cleanup = () => { URL.revokeObjectURL(url); };
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        cleanup();
        resolve(dur && isFinite(dur) ? dur : 0);
      };
      audio.onerror = (e) => { cleanup(); resolve(0); };
      audio.src = url;
    } catch (e) {
      resolve(0);
    }
  });
}
