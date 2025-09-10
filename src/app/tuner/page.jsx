import { useState, useEffect, useRef, useCallback } from "react";
// pitchy exports PitchDetector (no named export 'Pitch')
// use PitchDetector.forFloat32Array(...).findPitch(...)
import { Mic, MicOff } from "lucide-react";
import { PitchDetector } from "pitchy";
import AppLayout from '@/components/layout/AppLayout';

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

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }

    const fftSize = analyserRef.current.fftSize;
    const timeData = new Float32Array(fftSize);
    analyserRef.current.getFloatTimeDomainData(timeData);

    if (!analyzeAudio.detector || analyzeAudio.detector.inputLength !== fftSize) {
      analyzeAudio.detector = PitchDetector.forFloat32Array(fftSize);
    }
    const [pitchHz, clarity] = analyzeAudio.detector.findPitch(
      timeData,
      audioContextRef.current.sampleRate
    );

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
  }, []);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Build processing graph: source -> HPF(80Hz) -> analyser
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
    return () => {
      stopTuner();
    };
  }, []);

  return (
    <AppLayout title="MUSE CORE" containerMaxWidthClassName="max-w-2xl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-light mb-4 text-purple-100">Tuner</h2>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="text-center mb-6">
          <div className="text-6xl font-light mb-2 text-white">
            {note || "—"}
          </div>
          <div className="text-purple-300 text-lg mb-4">
            {frequency > 0 ? `${frequency} Hz` : "No signal detected"}
          </div>
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

        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={isListening ? stopTuner : startTuner}
            className="bg-purple-600 hover:bg-purple-700 transition-colors duration-200 rounded-xl px-6 py-3 flex items-center justify-center gap-3 text-base font-medium shadow-lg hover:shadow-xl"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            {isListening ? "Stop Listening" : "Start Tuner"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
