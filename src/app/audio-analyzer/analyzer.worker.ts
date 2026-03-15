/**
 * Web Worker for BPM/Key analysis using Essentia.js (WASM).
 * Runs off the main thread to avoid UI blocking.
 */

const ESSENTIA_SAMPLE_RATE = 44100;

type AnalyzeMessage = {
  type: 'analyze';
  audioData: Float32Array;
  sampleRate: number;
};

type ResultMessage =
  | { type: 'progress'; progress: number; stage: string }
  | { type: 'result'; bpm: number; key: string; scale: string; confidence?: number }
  | { type: 'error'; error: string };

function post(result: ResultMessage) {
  self.postMessage(result);
}

async function loadEssentia(): Promise<{ essentia: any; vectorToArray: (v: any) => Float32Array }> {
  // Use ES build - no document access, WASM bundled (works in Worker)
  const { EssentiaWASM } = await import('essentia.js/dist/essentia-wasm.es.js');
  const { default: Essentia } = await import('essentia.js/dist/essentia.js-core.es.js');

  const wasmModule = EssentiaWASM?.ready ? await EssentiaWASM.ready : EssentiaWASM;
  const essentia = new Essentia(wasmModule);

  const vectorToArray = (vect: { size: () => number; get: (i: number) => number }) => {
    const arr = new Float32Array(vect.size());
    for (let i = 0; i < vect.size(); i++) arr[i] = vect.get(i);
    return arr;
  };

  return { essentia, vectorToArray };
}

function resampleTo44100(
  audioData: Float32Array,
  sourceRate: number
): Float32Array {
  if (sourceRate === ESSENTIA_SAMPLE_RATE) return audioData;

  const durationSec = audioData.length / sourceRate;
  const targetLength = Math.round(durationSec * ESSENTIA_SAMPLE_RATE);
  const result = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = (i / ESSENTIA_SAMPLE_RATE) * sourceRate;
    const idx0 = Math.floor(srcIndex);
    const idx1 = Math.min(idx0 + 1, audioData.length - 1);
    const frac = srcIndex - idx0;
    result[i] = audioData[idx0] * (1 - frac) + audioData[idx1] * frac;
  }
  return result;
}

async function analyze(audioData: Float32Array, sampleRate: number): Promise<void> {
  post({ type: 'progress', progress: 0.1, stage: 'loading' });

  const { essentia, vectorToArray } = await loadEssentia();
  post({ type: 'progress', progress: 0.3, stage: 'resampling' });

  const resampled = resampleTo44100(audioData, sampleRate);
  const signalVector = essentia.arrayToVector(resampled);

  post({ type: 'progress', progress: 0.5, stage: 'bpm' });

  let bpm = 0;
  let confidence = 0;
  try {
    const rhythmOut = essentia.RhythmExtractor2013(signalVector, 208, 'multifeature', 40);
    bpm = Math.round(rhythmOut.bpm ?? 0);
    confidence = rhythmOut.confidence ?? 0;
    if (rhythmOut.ticks) rhythmOut.ticks.delete?.();
    if (rhythmOut.estimates) rhythmOut.estimates.delete?.();
    if (rhythmOut.bpmIntervals) rhythmOut.bpmIntervals.delete?.();
  } catch (e) {
    console.warn('RhythmExtractor2013 fallback:', e);
    try {
      const rhythmOut = essentia.RhythmExtractor2013(signalVector, 208, 'degara', 40);
      bpm = Math.round(rhythmOut.bpm ?? 0);
    } catch (_) {}
  }

  post({ type: 'progress', progress: 0.75, stage: 'key' });

  let key = 'Unknown';
  let scale = '';
  try {
    const keyOut = essentia.KeyExtractor(signalVector, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'bgate', ESSENTIA_SAMPLE_RATE);
    key = keyOut.key ?? 'Unknown';
    scale = keyOut.scale ?? '';
    if (keyOut.strength) keyOut.strength.delete?.();
  } catch (e) {
    console.warn('KeyExtractor error:', e);
  }

  signalVector.delete?.();

  post({ type: 'progress', progress: 1, stage: 'done' });
  post({
    type: 'result',
    bpm,
    key,
    scale,
    confidence,
  });

  try {
    essentia.shutdown?.();
    essentia.delete?.();
  } catch (_) {}
}

self.onmessage = (e: MessageEvent<AnalyzeMessage>) => {
  const { type, audioData, sampleRate } = e.data;
  if (type === 'analyze') {
    analyze(audioData, sampleRate).catch((err) => {
      post({ type: 'error', error: String(err?.message ?? err) });
    });
  }
};
