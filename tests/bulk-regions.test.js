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
