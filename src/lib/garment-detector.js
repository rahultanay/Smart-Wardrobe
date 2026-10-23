import { GARMENT_LABELS } from './garment-labels.js';
let worker, nextId = 0;
const requests = new Map();
const cache = new Map();
export function detectGarment(photo, category, onProgress = () => {}) {
  if (!photo || !GARMENT_LABELS[category]) return Promise.resolve(null);
  const key = category + ':' + photo;
  if (cache.has(key)) return cache.get(key);
  if (!worker) {
    worker = new Worker(new URL('../workers/garment.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const request = requests.get(data.id);
      if (!request) return;
      if (data.progress) return request.progress(data.progress);
      clearTimeout(request.timer);
      requests.delete(data.id);
      if (data.error) request.reject(new Error(data.error)); else request.resolve(data.result);
    };
    worker.onerror = () => {
      for (const request of requests.values()) { clearTimeout(request.timer); request.reject(new Error('Photo recognition unavailable. Choose a garment type manually.')); }
      requests.clear(); worker.terminate(); worker = null;
    };
  }
  const id = ++nextId;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { requests.delete(id); reject(new Error('Photo recognition timed out. Retry or choose the garment type.')); }, 180000);
    requests.set(id, { resolve, reject, timer, progress: onProgress });
    worker.postMessage({ id, photo, category });
  }).catch(error => { cache.delete(key); throw error; });
  cache.set(key, promise);
  // Avoid retaining every original photo indefinitely.
  if (cache.size > 32) cache.delete(cache.keys().next().value);
  return promise;
}
