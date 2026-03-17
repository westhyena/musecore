/**
 * Metronome scheduler worker.
 * setInterval/setTimeout in Web Workers are NOT throttled when the tab is in background,
 * unlike the main thread. This keeps beat scheduling reliable when switching tabs.
 */
let intervalId = null;

self.onmessage = (e) => {
  const { action } = e.data;
  if (action === "start") {
    if (intervalId) clearInterval(intervalId);
    const tickMs = e.data.tickMs ?? 80;
    intervalId = setInterval(() => {
      self.postMessage({ type: "tick" });
    }, tickMs);
  } else if (action === "stop") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
