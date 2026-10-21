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

const styled = (id, category, color, styles, extra = {}) =>
  item(id, category, color, { styles, ...extra });
const mixed = [
  styled("formal-shirt", "Shirt", "White", ["Formal", "Semi-formal", "Casual"]),
  styled("navy-shirt", "Shirt", "Navy", ["Formal", "Semi-formal"]),
  styled("tee", "T-shirt", "Blue", ["Casual", "Semi-formal"]),
  styled("hoodie", "Hoodie", "Grey", ["Casual"]),
  styled("kurta", "Traditional", "White", ["Traditional"]),
  styled("trousers", "Pants", "Beige", ["Formal", "Semi-formal", "Casual"]),
  styled("grey-pants", "Pants", "Grey", ["Formal", "Semi-formal", "Casual"]),
  styled("jeans", "Pants", "Blue", ["Casual"]),
  styled("traditional-bottoms", "Pants", "White", ["Traditional"]),
  styled("dress-shoes", "Shoes", "Brown", ["Formal", "Semi-formal"]),
  styled("sneakers", "Shoes", "White", ["Casual"]),
];
test("formal combinations exclude casual tops, jeans, and sneakers", () => {
  const looks = recommend(mixed, [], "Office", "", [], "Formal");
  assert.ok(looks.length >= 4);
  for (const look of looks) {
    assert.equal(look.dressStyle, "Formal");
    assert.equal(look.items[0].category, "Shirt");
    assert.ok(["trousers", "grey-pants"].includes(look.items[1].id));
    assert.equal(look.items[2].id, "dress-shoes");
  }
});
test("T-shirts work for casual and tagged semi-formal looks, never formal", () => {
  for (const style of ["Casual", "Semi-formal"]) {
    const looks = recommend(mixed, [], "Everyday", "tee", [], style);
    assert.ok(looks.length);
    assert.ok(looks.every((o) => o.items[0].id === "tee"));
  }
  assert.deepEqual(recommend(mixed, [], "Everyday", "tee", [], "Formal"), []);
});
test("pants anchor produces different compatible tops and stays in every outfit", () => {
  const looks = recommend(mixed, [], "Office", "trousers", [], "Semi-formal");
  assert.ok(new Set(looks.map((o) => o.items[0].id)).size >= 3);
  assert.ok(looks.every((o) => o.items[1].id === "trousers"));
});
test("selected shirt stays fixed while different pants are suggested", () => {
  const looks = recommend(mixed, [], "Office", "formal-shirt", [], "Formal");
  assert.ok(new Set(looks.map((o) => o.items[1].id)).size >= 2);
  assert.ok(looks.every((o) => o.items[0].id === "formal-shirt"));
});
test("occasion restrictions apply to anchors as well as other items", () => {
  const pieces = mixed.map((i) =>
    i.id === "tee" ? { ...i, occasions: ["Party"] } : i,
  );
  assert.deepEqual(recommend(pieces, [], "Office", "tee", [], "Casual"), []);
  assert.ok(recommend(pieces, [], "Party", "tee", [], "Casual").length);
});
test("top and pants suggestions do not require shoes", () => {
  const looks = recommend(
    mixed.filter((i) => i.category !== "Shoes"),
    [],
    "Office",
    "",
    [],
    "Formal",
  );
  assert.ok(looks.length);
  assert.ok(looks.every((o) => o.items.length === 2));
});
test("traditional looks use traditional tops and explicitly suitable bottoms", () => {
  const looks = recommend(mixed, [], "Party", "", [], "Traditional");
  assert.equal(looks.length, 1);
  assert.deepEqual(
    looks[0].items.map((i) => i.id),
    ["kurta", "traditional-bottoms"],
  );
});
test("old items default to casual and cannot accidentally enter formal suggestions", () => {
  assert.ok(recommend(closet, [], "Everyday", "", [], "Casual").length);
  assert.deepEqual(recommend(closet, [], "Everyday", "", [], "Formal"), []);
});
test("clothing alternatives appear before many shoe variants", () => {
  const shoes = Array.from({ length: 20 }, (_, n) =>
    styled(`shoe-${n}`, "Shoes", "Brown", ["Formal"]),
  );
  const looks = recommend(
    [...mixed, ...shoes],
    [],
    "Office",
    "formal-shirt",
    [],
    "Formal",
  );
  assert.notEqual(looks[0].items[1].id, looks[1].items[1].id);
  assert.ok(looks.length <= 30);
});
