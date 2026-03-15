import { useCallback, useRef, useState } from "react";
import { Music2, Loader2, Shield } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ContentPlaceholder from "@/components/layout/ContentPlaceholder";
import { useI18n } from "@/i18n/I18nContext";

const ACCEPT_AUDIO = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac";

export default function AudioAnalyzerPage() {
  const { t, tArray } = useI18n();
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isHover, setIsHover] = useState(false);
  const workerRef = useRef(null);

  const decodeAndAnalyze = useCallback(async (audioFile) => {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const buffer = decoded;
    let channelData = buffer.getChannelData(0);
    let sampleRate = buffer.sampleRate;

    if (buffer.numberOfChannels > 1) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        channelData[i] = (left[i] + right[i]) / 2;
      }
    }

    const Worker = (await import("./analyzer.worker?worker")).default;
    const worker = new Worker();
    workerRef.current = worker;

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "progress") {
          setProgress(msg.progress);
          setStage(msg.stage);
        } else if (msg.type === "result") {
          setResult(msg);
          setProgress(1);
          resolve(msg);
        } else if (msg.type === "error") {
          setError(msg.error);
          reject(new Error(msg.error));
        }
      };
      worker.onerror = (e) => {
        setError(e.message || "Worker error");
        reject(e);
      };
      worker.postMessage(
        {
          type: "analyze",
          audioData: channelData,
          sampleRate,
        },
        [channelData.buffer]
      );
    });
  }, []);

  const onFileSelect = useCallback(
    async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setResult(null);
      setError(null);
      setIsAnalyzing(true);
      setProgress(0);
      setStage("");

      try {
        await decodeAndAnalyze(f);
      } catch (err) {
        console.error(err);
        setError(err?.message || String(err));
      } finally {
        setIsAnalyzing(false);
        workerRef.current?.terminate?.();
        workerRef.current = null;
      }
    },
    [decodeAndAnalyze]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer?.files?.[0];
      if (!f || !f.type.startsWith("audio/")) return;
      setFile(f);
      setResult(null);
      setError(null);
      setIsAnalyzing(true);
      setProgress(0);
      setStage("");
      decodeAndAnalyze(f)
        .catch((err) => {
          setError(err?.message || String(err));
        })
        .finally(() => {
          setIsAnalyzing(false);
          workerRef.current?.terminate?.();
          workerRef.current = null;
        });
    },
    [decodeAndAnalyze]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const formatKey = (key, scale) => {
    if (!key || key === "Unknown") return "—";
    return scale ? `${key} ${scale}` : key;
  };

  return (
    <AppLayout
      title="MUSE CORE"
      rightSlot={<span>{t("audioAnalyzer.rightSlot")}</span>}
    >
      <div className="text-center mb-10">
        <h2 className="text-4xl font-light mb-3 text-white tracking-tight">
          {t("audioAnalyzer.title")}
        </h2>
        <p className="text-[#9ca3af]">{t("audioAnalyzer.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 daw-card p-6 min-w-0 overflow-hidden">
          <label className="block text-sm text-[#e5e5e5] mb-2">
            {t("audioAnalyzer.audioFile")}
          </label>
          <label
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={`daw-glow-border flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-300 overflow-hidden min-w-0 ${
              isHover && !isAnalyzing
                ? "border-[#007AFF]/60 bg-[#007AFF]/5"
                : "border-white/20 bg-white/5 hover:bg-white/8"
            } ${isAnalyzing ? "pointer-events-none opacity-90" : ""}`}
          >
            <input
              type="file"
              accept={ACCEPT_AUDIO}
              className="hidden"
              onChange={onFileSelect}
              disabled={isAnalyzing}
            />
            {isAnalyzing ? (
              <>
                <Loader2
                  size={48}
                  className="text-[#007AFF] animate-spin"
                />
                <span className="text-sm text-[#9ca3af]">
                  {t("audioAnalyzer.analyzing")} ({stage})
                </span>
                <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#007AFF] transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <Music2
                  size={48}
                  className={`transition-colors ${
                    isHover ? "text-[#007AFF]" : "text-[#9ca3af]"
                  }`}
                />
                <span className="text-sm text-[#9ca3af]">
                  {t("audioAnalyzer.dropLabel")}
                </span>
                {file && (
                  <span className="text-xs text-[#39FF14] truncate min-w-0 max-w-full px-4 block w-full overflow-hidden text-center">
                    {file.name}
                  </span>
                )}
              </>
            )}
          </label>

          <p className="mt-3 text-xs text-[#9ca3af]">
            {t("audioAnalyzer.dragHint")}
          </p>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 p-6 rounded-xl bg-[#111]/50 border border-white/10">
              <h3 className="text-lg font-medium text-[#e5e5e5] mb-4">
                {t("audioAnalyzer.results")}
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">
                    {t("audioAnalyzer.bpm")}
                  </p>
                  <p className="text-3xl font-light text-white">
                    {result.bpm > 0 ? result.bpm : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">
                    {t("audioAnalyzer.key")}
                  </p>
                  <p className="text-3xl font-light text-white">
                    {formatKey(result.key, result.scale)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20">
              <Shield size={20} className="text-[#007AFF] flex-shrink-0" />
              <p className="text-sm text-[#9ca3af] text-left">
                {t("audioAnalyzer.privacyNotice")}
              </p>
            </div>
          )}
        </div>

        <div className="daw-card p-6">
          <h3 className="text-lg text-[#e5e5e5] mb-4 font-medium">
            {t("common.guide")}
          </h3>
          <ul className="space-y-2 text-sm text-[#9ca3af] list-disc list-inside">
            {tArray("audioAnalyzer.guideItems").map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <ContentPlaceholder title={t("audioAnalyzer.contentTitle")}>
        <div className="space-y-4">
          {tArray("audioAnalyzer.contentGuideItems").map((item, i) =>
            i % 2 === 1 ? (
              <h3
                key={i}
                className={`text-base font-semibold text-[#e5e5e5] mb-1 ${
                  i === 1 ? "mt-4" : "mt-6"
                }`}
              >
                {item}
              </h3>
            ) : (
              <p key={i} className="text-sm leading-relaxed text-[#9ca3af]">
                {item}
              </p>
            )
          )}
        </div>
      </ContentPlaceholder>
    </AppLayout>
  );
}
