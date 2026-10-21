import { COLORS } from "./wardrobe.js";
import { clampBox } from "./bulk-regions.js";
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
  const bins = new Map();
  for (let y = 0; y < canvas.height; y += 3)
    for (let x = 0; x < canvas.width; x += 3) {
      const mask = region.mask;
      if (mask) {
        const mx = Math.min(
          mask.width - 1,
          Math.floor((box.x + (x / canvas.width) * box.w) * mask.width),
        );
        const my = Math.min(
          mask.height - 1,
          Math.floor((box.y + (y / canvas.height) * box.h) * mask.height),
        );
        if (!mask.data[my * mask.width + mx]) continue;
      } else if (
        x < canvas.width * 0.2 ||
        x > canvas.width * 0.8 ||
        y < canvas.height * 0.2 ||
        y > canvas.height * 0.8
      )
        continue;
      const p = (y * canvas.width + x) * 4;
      const rgb = [pixels.data[p], pixels.data[p + 1], pixels.data[p + 2]];
      const key = rgb.map((v) => Math.floor(v / 32)).join(",");
      const bin = bins.get(key) || { n: 0, sum: [0, 0, 0] };
      bin.n++;
      rgb.forEach((v, k) => (bin.sum[k] += v));
      bins.set(key, bin);
    }
  const dominant = [...bins.values()].sort((a, b) => b.n - a.n)[0];
  const rgb = dominant
    ? dominant.sum.map((v) => v / dominant.n)
    : [180, 180, 180];
  const color = Object.entries(COLORS).sort(
    (a, b) => distance(a[1], rgb) - distance(b[1], rgb),
  )[0][0];
  // Keep the real rectangular crop: no generated pixels or reconstructed hidden fabric.
  return { photo: canvas.toDataURL("image/jpeg", 0.85), color };
}
function distance(hex, rgb) {
  return rgb.reduce(
    (sum, v, k) =>
      sum + (v - parseInt(hex.slice(1 + k * 2, 3 + k * 2), 16)) ** 2,
    0,
  );
}
