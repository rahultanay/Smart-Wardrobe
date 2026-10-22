import test from "node:test";
import assert from "node:assert/strict";
import {
  clampBox,
  boxFromPoints,
  detectionRegions,
  MAX_PIECES,
} from "../src/lib/bulk-regions.js";
const detection = (xmin, ymin, xmax, ymax, score = 0.8) => ({
  box: { xmin, ymin, xmax, ymax },
  score,
});
test("crop coordinates stay inside the photo and reverse drags work", () => {
  assert.deepEqual(clampBox({ x: -1, y: 0.9, w: 4, h: 4 }), {
    x: 0,
    y: 0.9,
    w: 1,
    h: 1 - 0.9,
  });
  const b = boxFromPoints({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.3 });
  assert.ok(Math.abs(b.w - 0.6) < 1e-8);
  assert.equal(b.x, 0.2);
  const bad = clampBox({ x: NaN, y: Infinity, w: NaN, h: -10 });
  assert.ok(Object.values(bad).every(Number.isFinite));
});
test("rejects low quality, full-image, tiny, and malformed detections", () => {
  const results = detectionRegions(
    [
      detection(10, 10, 30, 30, 0.1),
      detection(0, 0, 100, 100),
      detection(1, 1, 2, 2),
      detection(NaN, 0, 20, 20),
      { box: {}, score: 0.9 },
    ],
    100,
    100,
  );
  assert.equal(results.length, 0);
});
test("deduplicates overlapping detections and keeps separate garments", () => {
  const result = detectionRegions(
    [
      detection(10, 10, 35, 70),
      detection(11, 11, 36, 71, 0.7),
      detection(55, 20, 85, 75),
    ],
    100,
    100,
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].box.x, 0.1);
  assert.equal(result[1].box.x, 0.55);
});
test("caps proposals to prevent unbounded imports", () => {
  const boxes = Array.from({ length: 30 }, (_, i) =>
    detection(
      (i % 6) * 100,
      Math.floor(i / 6) * 100,
      (i % 6) * 100 + 50,
      Math.floor(i / 6) * 100 + 50,
    ),
  );
  assert.equal(detectionRegions(boxes, 600, 500).length, MAX_PIECES);
});

// Moving must preserve dimensions at every edge; resizing cannot invert a box.
test("dragging boxes preserves their size and stays within the photo", async () => {
  const { transformBox } = await import("../src/lib/bulk-regions.js");
  const box = { x: 0.2, y: 0.2, w: 0.3, h: 0.4 };
  assert.deepEqual(transformBox(box, 2, 2), { x: 0.7, y: 0.6, w: 0.3, h: 0.4 });
  assert.deepEqual(transformBox(box, -2, -2), { x: 0, y: 0, w: 0.3, h: 0.4 });
  for (const handle of ["nw", "ne", "sw", "se"]) {
    const b = transformBox(box, 2, -2, handle);
    assert.ok(
      b.w >= 0.019999 &&
        b.h >= 0.019999 &&
        b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.w <= 1.000001 &&
        b.y + b.h <= 1.000001,
    );
  }
});
test("quarter-turn crop rotation swaps dimensions and wraps correctly", async () => {
  const { rotationLayout } = await import("../src/lib/bulk-regions.js");
  assert.deepEqual(rotationLayout(150, 300, 90), {
    angle: 90,
    width: 300,
    height: 150,
  });
  assert.deepEqual(rotationLayout(150, 300, -90), {
    angle: 270,
    width: 300,
    height: 150,
  });
  assert.deepEqual(rotationLayout(150, 300, 180), {
    angle: 180,
    width: 150,
    height: 300,
  });
  assert.deepEqual(rotationLayout(150, 300, 360), {
    angle: 0,
    width: 150,
    height: 300,
  });
});
