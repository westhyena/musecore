import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Image as ImageIcon, Wand2, Video, Download, X } from "lucide-react";
import AppLayout from '@/components/layout/AppLayout';
import ContentPlaceholder from '@/components/layout/ContentPlaceholder';
import { useI18n } from '@/i18n/I18nContext';

export default function OfficialAudioPage() {
  const { t, tArray } = useI18n();
  const [audioFiles, setAudioFiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [quality, setQuality] = useState("fast");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [isAudioHover, setIsAudioHover] = useState(false);
  const [isImageHover, setIsImageHover] = useState(false);
  const cancelRef = useRef(false);

  const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const disabled = !imageFile || !audioFiles.length || isGenerating;

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
    setIsGenerating(true);

    const maxConcurrency = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));

    try {
      const { createFFmpegInstance, generateOfficialAudioWith } = await import("./worker");

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
          const url = await generateOfficialAudioWith(pool[workerIdx], {
            audioFile: job.file,
            imageFile,
            quality,
            onProgress: (p) => {
              setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: p } : j)));
            },
          });
          const filename = `${baseName(job.file.name)}.mp4`;
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'done', url } : j)));
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
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
      setIsGenerating(false);
    }
  };

  const cancelBatch = () => {
    cancelRef.current = true;
  };

  const DropZone = ({ onSelect, accept, multiple, label, icon: Icon, isHover, setIsHover, hasFiles, fileCount }) => (
    <label
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={`daw-glow-border flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-300 ${
        isHover
          ? "border-[#007AFF]/60 bg-[#007AFF]/5"
          : "border-white/20 bg-white/5 hover:bg-white/8"
      }`}
    >
      <Icon className={`text-4xl transition-colors ${isHover ? "text-[#007AFF]" : "text-[#9ca3af]"}`} />
      <span className="text-sm text-[#9ca3af]">{label}</span>
      {hasFiles && (
        <span className="text-xs text-[#39FF14]">{t("common.filesSelected", { count: fileCount })}</span>
      )}
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (multiple) {
            onSelect(Array.from(e.target.files || []));
          } else {
            onSelect(e.target.files?.[0] ?? null);
          }
        }}
      />
    </label>
  );

  return (
    <AppLayout title="MUSE CORE" rightSlot={<span>{t("officialAudio.rightSlot")}</span>}>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-light mb-3 text-white tracking-tight">{t("officialAudio.title")}</h2>
        <p className="text-[#9ca3af]">{t("officialAudio.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 daw-card p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-[#e5e5e5] mb-2">{t("officialAudio.audioFiles")}</label>
              <DropZone
                onSelect={onSelectAudios}
                accept="audio/*"
                multiple
                label={t("officialAudio.audioLabel")}
                icon={Music}
                isHover={isAudioHover}
                setIsHover={setIsAudioHover}
                hasFiles={!!audioFiles.length}
                fileCount={audioFiles.length}
              />
            </div>

            <div>
              <label className="block text-sm text-[#e5e5e5] mb-2">{t("officialAudio.albumArt")}</label>
              <DropZone
                onSelect={(file) => setImageFile(file)}
                accept="image/*"
                label={t("officialAudio.imageLabel")}
                icon={ImageIcon}
                isHover={isImageHover}
                setIsHover={setIsImageHover}
                hasFiles={!!imageFile}
                fileCount={imageFile ? 1 : 0}
              />
              {imageFile && (
                <div className="mt-3 text-sm text-[#9ca3af] truncate">{imageFile.name}</div>
              )}
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="mt-4 w-full rounded-lg border border-white/10" />
              )}
            </div>
          </div>

          {/* Rack-style quality control */}
          <div className="mt-6 p-4 rounded-xl bg-[#111]/50 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-sm font-medium text-[#e5e5e5]">{t("officialAudio.quality")}</span>
            </div>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/50"
            >
              <option value="fast">{t("officialAudio.qualityFast")}</option>
              <option value="balanced">{t("officialAudio.qualityBalanced")}</option>
              <option value="high">{t("officialAudio.qualityHigh")}</option>
            </select>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={disabled}
              onClick={startBatch}
              className={`daw-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? "opacity-50" : ""}`}
            >
              <Wand2 size={18} />
              {t("officialAudio.generateAll")}
            </button>

            <button
              disabled={!isGenerating}
              onClick={cancelBatch}
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
                      {j.status === 'pending' && t("officialAudio.statusPending")}
                      {j.status === 'running' && t("officialAudio.statusEncoding", { pct: formatPct(j.progress) })}
                      {j.status === 'done' && t("officialAudio.statusDone")}
                      {j.status === 'error' && t("officialAudio.statusError")}
                    </div>
                  </div>
                  <div className="mt-2 w-full h-2 bg-white/10 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${j.status === 'error' ? 'bg-[#ef4444]' : 'bg-[#007AFF]'}`}
                      style={{ width: j.status === 'done' ? '100%' : `${Math.round((j.progress || 0) * 100)}%` }}
                    />
                  </div>
                  {j.url && (
                    <div className="mt-2 text-xs flex gap-4">
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-[#007AFF] hover:text-[#39FF14] inline-flex items-center gap-1">
                        <Video size={14} /> {t("common.preview")}
                      </a>
                      <a href={j.url} download={`${baseName(j.file.name)}.mp4`} className="text-[#007AFF] hover:text-[#39FF14] inline-flex items-center gap-1">
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
            {tArray("officialAudio.guideItems").map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <ContentPlaceholder title={t("officialAudio.contentTitle")} />
    </AppLayout>
  );
}
