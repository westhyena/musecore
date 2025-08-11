import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  Music,
  Hand,
  Settings,
  ChevronDown,
} from "lucide-react";

export default function MetronomePage() {
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

  // Time signature options
  const timeSignatures = {
    "4/4": { beats: 4, name: "Common Time" },
    "3/4": { beats: 3, name: "Waltz" },
    "2/4": { beats: 2, name: "March" },
    "6/8": { beats: 6, name: "Compound Duple" },
    "5/4": { beats: 5, name: "Irregular" },
  };

  // Get current time signature info
  const getCurrentTimeSignature = () => {
    if (showCustomize) {
      return {
        beats: customNumerator,
        name: `Custom ${customNumerator}/${customDenominator}`,
        signature: `${customNumerator}/${customDenominator}`,
      };
    }
    return {
      ...timeSignatures[timeSignature],
      signature: timeSignature,
    };
  };

  // Initialize audio context
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

      // Higher pitch for accented beats (first beat of measure)
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

    // Reset to first beat and play immediately
    setCurrentBeat(0);
    playClick(true); // First beat is always accented

    // Start interval for subsequent beats
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

  // Tap tempo functionality
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    setTapTimes((prev) => {
      const newTimes = [...prev, now].slice(-4); // Keep last 4 taps

      if (newTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newTimes.length; i++) {
          intervals.push(newTimes[i] - newTimes[i - 1]);
        }

        const avgInterval =
          intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avgInterval);

        // Only update if BPM is within reasonable range
        if (newBpm >= 40 && newBpm <= 200) {
          setBpm(newBpm);
        }
      }

      return newTimes;
    });
  }, []);

  // Clear tap tempo after 3 seconds of inactivity
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

  // Generate beat indicators for visualization
  const renderBeatIndicators = () => {
    const currentSig = getCurrentTimeSignature();
    const beatsPerMeasure = currentSig.beats;
    const indicators = [];

    for (let i = 0; i < beatsPerMeasure; i++) {
      indicators.push(
        <div
          key={i}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
            currentBeat === i && isPlaying
              ? i === 0
                ? "bg-yellow-400 border-yellow-400 shadow-lg scale-110" // Accent beat
                : "bg-purple-400 border-purple-400 shadow-lg scale-110"
              : "border-white/40 bg-white/10"
          }`}
        />,
      );
    }

    return indicators;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white pb-20">
      {/* Logo Bar */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto">
          <a href="/" className="block text-center">
            <h1 className="text-2xl font-light text-purple-100 hover:text-white transition-colors duration-200 tracking-wide">
              MUSE CORE
            </h1>
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Page Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-light mb-4 text-purple-100">
            Metronome
          </h2>
        </div>

        {/* Metronome Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          {/* BPM Display & Beat Visualization Combined */}
          <div className="text-center mb-6">
            <div className="text-6xl font-light mb-2 text-white">{bpm}</div>
            <div className="text-purple-300 text-lg mb-4">BPM</div>

            {/* Beat Visualization */}
            <div className="flex justify-center gap-2 mb-2">
              {renderBeatIndicators()}
            </div>
            <div className="text-sm text-purple-400">
              {getCurrentTimeSignature().name}
            </div>
          </div>

          {/* Time Signature Controls */}
          <div className="mb-6">
            {/* Preset Time Signatures */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {Object.entries(timeSignatures).map(([sig, info]) => (
                <button
                  key={sig}
                  onClick={() => {
                    setTimeSignature(sig);
                    setShowCustomize(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                    timeSignature === sig && !showCustomize
                      ? "bg-purple-600 text-white"
                      : "bg-white/20 text-purple-300 hover:bg-white/30"
                  }`}
                >
                  {sig}
                </button>
              ))}
            </div>

            {/* Customize Button */}
            <div className="text-center mb-4">
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 mx-auto ${
                  showCustomize
                    ? "bg-purple-600 text-white"
                    : "bg-white/20 text-purple-300 hover:bg-white/30"
                }`}
              >
                <Settings size={14} />
                {showCustomize ? "Hide Custom" : "Customize"}
              </button>
            </div>

            {/* Custom Input - Only show when customize is active */}
            {showCustomize && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-purple-300">Beats:</label>
                    <select
                      value={customNumerator}
                      onChange={(e) =>
                        setCustomNumerator(parseInt(e.target.value))
                      }
                      className="px-2 py-1 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:border-purple-400"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-purple-300">/</div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-purple-300">Note:</label>
                    <select
                      value={customDenominator}
                      onChange={(e) =>
                        setCustomDenominator(parseInt(e.target.value))
                      }
                      className="px-2 py-1 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value={2}>2</option>
                      <option value={4}>4</option>
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                    </select>
                  </div>
                </div>
                <div className="text-center text-xs text-purple-400">
                  Current: {customNumerator}/{customDenominator}
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
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer mb-2"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((bpm - 40) / 160) * 100}%, rgba(255,255,255,0.2) ${((bpm - 40) / 160) * 100}%, rgba(255,255,255,0.2) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-purple-300 mb-4">
              <span>40</span>
              <span className="text-sm">
                {bpm < 60 && "Largo"}
                {bpm >= 60 && bpm < 72 && "Adagio"}
                {bpm >= 72 && bpm < 108 && "Andante"}
                {bpm >= 108 && bpm < 132 && "Moderato"}
                {bpm >= 132 && bpm < 168 && "Allegro"}
                {bpm >= 168 && "Presto"}
              </span>
              <span>200</span>
            </div>
          </div>

          {/* Tap Tempo & Volume Combined */}
          <div className="">
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleTapTempo}
                className="flex-1 bg-white/20 hover:bg-white/30 transition-colors duration-200 rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-medium text-purple-200 hover:text-white"
              >
                <Hand size={18} />
                Tap Tempo
              </button>

              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                <Volume2 size={18} className="text-purple-300" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>
            </div>

            {tapTimes.length > 0 && (
              <div className="text-center text-xs text-purple-400">
                Tapped {tapTimes.length} time{tapTimes.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation with Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/20 px-4 py-3 safe-area-pb">
        <div className="max-w-md mx-auto">
          {/* Main Action Button */}
          <button
            onClick={isPlaying ? stopMetronome : startMetronome}
            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors duration-200 rounded-xl py-4 flex items-center justify-center gap-3 text-lg font-medium shadow-lg hover:shadow-xl mb-3"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            {isPlaying ? "Stop" : "Start"}
          </button>

          {/* Navigation Tabs */}
          <div className="flex gap-2 justify-center">
            <div className="bg-purple-600 px-6 py-3 rounded-full text-white font-medium flex-1 text-center">
              Metronome
            </div>
            <a href="/tuner" className="flex-1">
              <div className="bg-white/20 hover:bg-white/30 transition-colors duration-200 px-6 py-3 rounded-full text-purple-200 hover:text-white cursor-pointer text-center">
                Tuner
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
