export const FITS = [
  "Unknown",
  "Skinny",
  "Slim",
  "Regular",
  "Relaxed",
  "Oversized",
];
export function typesFor(category) {
  return category === "Pants"
    ? ["Unknown", "Jeans", "Dress trousers", "Chinos", "Joggers", "Shorts"]
    : category === "Shirt"
      ? ["Unknown", "Dress shirt", "Casual shirt"]
      : category === "T-shirt"
        ? ["Plain T-shirt", "Graphic T-shirt"]
        : category === "Shoes"
          ? ["Unknown", "Dress shoes", "Sneakers", "Sandals"]
          : ["Unknown"];
}
export function suggestedStyles(category, details = {}) {
  const type = details.garmentType || "Unknown",
    fit = details.fit || "Unknown";
  if (category === "Traditional") return ["Traditional"];
  if (
    category === "Hoodie" ||
    type === "Joggers" ||
    type === "Shorts" ||
    type === "Graphic T-shirt" ||
    type === "Sneakers" ||
    type === "Sandals"
  )
    return ["Casual"];
  if (type === "Jeans") return ["Semi-formal", "Casual"];
  if (category === "T-shirt")
    return fit === "Oversized" || fit === "Relaxed"
      ? ["Casual"]
      : ["Semi-formal", "Casual"];
  if (
    type === "Dress shirt" ||
    type === "Dress trousers" ||
    type === "Dress shoes"
  )
    return ["Formal", "Semi-formal"];
  if (type === "Chinos" || type === "Casual shirt")
    return ["Semi-formal", "Casual"];
  return ["Casual"];
}
export function fitScore(top, pants, style) {
  const a = top.details?.fit,
    b = pants.details?.fit;
  if (!a || !b || a === "Unknown" || b === "Unknown") return 0;
  if ((a === "Oversized" || a === "Relaxed") && b === "Skinny") return -10;
  if (style === "Formal" && (a === "Oversized" || b === "Oversized")) return -8;
  if (a === "Oversized" && (b === "Regular" || b === "Relaxed")) return 3;
  return a === "Regular" || b === "Regular" ? 2 : 0;
}
export function shadeEstimate(rgb, color) {
  const [r, g, b] = rgb,
    light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const hex =
    "#" +
    rgb
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  let shade = light < 65 ? "Dark" : light > 175 ? "Light" : "Medium";
  if (color === "Black")
    shade =
      light < 32 ? "Jet black" : light < 65 ? "Soft black" : "Washed black";
  else if (color === "White")
    shade =
      Math.max(...rgb) - Math.min(...rgb) > 16
        ? "Ivory / cream"
        : light > 225
          ? "Bright white"
          : "Off-white";
  else if (color === "Blue" || color === "Navy")
    shade =
      light < 65
        ? "Deep navy"
        : light < 110
          ? "Dark blue"
          : light < 165
            ? "Mid blue"
            : "Light blue";
  else shade += ` ${color.toLowerCase()}`;
  return { shade, hex };
}
