// Pure geometry helpers shared by the clothing finder, editor, and tests.
export const MAX_PIECES = 24;
export function clampBox(box) {
  const x = Math.max(0, Math.min(0.98, Number(box.x) || 0));
  const y = Math.max(0, Math.min(0.98, Number(box.y) || 0));
  return {
    x,
    y,
    w: Math.max(0.02, Math.min(1 - x, Number(box.w) || 0.02)),
    h: Math.max(0.02, Math.min(1 - y, Number(box.h) || 0.02)),
  };
}
export function boxFromPoints(a, b) {
  return clampBox({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });
}
export function detectionRegions(detections, width, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return [];
  const chosen = [];
  for (const d of [...detections].sort((a, b) => b.score - a.score)) {
    if (
      !Number.isFinite(d.score) ||
      d.score < 0.28 ||
      !d.box ||
      ![d.box.xmin, d.box.ymin, d.box.xmax, d.box.ymax].every(Number.isFinite)
    )
      continue;
    const raw = {
      x: d.box.xmin / width,
      y: d.box.ymin / height,
      w: (d.box.xmax - d.box.xmin) / width,
      h: (d.box.ymax - d.box.ymin) / height,
    };
    if (raw.w < 0.025 || raw.h < 0.025 || raw.w * raw.h > 0.65) continue;
    const box = clampBox(raw);
    if (
      chosen.some((o) => {
        const b = o.box;
        const intersection =
          Math.max(
            0,
            Math.min(box.x + box.w, b.x + b.w) - Math.max(box.x, b.x),
          ) *
          Math.max(
            0,
            Math.min(box.y + box.h, b.y + b.h) - Math.max(box.y, b.y),
          );
        return intersection / (box.w * box.h + b.w * b.h - intersection) > 0.5;
      })
    )
      continue;
    chosen.push({ box, score: d.score });
    if (chosen.length === MAX_PIECES) break;
  }
  return chosen.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}
