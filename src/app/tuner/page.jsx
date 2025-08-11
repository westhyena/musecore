import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

export default function TunerPage() {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState("");
  const [cents, setCents] = useState(0);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);

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

  const getClosestNote = (freq) => {
    let closestNote = "A";
    let minDiff = Math.abs(freq - noteFrequencies["A"]);

    Object.entries(noteFrequencies).forEach(([noteName, noteFreq]) => {
      const diff = Math.abs(freq - noteFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = noteName;
      }
    });

    return closestNote;
  };

  const getCents = (freq, targetFreq) => {
    return Math.round(1200 * Math.log2(freq / targetFreq));
  };

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Simple frequency detection (peak frequency)
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    if (maxValue > 50) {
      // Threshold for noise
      const sampleRate = audioContextRef.current.sampleRate;
      const detectedFreq = (maxIndex * sampleRate) / (bufferLength * 2);

      if (detectedFreq > 80 && detectedFreq < 2000) {
        // Musical range
        const closestNote = getClosestNote(detectedFreq);
        const targetFreq = noteFrequencies[closestNote];
        const centsOff = getCents(detectedFreq, targetFreq);

        setFrequency(Math.round(detectedFreq * 10) / 10);
        setNote(closestNote);
        setCents(centsOff);
      }
    }

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      source.connect(analyserRef.current);
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
                    note === noteName
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
