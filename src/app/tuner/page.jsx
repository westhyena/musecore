import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { PitchDetector } from "pitchy";
import AppLayout from '@/components/layout/AppLayout';
import ContentPlaceholder from '@/components/layout/ContentPlaceholder';
import { useI18n } from '@/i18n/I18nContext';

export default function TunerPage() {
  const { t, tArray } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState("");
  const [cents, setCents] = useState(0);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const highpassRef = useRef(null);
  const emaFreqRef = useRef(null);
  const lastDisplayFreqRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const waveformDataRef = useRef(new Float32Array(2048));

  const NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  ];

  const getNoteInfo = (freq) => {
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    const targetFreq = 440 * Math.pow(2, (midi - 69) / 12);
    return { name, octave, targetFreq, midi };
  };

  const getCents = (freq, targetFreq) => {
    return Math.round(1200 * Math.log2(freq / targetFreq));
  };

  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const data = waveformDataRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(156, 163, 175, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const y = (v * 0.5 + 0.5) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }

    const fftSize = analyserRef.current.fftSize;
    const timeData = new Float32Array(fftSize);
    analyserRef.current.getFloatTimeDomainData(timeData);
    waveformDataRef.current = timeData;

    if (!analyzeAudio.detector || analyzeAudio.detector.inputLength !== fftSize) {
      analyzeAudio.detector = PitchDetector.forFloat32Array(fftSize);
    }
    const [pitchHz, clarity] = analyzeAudio.detector.findPitch(
      timeData,
      audioContextRef.current.sampleRate
    );

    drawWaveform();

    if (pitchHz && clarity > 0.9 && pitchHz > 80) {
      const rawFreq = pitchHz;
      const last = lastDisplayFreqRef.current;
      let corrected = rawFreq;
      if (last) {
        const candidates = [rawFreq, rawFreq / 2, rawFreq * 2];
        corrected = candidates.reduce((best, candidate) => {
          const currentDist = Math.abs(Math.log2(candidate / last));
          const bestDist = Math.abs(Math.log2(best / last));
          return currentDist < bestDist ? candidate : best;
        }, rawFreq);
      } else {
        const minF = 70;
        const maxF = 600;
        while (corrected > maxF) corrected /= 2;
        while (corrected < minF) corrected *= 2;
      }

      const alpha = 0.3;
      const smoothed = last ? alpha * corrected + (1 - alpha) * last : corrected;
      lastDisplayFreqRef.current = smoothed;
      emaFreqRef.current = smoothed;

      if (smoothed > 70 && smoothed < 1200) {
        const candidate = getNoteInfo(smoothed);
        setFrequency(Math.round(smoothed * 10) / 10);
        setNote(`${candidate.name}${candidate.octave}`);
        setCents(getCents(smoothed, candidate.targetFreq));
      }
    }

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, [drawWaveform]);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const highpass = audioContextRef.current.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;
      highpass.Q.value = 0.707;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;

      source.connect(highpass);
      highpass.connect(analyser);

      sourceRef.current = source;
      highpassRef.current = highpass;
      analyserRef.current = analyser;

      emaFreqRef.current = null;
      lastDisplayFreqRef.current = null;
      setIsListening(true);
      analyzeAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopTuner = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (highpassRef.current) {
      try { highpassRef.current.disconnect(); } catch {}
      highpassRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
    setFrequency(0);
    setNote("");
    setCents(0);
  };

  useEffect(() => {
    audioContextRef.current = new (
      window.AudioContext || window.webkitAudioContext
    )();
    return () => {
      stopTuner();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const isInTune = Math.abs(cents) < 5;
  const needleAngle = Math.max(-90, Math.min(90, (cents / 50) * 90));

  return (
    <AppLayout title="MUSE CORE" rightSlot={<span>{t("tuner.rightSlot")}</span>} containerMaxWidthClassName="max-w-2xl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-light mb-4 text-white tracking-tight">{t("tuner.title")}</h2>
      </div>

      <div className="daw-card p-6 relative overflow-hidden">
        {/* Waveform background - lab equipment feel */}
        {isListening && (
          <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none opacity-40">
            <canvas
              ref={waveformCanvasRef}
              width={600}
              height={96}
              className="w-full h-full"
            />
          </div>
        )}

        <div className="relative">
          {/* Semicircular Gauge */}
          <div className="relative mx-auto mb-6" style={{ width: 280, height: 160 }}>
            <svg viewBox="0 0 280 160" className="w-full h-full">
              {/* Gauge arc background */}
              <path
                d="M 20 140 A 120 120 0 0 1 260 140"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* In-tune zone highlight (center) */}
              <path
                d="M 125 140 A 120 120 0 0 1 155 140"
                fill="none"
                stroke={isInTune ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.05)"}
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Center line */}
              <line
                x1="140"
                y1="140"
                x2="140"
                y2="50"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              {/* Needle */}
              {note && (
                <g
                  transform={`translate(140, 140) rotate(${needleAngle})`}
                  style={{ transformOrigin: "140px 140px" }}
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-95"
                    stroke={isInTune ? "#10b981" : Math.abs(cents) < 15 ? "#eab308" : "#ef4444"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{
                      filter: isInTune ? "drop-shadow(0 0 6px rgba(16,185,129,0.8))" : "none",
                    }}
                  />
                </g>
              )}
            </svg>
            {/* Labels */}
            <div className="absolute bottom-0 left-4 text-xs text-[#6b7280]">-50¢</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-[#9ca3af]">0¢</div>
            <div className="absolute bottom-0 right-4 text-xs text-[#6b7280]">+50¢</div>
          </div>

          <div className="text-center mb-6">
            <div className={`text-6xl font-light mb-2 font-mono ${
              isInTune ? "text-[#10b981]" : "text-white"
            }`} style={isInTune ? { textShadow: "0 0 20px rgba(16,185,129,0.6)" } : {}}>
              {note || "—"}
            </div>
            <div className="text-[#9ca3af] text-lg mb-4">
              {frequency > 0 ? `${frequency} Hz` : t("tuner.noSignal")}
            </div>
            {note && (
              <div
                className={`text-lg font-medium mb-4 ${
                  isInTune
                    ? "text-[#10b981]"
                    : Math.abs(cents) < 15
                      ? "text-[#eab308]"
                      : "text-[#ef4444]"
                }`}
              >
                {isInTune
                  ? t("tuner.inTune")
                  : Math.abs(cents) < 15
                    ? t("tuner.close")
                    : t("tuner.outOfTune")}
              </div>
            )}
          </div>

          <div className="mb-6 text-center">
            <span className="text-[#9ca3af] text-sm">{t("tuner.cents")}: </span>
            <span
              className={`text-lg font-medium ${
                isInTune ? "text-[#10b981]" : Math.abs(cents) < 15 ? "text-[#eab308]" : "text-[#ef4444]"
              }`}
            >
              {cents > 0 ? "+" : ""}
              {cents}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={isListening ? stopTuner : startTuner}
              className={`daw-btn-primary rounded-xl px-8 py-3 flex items-center justify-center gap-3 text-base font-medium transition-all ${
                isListening ? "!bg-[#ef4444]/80 hover:!bg-[#ef4444]" : ""
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening ? t("tuner.stopListening") : t("tuner.startTuner")}
            </button>
          </div>
        </div>
      </div>

      <ContentPlaceholder title={t("tuner.contentTitle")}>
        <div className="space-y-4">
          {tArray("tuner.guideItems").map((item, i) =>
            i % 2 === 1 ? (
              <h3 key={i} className={`text-base font-semibold text-[#e5e5e5] mb-1 ${i === 1 ? 'mt-4' : 'mt-6'}`}>
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
