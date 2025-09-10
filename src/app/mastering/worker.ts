import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { createFFmpegInstance } from "../official-audio/worker";

export type MasterPreset = "streaming" | "loud" | "podcast" | "studio";

type MasterArgs = {
  audioFile: File;
  preset?: MasterPreset;
  outputFormat?: 'wav' | 'm4a';
  onProgress?: (p: number) => void;
};

type PresetConfig = {
  description: string;
  targetI: number; // LUFS integrated
  targetLRA: number; // Loudness range
  truePeak: number; // dBTP max
  highpassHz: number;
  compressor: {
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
    kneeDb: number;
    makeupDb: number;
  };
  limiter: {
    limitLinear: number; // 1.0 == 0dBFS, 0.98 == -0.17dBFS approx
    attackMs: number;
    releaseMs: number;
  };
  output: {
    codec: "aac" | "pcm_s16le";
    bitrate?: string; // for AAC
    ext: ".m4a" | ".wav";
  };
};

export const PRESETS: Record<MasterPreset, PresetConfig> = {
  streaming: {
    description: "일반 스트리밍용 (-14 LUFS, -1dBTP)",
    targetI: -14,
    targetLRA: 11,
    truePeak: -1.0,
    highpassHz: 30,
    compressor: {
      thresholdDb: -18,
      ratio: 3,
      attackMs: 20,
      releaseMs: 250,
      kneeDb: 4,
      makeupDb: 4,
    },
    limiter: { limitLinear: 0.98, attackMs: 5, releaseMs: 50 },
    output: { codec: "aac", bitrate: "192k", ext: ".m4a" },
  },
  loud: {
    description: "더 큰 라우드니스 (-9 LUFS, -1dBTP)",
    targetI: -9,
    targetLRA: 7,
    truePeak: -1.0,
    highpassHz: 30,
    compressor: {
      thresholdDb: -22,
      ratio: 4,
      attackMs: 10,
      releaseMs: 200,
      kneeDb: 6,
      makeupDb: 6,
    },
    limiter: { limitLinear: 0.97, attackMs: 3, releaseMs: 40 },
    output: { codec: "aac", bitrate: "224k", ext: ".m4a" },
  },
  podcast: {
    description: "대사 중심 (-16 LUFS, -2dBTP)",
    targetI: -16,
    targetLRA: 8,
    truePeak: -2.0,
    highpassHz: 60,
    compressor: {
      thresholdDb: -20,
      ratio: 3,
      attackMs: 15,
      releaseMs: 200,
      kneeDb: 4,
      makeupDb: 3,
    },
    limiter: { limitLinear: 0.95, attackMs: 5, releaseMs: 60 },
    output: { codec: "aac", bitrate: "160k", ext: ".m4a" },
  },
  studio: {
    description: "무손실 WAV 출력 (후반작업용)",
    targetI: -15,
    targetLRA: 11,
    truePeak: -1.0,
    highpassHz: 25,
    compressor: {
      thresholdDb: -18,
      ratio: 2.5,
      attackMs: 25,
      releaseMs: 300,
      kneeDb: 3,
      makeupDb: 3,
    },
    limiter: { limitLinear: 0.98, attackMs: 5, releaseMs: 80 },
    output: { codec: "pcm_s16le", ext: ".wav" },
  },
};

const progressMap = new WeakMap<FFmpeg, (p: number) => void>();

export async function masterAudioWith(
  ffmpeg: FFmpeg,
  { audioFile, preset = "streaming", outputFormat, onProgress }: MasterArgs
): Promise<{ url: string; filename: string }>{
  if (!audioFile) throw new Error("오디오 파일을 선택하세요.");

  const baseCfg = PRESETS[preset];
  const effectiveOutput = resolveOutput(baseCfg, outputFormat);
  const inputName = `in${getExtension(audioFile.name) || ".wav"}`;
  const outName = `out${effectiveOutput.ext}`;

  // Attach ephemeral progress handlers
  let progressHandler: any | null = null;
  let logHandler: any | null = null;
  if (onProgress) {
    // Try native progress event first
    progressHandler = ({ progress }: any) => {
      if (typeof progress === 'number') onProgress(Math.max(0, Math.min(1, progress)));
    };
    try { (ffmpeg as any).on?.('progress', progressHandler); } catch {}

    // Fallback: parse time= from log lines
    logHandler = ({ message }: any) => {
      if (!message) return;
      const m = message.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (!m) return;
      // We cannot know duration without decoding metadata here; use a heuristic to keep UI alive
      // Prefer incremental smoothing toward completion when encoder nears end (not exact)
      // Users still get final 100% on completion.
      onProgress(0.5); // coarse mid-progress indicator
    };
    try { (ffmpeg as any).on?.('log', logHandler); } catch {}
  }

  // Hook progress via existing 'log' events (time=... parsing) if available
  // Consumers should already have attached listeners to ffmpeg instance via createFFmpegInstance.

  await ffmpeg.writeFile(inputName, await fileToUint8Array(audioFile));

  const filter = buildFilterChain(baseCfg);

  const args: string[] = [
    "-y",
    "-i", inputName,
    "-af", filter,
    "-c:a", effectiveOutput.codec,
    ...(effectiveOutput.codec === "aac" && (effectiveOutput.bitrate || baseCfg.output.bitrate)
      ? ["-b:a", effectiveOutput.bitrate || (baseCfg.output.bitrate as string)]
      : []),
    ...(effectiveOutput.ext === ".m4a" ? ["-movflags", "+faststart"] : []),
    outName,
  ];

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outName);
  if (!data || (data as Uint8Array).length === 0) {
    throw new Error("FFmpeg 출력이 비어 있습니다. 콘솔 로그를 확인해주세요.");
  }
  const mime = effectiveOutput.ext === ".wav" ? "audio/wav" : "audio/mp4";
  const blob = new Blob([data as Uint8Array], { type: mime });
  const url = URL.createObjectURL(blob);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outName);
  } catch {}

  // Detach handlers if supported
  if (onProgress) {
    try { (ffmpeg as any).off?.('progress', progressHandler); } catch {}
    try { (ffmpeg as any).off?.('log', logHandler); } catch {}
  }

  const base = baseName(audioFile.name);
  const filename = `${base}.mastered${effectiveOutput.ext}`;
  return { url, filename };
}

export { createFFmpegInstance };

function buildFilterChain(cfg: PresetConfig): string {
  const hp = `highpass=f=${Math.max(10, Math.min(200, cfg.highpassHz))}`;
  const comp = `acompressor=threshold=${cfg.compressor.thresholdDb}dB:ratio=${cfg.compressor.ratio}:attack=${cfg.compressor.attackMs}:release=${cfg.compressor.releaseMs}:knee=${cfg.compressor.kneeDb}:makeup=${cfg.compressor.makeupDb}`;
  const ln = `loudnorm=I=${cfg.targetI}:LRA=${cfg.targetLRA}:TP=${cfg.truePeak}:dual_mono=true:linear=true`;
  const lim = `alimiter=limit=${cfg.limiter.limitLinear}:attack=${cfg.limiter.attackMs}:release=${cfg.limiter.releaseMs}`;
  // Order: highpass -> compressor -> loudness normalize -> limiter
  return [hp, comp, ln, lim].join(",");
}

function resolveOutput(cfg: PresetConfig, override?: 'wav' | 'm4a'): PresetConfig['output'] & { bitrate?: string } {
  if (!override) return cfg.output;
  if (override === 'wav') {
    return { codec: 'pcm_s16le', ext: '.wav' };
  }
  if (override === 'm4a') {
    return { codec: 'aac', bitrate: cfg.output.bitrate || '192k', ext: '.m4a' };
  }
  return cfg.output;
}

function baseName(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? name : name.slice(0, idx);
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx === -1) return "";
  return name.slice(idx);
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  return new Uint8Array(ab);
}


