import test from "node:test";
import assert from "node:assert/strict";
import { recommend, lastWear, daysAgo } from "../src/lib/wardrobe.js";
const item = (id, category, color = "White", extra = {}) => ({
  id,
  name: id,
  category,
  color,
  pattern: "Solid",
  occasions: ["Everyday"],
  laundry: false,
  archived: false,
  ...extra,
});
const closet = [
  item("shirt", "Shirt", "Blue"),
  item("pants", "Pants", "Beige"),
  item("shoes", "Shoes", "Brown"),
  item("party", "Shirt", "Black", { occasions: ["Party"] }),
];
test("builds only owned complete outfits and respects occasion tags", () => {
  const r = recommend(closet, [], "College");
  assert.equal(r.length, 1);
  assert.deepEqual(
    r[0].items.map((i) => i.id),
    ["shirt", "pants", "shoes"],
  );
});
test("laundry or archived items cannot be recommended, including an anchor", () => {
  for (const status of ["laundry", "archived"]) {
    const items = closet.map((i) =>
      i.id === "pants" ? { ...i, [status]: true } : i,
    );
    assert.deepEqual(recommend(items, [], "College"), []);
    assert.deepEqual(recommend(items, [], "College", "pants"), []);
  }
});
test("anchors all three categories", () => {
  for (const id of ["shirt", "pants", "shoes"])
    assert.ok(
      recommend(closet, [], "College", id).every((o) =>
        o.items.some((i) => i.id === id),
      ),
    );
  assert.deepEqual(recommend(closet, [], "College", "missing"), []);
});
test("last wear is item-based and can be filtered by occasion", () => {
  const history = [
    {
      id: "old",
      wornAt: "2026-10-15T04:00:00Z",
      occasion: "College",
      items: [{ id: "shirt", name: "old name" }],
    },
    {
      id: "new",
      wornAt: "2026-10-19T14:00:00Z",
      occasion: "Party",
      items: [{ id: "shirt", name: "new name" }],
    },
  ];
  assert.equal(lastWear(history, "shirt").id, "new");
  assert.equal(lastWear(history, "shirt", "College").id, "old");
  assert.equal(lastWear(history, "absent"), undefined);
});
test("elapsed dates use calendar days, including crossing midnight", () => {
  assert.equal(daysAgo(new Date(2026, 9, 15, 23), new Date(2026, 9, 20, 8)), 5);
  assert.equal(
    daysAgo(new Date(2026, 9, 19, 23, 59), new Date(2026, 9, 20, 0, 1)),
    1,
  );
});
test("ranking prioritizes less recently worn pieces", () => {
  const items = [...closet, item("fresh", "Shirt", "Blue")];
  const history = [
    {
      id: "recent",
      wornAt: new Date().toISOString(),
      occasion: "College",
      items: [{ id: "shirt" }, { id: "pants" }, { id: "shoes" }],
    },
  ];
  assert.equal(recommend(items, history, "College")[0].items[0].id, "fresh");
});
test("missing categories and empty wardrobes return no fabricated suggestions", () => {
  assert.deepEqual(recommend([], [], "College"), []);
  assert.deepEqual(recommend([closet[0]], [], "College"), []);
});
