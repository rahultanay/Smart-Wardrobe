import { analyzePixels } from './appearance.js';
import { shadeEstimate } from "./clothing-details.js";
import { COLORS } from "./wardrobe.js";
import { clampBox, rotationLayout } from "./bulk-regions.js";
export async function loadPhoto(photo) {
  const image = new Image();
  image.src = photo;
  await image.decode();
  return image;
}
export function cropPhoto(image, region) {
  const box = clampBox(region.box);
  const sw = Math.max(1, Math.round(box.w * image.naturalWidth)),
    sh = Math.max(1, Math.round(box.h * image.naturalHeight));
  const scale = Math.min(1, 800 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(
    image,
    box.x * image.naturalWidth,
    box.y * image.naturalHeight,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const {color,details} = analyzePixels(pixels.data,canvas.width,canvas.height);
  // Keep the real rectangular crop: no generated pixels or reconstructed hidden fabric.
  const layout = rotationLayout(canvas.width, canvas.height, region.rotation);
  if (!layout.angle)
    return {
      photo: canvas.toDataURL("image/jpeg", 0.85),
      color,
      details,
    };
  const rotated = document.createElement("canvas");
  rotated.width = layout.width;
  rotated.height = layout.height;
  const rotatedContext = rotated.getContext("2d");
  rotatedContext.fillStyle = "#f4f1e9";
  rotatedContext.fillRect(0, 0, rotated.width, rotated.height);
  rotatedContext.translate(rotated.width / 2, rotated.height / 2);
  rotatedContext.rotate((layout.angle * Math.PI) / 180);
  rotatedContext.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return {
    photo: rotated.toDataURL("image/jpeg", 0.85),
    color,
    details,
  };
}
function distance(hex, rgb) {
  return rgb.reduce(
    (sum, v, k) =>
      sum + (v - parseInt(hex.slice(1 + k * 2, 3 + k * 2), 16)) ** 2,
    0,
  );
}
