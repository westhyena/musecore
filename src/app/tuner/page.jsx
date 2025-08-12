import { useState, useEffect, useRef, useCallback } from "react";
// pitchy exports PitchDetector (no named export 'Pitch')
// use PitchDetector.forFloat32Array(...).findPitch(...)
import { Mic, MicOff } from "lucide-react";
import { PitchDetector } from "pitchy";

export default function TunerPage() {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState("");
  const [cents, setCents] = useState(0);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  // WebAudio node refs & trackers for stability
  const sourceRef = useRef(null);
  const highpassRef = useRef(null);
  const lowpassRef = useRef(null);
  const emaFreqRef = useRef(null); // smoothed frequency for display
  const lastDisplayFreqRef = useRef(null); // last displayed freq for octave correction
  const currentNoteRef = useRef(null); // currently locked note (with midi)
  const pendingNoteRef = useRef(null); // candidate note waiting for confirmation
  const pendingCountRef = useRef(0); // frames the candidate persisted
  const workletNodeRef = useRef(null);

  // Note frequencies (A4 = 440Hz)
  const noteFrequencies = {
    C: 261.63,
    "C#": 277.18,
    D: 293.66,
    "D#": 311.13,
    E: 329.63,
    F: 349.23,
    "F#": 369.99,
    G: 392.0,
    "G#": 415.3,
    A: 440.0,
    "A#": 466.16,
    B: 493.88,
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

  // Chromatic note names for octave-aware mapping (A4 = 440)
  const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  // YIN-based detection via 'pitchy' will be used instead of FFT/autocorrelation

  // Map arbitrary frequency to the nearest tempered note across all octaves
  const getNoteInfo = (freq) => {
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    const targetFreq = 440 * Math.pow(2, (midi - 69) / 12);
    return { name, octave, targetFreq, midi };
  };

  // Convert frequency deviation to cents relative to a target frequency
  const getCents = (freq, targetFreq) => {
    return Math.round(1200 * Math.log2(freq / targetFreq));
  };

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    // Ensure audio context is running (Safari/iOS often starts suspended)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }

    // 1) Acquire time-domain samples (from HPF->analyser chain)
    const fftSize = analyserRef.current.fftSize;
    const timeData = new Float32Array(fftSize);
    analyserRef.current.getFloatTimeDomainData(timeData);

    // 2) YIN pitch detection via pitchy (reuse detector)
    if (!analyzeAudio.detector || analyzeAudio.detector.inputLength !== fftSize) {
      analyzeAudio.detector = PitchDetector.forFloat32Array(fftSize);
    }
    const [pitchHz, clarity] = analyzeAudio.detector.findPitch(
      timeData,
      audioContextRef.current.sampleRate
    );

    // 3) Validate and stabilize
    if (pitchHz && clarity > 0.9 && pitchHz > 80) {
      const rawFreq = pitchHz;

      // Octave correction using 0.5x/1x/2x candidates and last display frequency
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
        // Fold into a guitar-friendly band initially to prefer fundamentals
        const minF = 70;
        const maxF = 600;
        while (corrected > maxF) corrected /= 2;
        while (corrected < minF) corrected *= 2;
      }

      // Exponential Moving Average to smooth jitter (alpha=0.3)
      const alpha = 0.3;
      const smoothed = last ? alpha * corrected + (1 - alpha) * last : corrected;
      lastDisplayFreqRef.current = smoothed;
      emaFreqRef.current = smoothed;

      // Only accept plausible instrument range
      if (smoothed > 70 && smoothed < 1200) {
        const candidate = getNoteInfo(smoothed);

        // Hysteresis: require a few frames before switching notes
        if (!currentNoteRef.current) {
          currentNoteRef.current = candidate;
          pendingNoteRef.current = null;
          pendingCountRef.current = 0;
        } else if (candidate.midi === currentNoteRef.current.midi) {
          pendingNoteRef.current = null;
          pendingCountRef.current = 0;
        } else {
          if (!pendingNoteRef.current || pendingNoteRef.current.midi !== candidate.midi) {
            pendingNoteRef.current = candidate;
            pendingCountRef.current = 1;
          } else {
            pendingCountRef.current += 1;
            if (pendingCountRef.current >= 3) {
              currentNoteRef.current = pendingNoteRef.current;
              pendingNoteRef.current = null;
              pendingCountRef.current = 0;
            }
          }
        }

        // If current note is clearly off (>60 cents), allow immediate switch
        let active = currentNoteRef.current || candidate;
        let centsOffActive = getCents(smoothed, active.targetFreq);
        const centsOffCandidate = getCents(smoothed, candidate.targetFreq);
        if (Math.abs(centsOffActive) > 60 || Math.abs(centsOffCandidate) < Math.abs(centsOffActive)) {
          active = candidate;
          currentNoteRef.current = candidate;
          pendingNoteRef.current = null;
          pendingCountRef.current = 0;
          centsOffActive = centsOffCandidate;
        }

        // Update UI state
        setFrequency(Math.round(smoothed * 10) / 10);
        setNote(`${active.name}${active.octave}`);
        setCents(centsOffActive);
      }
    }

    // 5) Schedule next analysis frame
    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Build processing graph: source -> HPF(80Hz) -> analyser
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      highpassRef.current = audioContextRef.current.createBiquadFilter();
      highpassRef.current.type = "highpass";
      highpassRef.current.frequency.value = 80; // reduce low-frequency noise
      highpassRef.current.Q.value = 0.707;

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      sourceRef.current.connect(highpassRef.current);
      highpassRef.current.connect(analyserRef.current);

      // Prefer AudioWorklet if supported; fallback to main-thread analysis
      try {
        if (audioContextRef.current.audioWorklet) {
          const moduleUrl = new URL("./pitch-worklet.js", import.meta.url);
          await audioContextRef.current.audioWorklet.addModule(moduleUrl);
          workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, "pitch-processor");
          // route HPF output to worklet
          highpassRef.current.connect(workletNodeRef.current);
          workletNodeRef.current.port.onmessage = (e) => {
            const { frame, sampleRate } = e.data || {};
            if (!frame) return;
            if (!startTuner.detector || startTuner.detector.inputLength !== frame.length) {
              startTuner.detector = PitchDetector.forFloat32Array(frame.length);
            }
            const [pitchHz, clarity] = startTuner.detector.findPitch(frame, sampleRate);
            if (pitchHz && clarity > 0.9 && pitchHz > 80) {
              const last = lastDisplayFreqRef.current;
              const alpha = 0.3;
              const smoothed = last == null ? pitchHz : alpha * pitchHz + (1 - alpha) * last;
              lastDisplayFreqRef.current = smoothed;
              emaFreqRef.current = smoothed;
              if (smoothed > 70 && smoothed < 1200) {
                const candidate = getNoteInfo(smoothed);
                const centsOff = getCents(smoothed, candidate.targetFreq);
                setFrequency(Math.round(smoothed * 10) / 10);
                setNote(`${candidate.name}${candidate.octave}`);
                setCents(centsOff);
              }
            }
          };
        }
      } catch (err) {
        console.warn("AudioWorklet unavailable, falling back to main-thread", err);
      }

      // Reset trackers on start
      emaFreqRef.current = null;
      lastDisplayFreqRef.current = null;
      currentNoteRef.current = null;
      pendingNoteRef.current = null;
      pendingCountRef.current = 0;

      setIsListening(true);
      if (!workletNodeRef.current) {
        analyzeAudio();
      }
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
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (highpassRef.current) {
      try {
        highpassRef.current.disconnect();
      } catch {}
      highpassRef.current = null;
    }
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }
    if (lowpassRef.current) {
      try {
        lowpassRef.current.disconnect();
      } catch {}
      lowpassRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
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
    return () => {
      stopTuner();
    };
  }, []);

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
          <h2 className="text-3xl font-light mb-4 text-purple-100">Tuner</h2>
        </div>

        {/* Tuner Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          {/* Note Display */}
          <div className="text-center mb-6">
            <div className="text-6xl font-light mb-2 text-white">
              {note || "—"}
            </div>
            <div className="text-purple-300 text-lg mb-4">
              {frequency > 0 ? `${frequency} Hz` : "No signal detected"}
            </div>

            {/* Tuning Status */}
            {note && (
              <div
                className={`text-lg font-medium mb-4 ${
                  Math.abs(cents) < 5
                    ? "text-green-400"
                    : Math.abs(cents) < 15
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {Math.abs(cents) < 5
                  ? "✓ In Tune"
                  : Math.abs(cents) < 15
                    ? "~ Close"
                    : "✗ Out of Tune"}
              </div>
            )}
          </div>

          {/* Cents Indicator */}
          <div className="mb-6">
            <div className="text-center mb-3">
              <span className="text-purple-300 text-sm">Cents: </span>
              <span
                className={`text-lg font-medium ${
                  Math.abs(cents) < 5
                    ? "text-green-400"
                    : Math.abs(cents) < 15
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {cents > 0 ? "+" : ""}
                {cents}
              </span>
            </div>

            {/* Visual cents indicator */}
            <div className="relative h-4 bg-white/20 rounded-lg overflow-hidden mb-2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0.5 h-full bg-white/80"></div>
              </div>
              {note && (
                <div
                  className={`absolute top-0 h-full w-1 transition-all duration-200 rounded ${
                    Math.abs(cents) < 5
                      ? "bg-green-400"
                      : Math.abs(cents) < 15
                        ? "bg-yellow-400"
                        : "bg-red-400"
                  }`}
                  style={{
                    left: `${Math.max(0, Math.min(100, 50 + (cents / 50) * 25))}%`,
                    transform: "translateX(-50%)",
                  }}
                ></div>
              )}
            </div>
            <div className="flex justify-between text-xs text-purple-300 mb-4">
              <span>-50¢</span>
              <span>0¢</span>
              <span>+50¢</span>
            </div>
          </div>

          {/* Note Reference Guide - Compact */}
          <div className="">
            <div className="text-center mb-3">
              <span className="text-purple-300 text-sm">
                Standard Tuning (A4 = 440Hz)
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {Object.entries(noteFrequencies).map(([noteName, freq]) => (
                <div
                  key={noteName}
                  className={`text-center p-2 rounded ${
                    note && note.startsWith(noteName)
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-purple-300"
                  }`}
                >
                  <div className="font-medium">{noteName}</div>
                  <div className="text-xs opacity-75">{freq.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation with Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/20 px-4 py-3 safe-area-pb">
        <div className="max-w-md mx-auto">
          {/* Main Action Button */}
          <button
            onClick={isListening ? stopTuner : startTuner}
            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors duration-200 rounded-xl py-4 flex items-center justify-center gap-3 text-lg font-medium shadow-lg hover:shadow-xl mb-3"
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            {isListening ? "Stop Listening" : "Start Tuner"}
          </button>

          {!isListening && (
            <div className="mb-3 text-center text-purple-300 text-sm">
              Click "Start Tuner" and allow microphone access to begin
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-2 justify-center">
            <a href="/metronome" className="flex-1">
              <div className="bg-white/20 hover:bg-white/30 transition-colors duration-200 px-6 py-3 rounded-full text-purple-200 hover:text-white cursor-pointer text-center">
                Metronome
              </div>
            </a>
            <div className="bg-purple-600 px-6 py-3 rounded-full text-white font-medium flex-1 text-center">
              Tuner
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
