import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  Settings,
  Hand,
} from "lucide-react";
import AppLayout from '@/components/layout/AppLayout';
import ContentPlaceholder from '@/components/layout/ContentPlaceholder';
import { useI18n } from '@/i18n/I18nContext';

export default function MetronomePage() {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(0.5);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tapTimes, setTapTimes] = useState([]);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customNumerator, setCustomNumerator] = useState(4);
  const [customDenominator, setCustomDenominator] = useState(4);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const timeSignatures = {
    "4/4": { beats: 4, key: "commonTime" },
    "3/4": { beats: 3, key: "waltz" },
    "2/4": { beats: 2, key: "march" },
    "6/8": { beats: 6, key: "compoundDuple" },
    "5/4": { beats: 5, key: "irregular" },
  };

  const getCurrentTimeSignature = () => {
    if (showCustomize) {
      return {
        beats: customNumerator,
        name: t("metronome.timeSignature.custom", { num: customNumerator, denom: customDenominator }),
        signature: `${customNumerator}/${customDenominator}`,
      };
    }
    const sig = timeSignatures[timeSignature];
    return {
      beats: sig.beats,
      name: t(`metronome.timeSignature.${sig.key}`),
      signature: timeSignature,
    };
  };

  useEffect(() => {
    audioContextRef.current = new (
      window.AudioContext || window.webkitAudioContext
    )();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playClick = useCallback(
    (isAccent = false) => {
      if (!audioContextRef.current) return;

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      const frequency = isAccent ? 1000 : 800;
      oscillator.frequency.setValueAtTime(
        frequency,
        audioContextRef.current.currentTime,
      );
      gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + 0.1,
      );

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    },
    [volume],
  );

  const playBeat = useCallback(() => {
    setCurrentBeat((prevBeat) => {
      const beatsPerMeasure = getCurrentTimeSignature().beats;
      const currentBeatIndex = prevBeat;
      const isAccent = currentBeatIndex === 0;

      playClick(isAccent);

      return (currentBeatIndex + 1) % beatsPerMeasure;
    });
  }, [timeSignature, customNumerator, showCustomize, playClick]);

  const startMetronome = useCallback(() => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    const interval = 60000 / bpm;

    setCurrentBeat(0);
    playClick(true);

    intervalRef.current = setInterval(() => {
      setCurrentBeat((prevBeat) => {
        const beatsPerMeasure = getCurrentTimeSignature().beats;
        const nextBeat = (prevBeat + 1) % beatsPerMeasure;
        const isAccent = nextBeat === 0;

        playClick(isAccent);

        return nextBeat;
      });
    }, interval);

    setIsPlaying(true);
  }, [bpm, timeSignature, customNumerator, showCustomize, playClick]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    setTapTimes((prev) => {
      const newTimes = [...prev, now].slice(-4);

      if (newTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newTimes.length; i++) {
          intervals.push(newTimes[i] - newTimes[i - 1]);
        }

        const avgInterval =
          intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avgInterval);

        if (newBpm >= 40 && newBpm <= 200) {
          setBpm(newBpm);
        }
      }

      return newTimes;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTapTimes([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, [tapTimes]);

  useEffect(() => {
    if (isPlaying) {
      stopMetronome();
      startMetronome();
    }
  }, [
    bpm,
    timeSignature,
    customNumerator,
    customDenominator,
    showCustomize,
    isPlaying,
    startMetronome,
    stopMetronome,
  ]);

  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, [stopMetronome]);

  const currentSig = getCurrentTimeSignature();
  const beatsPerMeasure = currentSig.beats;

  return (
    <AppLayout title="MUSE CORE" containerMaxWidthClassName="max-w-2xl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-light mb-4 text-white tracking-tight">
          {t("metronome.title")}
        </h2>
      </div>

      <div className="daw-card p-6">
        {/* LED/VFD BPM Display */}
        <div className="text-center mb-6">
          <div
            className="daw-led-display text-7xl font-light mb-2 font-mono"
            style={{ letterSpacing: '0.05em' }}
          >
            {bpm}
          </div>
          <div className="text-[#9ca3af] text-lg mb-6 tracking-tight">BPM</div>

          {/* Circular Ring Beat Visualization */}
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {(() => {
                  const r = 42;
                  const circumference = 2 * Math.PI * r;
                  const segmentLength = circumference / beatsPerMeasure;
                  return Array.from({ length: beatsPerMeasure }).map((_, i) => {
                    const isActive = currentBeat === i && isPlaying;
                    const isDownbeat = i === 0;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={r}
                        fill="none"
                        stroke={isActive ? "#39FF14" : "rgba(255,255,255,0.2)"}
                        strokeWidth={isActive ? (isDownbeat ? 8 : 6) : 3}
                        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                        strokeDashoffset={-i * segmentLength}
                        className="transition-all duration-150"
                        style={{
                          filter: isActive ? `drop-shadow(0 0 ${isDownbeat ? '12' : '8'}px rgba(57,255,20,${isDownbeat ? '0.9' : '0.5'}))` : 'none',
                        }}
                      />
                    );
                  });
                })()}
              </svg>
              {/* Center play/pause */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => (isPlaying ? stopMetronome() : startMetronome())}
                  className="w-16 h-16 rounded-full bg-[#007AFF]/20 border border-[#007AFF]/50 flex items-center justify-center hover:bg-[#007AFF]/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={28} className="text-[#007AFF]" />
                  ) : (
                    <Play size={28} className="text-[#007AFF] ml-1" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="text-sm text-[#9ca3af]">{currentSig.name}</div>
        </div>

        {/* Time Signature Controls */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {Object.entries(timeSignatures).map(([sig]) => (
              <button
                key={sig}
                onClick={() => {
                  setTimeSignature(sig);
                  setShowCustomize(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                  timeSignature === sig && !showCustomize
                    ? "bg-[#007AFF] text-white shadow-[0_0_12px_rgba(0,122,255,0.4)]"
                    : "bg-white/10 text-[#9ca3af] hover:bg-white/20 border border-white/10"
                }`}
              >
                {sig}
              </button>
            ))}
          </div>

          <div className="text-center mb-4">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 mx-auto ${
                showCustomize
                  ? "bg-[#007AFF] text-white"
                  : "bg-white/10 text-[#9ca3af] hover:bg-white/20 border border-white/10"
              }`}
            >
              <Settings size={14} />
              {showCustomize ? t("metronome.hideCustom") : t("metronome.customize")}
            </button>
          </div>

          {showCustomize && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#9ca3af]">{t("metronome.beats")}:</label>
                  <select
                    value={customNumerator}
                    onChange={(e) =>
                      setCustomNumerator(parseInt(e.target.value))
                    }
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white focus:border-[#007AFF]"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[#9ca3af]">/</div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#9ca3af]">{t("metronome.note")}:</label>
                  <select
                    value={customDenominator}
                    onChange={(e) =>
                      setCustomDenominator(parseInt(e.target.value))
                    }
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white focus:border-[#007AFF]"
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* BPM Slider */}
          <input
            type="range"
            min="40"
            max="200"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="daw-slider w-full mb-2"
            style={{
              background: `linear-gradient(to right, #007AFF 0%, #007AFF ${((bpm - 40) / 160) * 100}%, rgba(255,255,255,0.1) ${((bpm - 40) / 160) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-[#9ca3af] mb-4">
            <span>40</span>
            <span className="text-sm">
              {bpm < 60 && t("metronome.tempo.largo")}
              {bpm >= 60 && bpm < 72 && t("metronome.tempo.adagio")}
              {bpm >= 72 && bpm < 108 && t("metronome.tempo.andante")}
              {bpm >= 108 && bpm < 132 && t("metronome.tempo.moderato")}
              {bpm >= 132 && bpm < 168 && t("metronome.tempo.allegro")}
              {bpm >= 168 && t("metronome.tempo.presto")}
            </span>
            <span>200</span>
          </div>
        </div>

        {/* Tap Tempo & Volume */}
        <div>
          <div className="flex gap-3 mb-3">
            <button
              onClick={handleTapTempo}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors duration-200 rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#e5e5e5]"
            >
              <Hand size={18} />
              {t("metronome.tapTempo")}
            </button>

            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
              <Volume2 size={18} className="text-[#9ca3af]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="daw-slider w-16"
                style={{
                  background: `linear-gradient(to right, #007AFF 0%, #007AFF ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
          </div>

          {tapTimes.length > 0 && (
            <div className="text-center text-xs text-[#9ca3af]">
              {t("metronome.tapped", { count: tapTimes.length })}
            </div>
          )}
        </div>
      </div>

      <ContentPlaceholder title={t("metronome.contentTitle")} />
    </AppLayout>
  );
}
