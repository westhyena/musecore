/*
  AudioWorkletProcessor for real-time preprocessing:
  - Applies a simple high-pass shaping (~80Hz) to reduce rumble
  - Accumulates ~100ms frames and posts them to main thread for YIN detection (pitchy)
*/

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
    this.hpPrev = 0;
    this.hpAlpha = 0.95; // simple one-pole HP-ish high-pass effect
  }

  // Very light high-pass shaping on the fly (not a true biquad)
  highpassInline(input) {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const y = x - this.hpPrev + this.hpAlpha * out[i - 1] || 0;
      out[i] = y;
      this.hpPrev = x;
    }
    return out;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;

    // Inline HP filter to attenuate <~80Hz rumble (approx)
    const filtered = this.highpassInline(ch);

    // Append into working buffer
    const newBuf = new Float32Array(this.buffer.length + filtered.length);
    newBuf.set(this.buffer, 0);
    newBuf.set(filtered, this.buffer.length);
    this.buffer = newBuf;

    // Aim for ~100ms frames for YIN
    const targetSize = Math.floor(sampleRate * 0.1);
    if (this.buffer.length >= targetSize) {
      const frame = this.buffer.subarray(0, targetSize);
      this.buffer = this.buffer.subarray(targetSize);

      // Post frame to main thread for pitch detection (transfer buffer)
      const transferable = new Float32Array(frame); // copy to isolate backing store
      this.port.postMessage({ frame: transferable, sampleRate }, [transferable.buffer]);
    }
    return true;
  }
}

registerProcessor('pitch-processor', PitchProcessor);


