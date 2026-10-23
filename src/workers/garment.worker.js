import { pipeline, env } from '@huggingface/transformers';
import { GARMENT_LABELS, interpretGarmentScores } from '../lib/garment-labels.js';
env.allowLocalModels = false;
let classifier;
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      if (!classifier) classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {
        revision: '6ef1ebc8b0766a7a8d11b146462c99cdf74dd22d', dtype: 'q8', device: 'wasm',
        progress_callback: () => self.postMessage({ id: data.id, progress: 'Preparing photo recognition. First use downloads a model; later uses reuse the cache.' }),
      });
      self.postMessage({ id: data.id, progress: 'Inspecting garment construction in the photo…' });
      const result = await classifier(data.photo, Object.values(GARMENT_LABELS[data.category]));
      self.postMessage({ id: data.id, result: interpretGarmentScores(data.category, result) });
    } catch (error) {
      self.postMessage({ id: data.id, error: 'Photo recognition could not finish. Check your connection and retry, or choose the garment type. Unrecognised pants stay out of Formal.' });
    }
  });
};
