import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Image as ImageIcon, Wand2, Video, Download, X } from "lucide-react";
import AppLayout from '@/components/layout/AppLayout';

export default function OfficialAudioPage() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [quality, setQuality] = useState("fast");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobs, setJobs] = useState([]); // { id, file, progress, status: 'pending'|'running'|'done'|'error', url? }
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

      // Create a pool of ffmpeg instances
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

  return (
    <AppLayout title="MUSE CORE" rightSlot={<span>Official Audio Generator</span>}>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-light mb-3 text-purple-100">Official Audio</h2>
        <p className="text-purple-300">앨범 아트 1장 + 다수의 오디오를 한 번에 MP4로 변환합니다.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="grid md:grid-cols-2 gap-6">
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
              <label className="block text-sm text-purple-200 mb-2">앨범 아트(이미지)</label>
              <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 p-6 cursor-pointer hover:bg-white/10 transition-colors">
                <ImageIcon className="text-purple-300" />
                <span className="text-sm text-purple-300">PNG, JPG (1개)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {imageFile && (
                <div className="mt-3 text-sm text-purple-200 truncate">{imageFile.name}</div>
              )}
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="mt-4 w-full rounded-lg border border-white/10" />
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="md:col-span-1">
              <label className="block text-sm text-purple-200 mb-2">품질</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="fast">빠름 (2fps, 720p)</option>
                <option value="balanced">균형 (12fps, 1080p)</option>
                <option value="high">고화질 (24fps, 1080p)</option>
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
              모두 생성 (병렬)
            </button>

            <button
              disabled={!isGenerating}
              onClick={() => { cancelRef.current = true; }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 transition-colors ${!isGenerating ? "bg-white/10 text-purple-300" : "bg-white/10 hover:bg-white/20 text-white"}`}
            >
              <X size={18} />
              취소
            </button>
          </div>

          {/* Jobs */}
          {!!jobs.length && (
            <div className="mt-8 space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="truncate">{j.file.name}</div>
                    <div className="text-purple-300">
                      {j.status === 'pending' && '대기 중'}
                      {j.status === 'running' && `${formatPct(j.progress)} 인코딩 중`}
                      {j.status === 'done' && '완료'}
                      {j.status === 'error' && '오류'}
                    </div>
                  </div>
                  <div className="mt-2 w-full h-2 bg-white/10 rounded overflow-hidden">
                    <div className={`h-full ${j.status === 'error' ? 'bg-red-400' : 'bg-purple-500'}`} style={{ width: j.status === 'done' ? '100%' : `${Math.round((j.progress || 0) * 100)}%` }} />
                  </div>
                  {j.url && (
                    <div className="mt-2 text-xs">
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                        <Video size={14} /> 미리보기
                      </a>
                      <span className="mx-2 text-purple-400">·</span>
                      <a href={j.url} download={`${baseName(j.file.name)}.mp4`} className="text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
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
            <li>병렬 실행 개수는 디바이스 성능에 따라 자동 조절됩니다</li>
            <li>메모리 부족 시 브라우저가 탭을 강제 종료할 수 있습니다</li>
            <li>MP4 파일명은 오디오 파일명으로 자동 저장됩니다</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
