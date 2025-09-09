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

let cached: {
  ffmpeg: FFmpeg | null;
  loaded: boolean;
  coreURL?: string;
  wasmURL?: string;
  workerURL?: string;
} = { ffmpeg: null, loaded: false };

async function getFFmpeg(): Promise<FFmpeg> {
  if (cached.ffmpeg && cached.loaded) return cached.ffmpeg;

  const ffmpeg = new FFmpeg();

  // Only log in dev to avoid perf hit
  // if (import.meta.env.DEV) {
  //   ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message));
  // }

  // Report progress
  ffmpeg.on('progress', ({ progress }) => {
    if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
      // Will be wired by caller per-exec via onProgress arg
      // We can't access onProgress here directly, so we store it in a global hook.
      latestProgress(progress);
    }
  });

  // Pin versions to package.json
  const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
  const ffmpegBase = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm";

  if (!cached.coreURL) cached.coreURL = await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript");
  if (!cached.wasmURL) cached.wasmURL = await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm");
  if (!cached.workerURL) cached.workerURL = await toBlobURL(`${ffmpegBase}/worker.js`, "text/javascript");

  await ffmpeg.load({
    coreURL: cached.coreURL,
    wasmURL: cached.wasmURL,
    workerURL: cached.workerURL,
  });

  cached.ffmpeg = ffmpeg;
  cached.loaded = true;
  return ffmpeg;
}

let latestProgress: (p: number) => void = () => {};

export async function generateOfficialAudio({ audioFile, imageFile, title, artist, quality = 'fast', onProgress }: GenerateArgs): Promise<string> {
  if (!audioFile || !imageFile) throw new Error("오디오와 이미지를 모두 선택하세요.");

  const profile = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.fast;
  const ffmpeg = await getFFmpeg();

  // Wire progress callback for current run
  latestProgress = (p: number) => {
    try { onProgress?.(p); } catch {}
  };

  const audioName = `audio${getExtension(audioFile.name) || ".mp3"}`;
  const imageName = `cover${getExtension(imageFile.name) || ".png"}`;
  const outName = "output.mp4";

  await ffmpeg.writeFile(audioName, await fileToUint8Array(audioFile));
  await ffmpeg.writeFile(imageName, await fileToUint8Array(imageFile));

  // Scale to target height, keep aspect, then pad to 1920xH (or 1280x720 for fast)
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

  // Cleanup virtual FS (optional)
  try {
    await ffmpeg.deleteFile(audioName);
    await ffmpeg.deleteFile(imageName);
    await ffmpeg.deleteFile(outName);
  } catch {}

  // Reset progress hook
  latestProgress = () => {};

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
