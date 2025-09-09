import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Volume2, Mic, MicOff, Music, Video } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Logo Bar */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-light text-purple-100 tracking-wide">
              MUSE CORE
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-light mb-6 text-purple-100">
            Music Tools
          </h2>
          <p className="text-xl text-purple-300 mb-8">
            Professional metronome and tuner for musicians
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Metronome Card */}
          <a href="/metronome" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
              <div className="text-center">
                <div className="mb-6">
                  <Play
                    size={64}
                    className="mx-auto text-purple-400 group-hover:text-purple-300 transition-colors"
                  />
                </div>
                <h2 className="text-3xl font-light mb-4 text-white">
                  Metronome
                </h2>
                <p className="text-purple-300 mb-6">
                  Keep perfect time with adjustable BPM and volume controls
                </p>
                <div className="flex justify-center gap-4 text-sm text-purple-400">
                  <span>• 40-200 BPM</span>
                  <span>• Volume Control</span>
                  <span>• Tempo Guide</span>
                </div>
              </div>
            </div>
          </a>

          {/* Tuner Card */}
          <a href="/tuner" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
              <div className="text-center">
                <div className="mb-6">
                  <Mic
                    size={64}
                    className="mx-auto text-purple-400 group-hover:text-purple-300 transition-colors"
                  />
                </div>
                <h2 className="text-3xl font-light mb-4 text-white">Tuner</h2>
                <p className="text-purple-300 mb-6">
                  Tune your instrument with real-time pitch detection
                </p>
                <div className="flex justify-center gap-4 text-sm text-purple-400">
                  <span>• Note Detection</span>
                  <span>• Cents Display</span>
                  <span>• Visual Guide</span>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Row 2 */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {/* Official Audio Card */}
          <a href="/official-audio" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
              <div className="text-center">
                <div className="mb-6">
                  <Video
                    size={64}
                    className="mx-auto text-purple-400 group-hover:text-purple-300 transition-colors"
                  />
                </div>
                <h2 className="text-3xl font-light mb-4 text-white">
                  Official Audio
                </h2>
                <p className="text-purple-300 mb-6">
                  Combine your album art and audio into a YouTube-ready MP4
                </p>
                <div className="flex justify-center gap-4 text-sm text-purple-400">
                  <span>• Image + Audio → MP4</span>
                  <span>• H.264 + AAC</span>
                  <span>• 1080p</span>
                </div>
              </div>
            </div>
          </a>

          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-purple-300">
              더 많은 툴이 곧 추가됩니다.
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-purple-400 text-lg">
            Choose your tool to get started
          </p>
        </div>
      </div>
    </div>
  );
}
