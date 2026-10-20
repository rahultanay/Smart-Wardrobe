export const CATEGORIES = ["Shirt", "Pants", "Shoes"];
export const OCCASIONS = [
  "College",
  "Office",
  "Party",
  "Friends",
  "Date",
  "Everyday",
];
export const COLORS = {
  White: "#eeeae0",
  Black: "#303334",
  Grey: "#999c9c",
  Navy: "#253955",
  Blue: "#6685a6",
  Beige: "#c9b694",
  Brown: "#89644e",
  Green: "#6a8064",
  Red: "#a44e47",
  Pink: "#d0a0a0",
  Purple: "#8e7b9d",
  Yellow: "#d8ba60",
  Orange: "#ca8959",
};
export const PATTERNS = ["Solid", "Striped", "Checked", "Printed"];
const neutrals = new Set(["White", "Black", "Grey", "Navy", "Beige", "Brown"]);
const pairs = new Set([
  "Blue:Brown",
  "Blue:Orange",
  "Blue:Pink",
  "Blue:Yellow",
  "Green:Pink",
  "Green:Red",
  "Purple:Yellow",
]);
export function pairScore(a, b) {
  if (a.color === b.color) return 2;
  if (neutrals.has(a.color) || neutrals.has(b.color)) return 5;
  return pairs.has([a.color, b.color].sort().join(":")) ? 4 : 1;
}
export function lastWear(history, id, occasion) {
  return history
    .filter(
      (w) =>
        (!occasion || w.occasion === occasion) &&
        w.items.some((i) => i.id === id),
    )
    .sort((a, b) => Date.parse(b.wornAt) - Date.parse(a.wornAt))[0];
}
export function daysAgo(time, now = new Date()) {
  const d = new Date(time);
  return Math.max(
    0,
    Math.round(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
        86400000,
    ),
  );
}
export function ago(time) {
  const n = daysAgo(time);
  return n === 0 ? "Today" : n === 1 ? "Yesterday" : `${n} days ago`;
}
export function dateLabel(time) {
  return new Date(time).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
export function recommend(
  items,
  history,
  occasion,
  anchorId = "",
  preferred = [],
) {
  const latestById = new Map(),
    latestByKey = new Map();
  for (const wear of history) {
    for (const item of wear.items) {
      if (
        !latestById.has(item.id) ||
        Date.parse(latestById.get(item.id).wornAt) < Date.parse(wear.wornAt)
      )
        latestById.set(item.id, wear);
    }
    const key = wear.items
      .map((i) => i.id)
      .sort()
      .join("|");
    if (
      !latestByKey.has(key) ||
      Date.parse(latestByKey.get(key).wornAt) < Date.parse(wear.wornAt)
    )
      latestByKey.set(key, wear);
  }
  const available = items.filter((i) => !i.archived && !i.laundry);
  const anchor = available.find((i) => i.id === anchorId);
  if (anchorId && !anchor) return [];
  // An explicit occasion tag is respected; Everyday is an opt-in versatile tag.
  const groups = CATEGORIES.map((cat) =>
    available.filter(
      (i) =>
        i.category === cat &&
        (!anchor || anchor.category !== cat || i.id === anchor.id) &&
        (i.id === anchorId ||
          i.occasions.includes(occasion) ||
          i.occasions.includes("Everyday")),
    ),
  );
  if (groups.some((g) => !g.length)) return [];
  // Rank candidates before bounding work for large wardrobes. Include the anchor.
  const rank = (i) =>
    (i.occasions.includes(occasion) ? 4 : 0) +
    (preferred.includes(i.color) ? 2 : 0) +
    (anchor ? pairScore(anchor, i) : 0) -
    (latestById.has(i.id)
      ? Math.max(0, 7 - daysAgo(latestById.get(i.id).wornAt)) / 2
      : 0);
  groups.forEach((g) =>
    g.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id)),
  );
  const result = [];
  for (const shirt of groups[0].slice(0, 20))
    for (const pants of groups[1].slice(0, 20))
      for (const shoes of groups[2].slice(0, 20)) {
        const outfit = [shirt, pants, shoes];
        const matching =
          pairScore(shirt, pants) +
          pairScore(pants, shoes) +
          pairScore(shirt, shoes);
        const printPenalty =
          Math.max(0, outfit.filter((i) => i.pattern !== "Solid").length - 1) *
          3;
        const key = outfit
          .map((i) => i.id)
          .sort()
          .join("|");
        const prior = latestByKey.get(key);
        const score =
          matching +
          outfit.reduce((sum, i) => sum + rank(i), 0) -
          printPenalty -
          (prior ? Math.max(0, 10 - daysAgo(prior.wornAt)) : 0);
        const reason = neutrals.has(pants.color)
          ? `${pants.color} pants provide a neutral base for your ${shirt.color.toLowerCase()} shirt.`
          : `${shirt.color} and ${pants.color.toLowerCase()} create ${pairScore(shirt, pants) >= 4 ? "a balanced color pairing" : "an expressive color pairing"}.`;
        result.push({
          key,
          items: outfit,
          score,
          prior,
          reason: `${reason} ${printPenalty ? "Multiple patterns make this a bolder option." : "Patterns stay easy to combine."}`,
        });
      }
  return result
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, 30);
}
export async function api(path, method = "GET", body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(
      "Cannot reach your wardrobe. Start the backend, then retry. If a save timed out, refresh before retrying.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.message || `Request failed (${response.status}). Please retry.`,
    );
  return data;
}
export async function photoData(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo under 15 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo could not be read. Try a different image.");
  });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const photo = canvas.toDataURL("image/jpeg", 0.8);
  if (photo.length > 2000000)
    throw new Error("Photo is too detailed. Please crop it and try again.");
  // Sample the center to reduce background influence; this is only a suggestion.
  const pixels = ctx.getImageData(
    Math.floor(canvas.width * 0.3),
    Math.floor(canvas.height * 0.3),
    Math.max(1, Math.floor(canvas.width * 0.4)),
    Math.max(1, Math.floor(canvas.height * 0.4)),
  ).data;
  let rgb = [0, 0, 0],
    count = 0;
  for (let n = 0; n < pixels.length; n += 16) {
    for (let k = 0; k < 3; k++) rgb[k] += pixels[n + k];
    count++;
  }
  rgb = rgb.map((v) => v / count);
  const color = Object.entries(COLORS).sort(
    (a, b) => distance(a[1], rgb) - distance(b[1], rgb),
  )[0][0];
  return { photo, color };
}
function distance(hex, rgb) {
  return rgb.reduce(
    (s, v, k) => s + (v - parseInt(hex.slice(1 + k * 2, 3 + k * 2), 16)) ** 2,
    0,
  );
}
