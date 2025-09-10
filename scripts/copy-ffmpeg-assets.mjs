import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(process.cwd());
const pub = resolve(root, 'public/ffmpeg');

function ensureDir(p) {
  try { mkdirSync(p, { recursive: true }); } catch {}
}

function copy(src, dest) {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  console.log('[ffmpeg-assets] copied', dest);
}

// Sources
const esmDir = resolve(root, 'node_modules/@ffmpeg/ffmpeg/dist/esm');
const coreStJs = resolve(root, 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js');
const coreStWasm = resolve(root, 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm');
const coreMtJs = resolve(root, 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js');
const coreMtWasm = resolve(root, 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm');
const coreMtWorker = resolve(root, 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js');

// Destinations
const destCoreStJs = resolve(pub, 'core/ffmpeg-core.js');
const destCoreStWasm = resolve(pub, 'core/ffmpeg-core.wasm');
const destCoreMtJs = resolve(pub, 'core-mt/ffmpeg-core.js');
const destCoreMtWasm = resolve(pub, 'core-mt/ffmpeg-core.wasm');
const destCoreMtWorker = resolve(pub, 'core-mt/ffmpeg-core.worker.js');

// Copy entire ESM runtime files needed by worker (worker.js, const.js, utils.js, classes.js, errors.js, types.js, etc.)
const files = readdirSync(esmDir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
for (const f of files) {
  copy(resolve(esmDir, f), resolve(pub, f));
}

// Copy cores
copy(coreStJs, destCoreStJs);
copy(coreStWasm, destCoreStWasm);
copy(coreMtJs, destCoreMtJs);
copy(coreMtWasm, destCoreMtWasm);
copy(coreMtWorker, destCoreMtWorker);

console.log('[ffmpeg-assets] done');
