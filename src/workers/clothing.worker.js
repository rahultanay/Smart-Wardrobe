import { RawImage } from "@huggingface/transformers";
import { segmentClothes } from "../lib/segment-clothes.js";
self.onmessage = async ({ data }) => {
  try {
    const image = await RawImage.read(data.photo);
    const regions = await segmentClothes(
      image,
      (message) => self.postMessage({ type: "progress", message }),
      data.category,
    );
    self.postMessage({ type: "result", regions });
  } catch (error) {
    console.error("Clothing segmentation failed", error);
    self.postMessage({
      type: "error",
      message:
        "Automatic selection could not finish. Check your internet connection for the first model download, retry, or draw boxes around the clothes yourself.",
    });
  }
};
