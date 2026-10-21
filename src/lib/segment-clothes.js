import { env, pipeline } from "@huggingface/transformers";
import { detectionRegions } from "./bulk-regions.js";
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let ready;
const labels = {
  Pants: "pants.",
  Shirt: "shirt.",
  "T-shirt": "t-shirt.",
  Hoodie: "hoodie.",
  Traditional: "kurta. traditional tunic.",
  Shoes: "shoe.",
};
export async function segmentClothes(
  image,
  progress = () => {},
  category = "Pants",
) {
  progress("Loading the clothing finder… First use downloads about 204 MB.");
  if (!ready)
    ready = pipeline(
      "zero-shot-object-detection",
      "onnx-community/grounding-dino-tiny-ONNX",
      {
        revision: "ff690b0a8050566c290287545bd059350f3e9096",
        dtype: "q8",
        device:
          typeof process !== "undefined" && process.release?.name === "node"
            ? "cpu"
            : "wasm",
        progress_callback: (p) => {
          if (p.status === "progress")
            progress(`Downloading clothing finder: ${Math.round(p.progress)}%`);
        },
      },
    ).catch((e) => {
      ready = null;
      throw e;
    });
  const detector = await ready;
  progress(
    "Finding individual clothes… This can take a minute on slower devices.",
  );
  const detections = await detector(image, [labels[category] || labels.Pants], {
    threshold: 0.28,
  });
  return detectionRegions(detections, image.width, image.height);
}
