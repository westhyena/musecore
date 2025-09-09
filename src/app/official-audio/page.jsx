import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Image as ImageIcon, Upload, Wand2, Play, Video, RotateCw, Download } from "lucide-react";

export default function OfficialAudioPage() {
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [quality, setQuality] = useState("fast");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const audioUrl = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : ""), [audioFile]);
  const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [audioUrl, imageUrl]);

  const disabled = !audioFile || !imageFile || isGenerating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <a href="/" className="text-purple-200 hover:text-white transition-colors">MUSE CORE</a>
            <div className="text-sm text-purple-300">Official Audio Generator</div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-light mb-3 text-purple-100">Official Audio</h2>
          <p className="text-purple-300">오디오 파일과 앨범 아트를 합쳐 YouTube용 영상으로 변환합니다.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-purple-200 mb-2">오디오 파일</label>
                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 p-6 cursor-pointer hover:bg-white/10 transition-colors">
                  <Music className="text-purple-300" />
                  <span className="text-sm text-purple-300">MP3, WAV 등</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {audioFile && (
                  <div className="mt-3 text-sm text-purple-200 truncate">{audioFile.name}</div>
                )}
                {audioUrl && (
                  <audio src={audioUrl} controls className="mt-4 w-full" />
                )}
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">앨범 아트(이미지)</label>
                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 p-6 cursor-pointer hover:bg-white/10 transition-colors">
                  <ImageIcon className="text-purple-300" />
                  <span className="text-sm text-purple-300">PNG, JPG</span>
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
              <div>
                <label className="block text-sm text-purple-200 mb-2">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="곡 제목"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm text-purple-200 mb-2">아티스트</label>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="아티스트명"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {isGenerating && (
              <div className="mt-6">
                <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-purple-300">{Math.round(progress * 100)}%</div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                disabled={disabled}
                onClick={() => {
                  const event = new CustomEvent("official-audio:generate", {
                    detail: { audioFile, imageFile, title, artist, quality },
                  });
                  window.dispatchEvent(event);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 transition-colors ${disabled ? "bg-white/10 text-purple-300" : "bg-purple-500 hover:bg-purple-400 text-white"}`}
              >
                <Wand2 size={18} />
                생성하기
              </button>

              <button
                disabled={!videoUrl}
                onClick={() => {
                  if (!videoUrl) return;
                  const a = document.createElement("a");
                  a.href = videoUrl;
                  a.download = `${title || "official-audio"}.mp4`;
                  a.click();
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 transition-colors ${!videoUrl ? "bg-white/10 text-purple-300" : "bg-emerald-500 hover:bg-emerald-400 text-white"}`}
              >
                <Download size={18} />
                MP4 다운로드
              </button>

              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Video size={18} /> 미리보기
                </a>
              )}
            </div>

            {!!error && (
              <div className="mt-4 text-sm text-red-300">{error}</div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg text-purple-100 mb-4">가이드</h3>
            <ul className="space-y-2 text-sm text-purple-200 list-disc list-inside">
              <li>이미지는 정사각형(1:1) 권장, 최소 1000×1000px</li>
              <li>오디오는 압축형(MP3) 또는 무손실(WAV) 모두 가능</li>
              <li>생성 시간은 브라우저 성능/오디오 길이에 따라 달라집니다</li>
            </ul>
            <div className="mt-6 text-xs text-purple-300">
              브라우저에서 로컬로 처리되며, 파일이 서버로 전송되지 않습니다.
            </div>
          </div>
        </div>

        <VideoGeneratorBridge onStart={() => setIsGenerating(true)} onProgress={(p)=> setProgress(p)} onFinish={(url) => { setVideoUrl(url); setIsGenerating(false); setProgress(1); }} onError={(msg) => { setError(msg); setIsGenerating(false); }} />
      </div>
    </div>
  );
}

function VideoGeneratorBridge({ onStart, onFinish, onError, onProgress }) {
  useEffect(() => {
    async function handler(e) {
      const { audioFile, imageFile, title, artist, quality } = e.detail || {};
      try {
        onStart?.();
        const { generateOfficialAudio } = await import("./worker");
        const url = await generateOfficialAudio({ audioFile, imageFile, title, artist, quality, onProgress });
        onFinish?.(url);
      } catch (err) {
        console.error(err);
        onError?.(err?.message || "영상 생성 중 오류가 발생했습니다.");
      }
    }
    window.addEventListener("official-audio:generate", handler);
    return () => window.removeEventListener("official-audio:generate", handler);
  }, [onStart, onFinish, onError, onProgress]);

  return null;
}
