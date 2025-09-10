import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Wand2, Download, X, Settings } from "lucide-react";

const PRESET_LABEL = {
  streaming: "Streaming (-14 LUFS)",
  loud: "Loud (-9 LUFS)",
  podcast: "Podcast (-16 LUFS)",
  studio: "Studio (WAV)",
};

export default function MasteringPage() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [preset, setPreset] = useState("streaming");
  const [format, setFormat] = useState("wav");
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState([]); // { id, file, progress, status, url?, filename? }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <a href="/" className="text-purple-200 hover:text-white transition-colors">MUSE CORE</a>
            <div className="text-sm text-purple-300">Mastering (ffmpeg.wasm)</div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-light mb-3 text-purple-100">Mastering</h2>
          <p className="text-purple-300">간단한 하이패스/컴프/라우드니스/리미터 체인을 적용합니다.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-purple-200 mb-2">오디오 파일들 (여러개 선택)</label>
                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 p-6 cursor-pointer hover:bg-white/10 transition-colors">
                  <Music className="text-purple-300" />
                  <span className="text-sm text-purple-300">MP3, WAV 등 (다중 선택 가능)</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => onSelectAudios(e.target.files)}
                  />
                </label>
                {!!audioFiles.length && (
                  <div className="mt-3 text-sm text-purple-200">{audioFiles.length}개의 파일 선택됨</div>
                )}
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">프리셋</label>
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-purple-300" />
                  <select
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="streaming">{PRESET_LABEL.streaming}</option>
                    <option value="loud">{PRESET_LABEL.loud}</option>
                    <option value="podcast">{PRESET_LABEL.podcast}</option>
                    <option value="studio">{PRESET_LABEL.studio}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">출력 포맷</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="wav">WAV (pcm_s16le)</option>
                  <option value="m4a">M4A (AAC)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={disabled}
                onClick={startBatch}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 transition-colors ${disabled ? "bg-white/10 text-purple-300" : "bg-purple-500 hover:bg-purple-400 text-white"}`}
              >
                <Wand2 size={18} />
                모두 마스터링 (병렬)
              </button>

              <button
                disabled={!isProcessing}
                onClick={() => { cancelRef.current = true; }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 transition-colors ${!isProcessing ? "bg-white/10 text-purple-300" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                <X size={18} />
                취소
              </button>
            </div>

            {!!jobs.length && (
              <div className="mt-8 space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="truncate">{j.file.name}</div>
                      <div className="text-purple-300">
                        {j.status === 'pending' && '대기 중'}
                        {j.status === 'running' && `${formatPct(j.progress)} 처리 중`}
                        {j.status === 'done' && '완료'}
                        {j.status === 'error' && '오류'}
                      </div>
                    </div>
                    <div className="mt-2 w-full h-2 bg-white/10 rounded overflow-hidden">
                      <div className={`h-full ${j.status === 'error' ? 'bg-red-400' : 'bg-purple-500'}`} style={{ width: j.status === 'done' ? '100%' : `${Math.round((j.progress || 0) * 100)}%` }} />
                    </div>
                    {j.url && (
                      <div className="mt-2 text-xs">
                        <a href={j.url} download={j.filename || `${baseName(j.file.name)}.mastered.m4a`} className="text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                          <Download size={14} /> 다운로드
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg text-purple-100 mb-4">가이드</h3>
            <ul className="space-y-2 text-sm text-purple-200 list-disc list-inside">
              <li>프리셋은 라우드니스/리미터 세팅이 다릅니다.</li>
              <li>브라우저 메모리 한계로 대용량 파일은 실패할 수 있습니다.</li>
              <li>처리 속도는 기기 성능과 파일 길이에 비례합니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


