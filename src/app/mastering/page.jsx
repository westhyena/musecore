import { useRef, useState } from "react";
import { Music, Wand2, Download, X, Settings } from "lucide-react";
import AppLayout from '@/components/layout/AppLayout';
import ContentPlaceholder from '@/components/layout/ContentPlaceholder';
import { useI18n } from '@/i18n/I18nContext';

export default function MasteringPage() {
  const { t, tArray } = useI18n();
  const [audioFiles, setAudioFiles] = useState([]);
  const [preset, setPreset] = useState("streaming");
  const [format, setFormat] = useState("wav");
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [isDropHover, setIsDropHover] = useState(false);
  const cancelRef = useRef(false);

  const disabled = !audioFiles.length || isProcessing;

  const onSelectAudios = (filesList) => {
    const files = Array.from(filesList || []);
    setAudioFiles(files);
    setJobs(
      files.map((f, idx) => ({
        id: `${f.name}-${f.lastModified}-${idx}`,
        file: f,
        progress: 0,
        status: "pending",
        url: "",
        filename: "",
      }))
    );
  };

  const formatPct = (p) => `${Math.round((p || 0) * 100)}%`;
  const baseName = (name) => {
    const idx = name.lastIndexOf('.');
    return idx === -1 ? name : name.slice(0, idx);
  };

  const startBatch = async () => {
    if (disabled) return;
    cancelRef.current = false;
    setIsProcessing(true);

    const maxConcurrency = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));

    try {
      const { createFFmpegInstance, masterAudioWith } = await import("./worker");
      const poolSize = Math.min(maxConcurrency, audioFiles.length);
      const pool = await Promise.all(
        new Array(poolSize).fill(0).map(() => createFFmpegInstance())
      );

      let nextIndex = 0;
      const runNext = async (workerIdx) => {
        if (cancelRef.current) return;
        const current = nextIndex++;
        if (current >= jobs.length) return;
        const job = jobs[current];

        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'running', progress: 0 } : j)));
        try {
          const { url, filename } = await masterAudioWith(pool[workerIdx], {
            audioFile: job.file,
            preset,
            outputFormat: format,
            onProgress: (p) => {
              setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: p } : j)));
            },
          });
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'done', url, filename } : j)));

          const a = document.createElement("a");
          a.href = url;
          a.download = filename || `${baseName(job.file.name)}.mastered.${format === 'wav' ? 'wav' : 'm4a'}`;
          a.click();
        } catch (err) {
          console.error(err);
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'error' } : j)));
        } finally {
          await runNext(workerIdx);
        }
      };

      await Promise.all(new Array(poolSize).fill(0).map((_, idx) => runNext(idx)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout title="MUSE CORE" rightSlot={<span>{t("mastering.rightSlot")}</span>}>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-light mb-3 text-white tracking-tight">{t("mastering.title")}</h2>
        <p className="text-[#9ca3af]">{t("mastering.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 daw-card p-6">
          {/* Rack-style file drop */}
          <div className="mb-6">
            <label className="block text-sm text-[#e5e5e5] mb-2">{t("mastering.audioFiles")}</label>
            <label
              onMouseEnter={() => setIsDropHover(true)}
              onMouseLeave={() => setIsDropHover(false)}
              className={`daw-glow-border flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-300 ${
                isDropHover
                  ? "border-[#007AFF]/60 bg-[#007AFF]/5"
                  : "border-white/20 bg-white/5 hover:bg-white/8"
              }`}
            >
              <Music className={`text-4xl transition-colors ${isDropHover ? "text-[#007AFF]" : "text-[#9ca3af]"}`} />
              <span className="text-sm text-[#9ca3af]">{t("mastering.audioLabel")}</span>
              {!!audioFiles.length && (
                <span className="text-xs text-[#39FF14]">{t("common.filesSelected", { count: audioFiles.length })}</span>
              )}
              <input
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={(e) => onSelectAudios(e.target.files)}
              />
            </label>
          </div>

          {/* Rack-style module controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-[#111]/50 border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-[#007AFF]" />
                <span className="text-sm font-medium text-[#e5e5e5]">{t("mastering.preset")}</span>
              </div>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/50"
              >
                <option value="streaming">{t("mastering.presetStreaming")}</option>
                <option value="loud">{t("mastering.presetLoud")}</option>
                <option value="podcast">{t("mastering.presetPodcast")}</option>
                <option value="studio">{t("mastering.presetStudio")}</option>
              </select>
            </div>

            <div className="rounded-xl bg-[#111]/50 border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
                <span className="text-sm font-medium text-[#e5e5e5]">{t("mastering.outputFormat")}</span>
              </div>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/50"
              >
                <option value="wav">{t("mastering.formatWav")}</option>
                <option value="m4a">{t("mastering.formatM4a")}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              disabled={disabled}
              onClick={startBatch}
              className={`daw-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Wand2 size={18} />
              {t("mastering.masterAll")}
            </button>

            <button
              disabled={!isProcessing}
              onClick={() => { cancelRef.current = true; }}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border border-white/20 bg-white/5 text-[#9ca3af] hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X size={18} />
              {t("common.cancel")}
            </button>
          </div>

          {!!jobs.length && (
            <div className="mt-8 space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="truncate text-[#e5e5e5]">{j.file.name}</div>
                    <div className="text-[#9ca3af]">
                      {j.status === 'pending' && t("mastering.statusPending")}
                      {j.status === 'running' && t("mastering.statusProcessing", { pct: formatPct(j.progress) })}
                      {j.status === 'done' && t("mastering.statusDone")}
                      {j.status === 'error' && t("mastering.statusError")}
                    </div>
                  </div>
                  <div className="mt-2 w-full h-2 bg-white/10 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${j.status === 'error' ? 'bg-[#ef4444]' : 'bg-[#007AFF]'}`}
                      style={{ width: j.status === 'done' ? '100%' : `${Math.round((j.progress || 0) * 100)}%` }}
                    />
                  </div>
                  {j.url && (
                    <div className="mt-2 text-xs">
                      <a href={j.url} download={j.filename || `${baseName(j.file.name)}.mastered.m4a`} className="text-[#007AFF] hover:text-[#39FF14] inline-flex items-center gap-1">
                        <Download size={14} /> {t("common.download")}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="daw-card p-6">
          <h3 className="text-lg text-[#e5e5e5] mb-4 font-medium">{t("common.guide")}</h3>
          <ul className="space-y-2 text-sm text-[#9ca3af] list-disc list-inside">
            {tArray("mastering.guideItems").map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <ContentPlaceholder title={t("mastering.contentTitle")} />
    </AppLayout>
  );
}
