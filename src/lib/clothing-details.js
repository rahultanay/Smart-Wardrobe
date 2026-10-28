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
        ? ["Unknown", "Plain T-shirt", "Graphic T-shirt"]
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

export function automaticStyles(item) {
  const type = item.details?.garmentType || "Unknown";
  if (type !== "Unknown") return suggestedStyles(item.category, item.details);
  if (item.category === "Shirt") return ["Semi-formal", "Casual"];
  if (item.category === "Pants" || item.category === "Shoes")
    return ["Semi-formal", "Casual", "Traditional"];
  return suggestedStyles(item.category, item.details);
}
export function formalEligible(item) {
  return ({ Pants: "Dress trousers", Shirt: "Dress shirt", Shoes: "Dress shoes" })[item.category] === item.details?.garmentType && ["Pants", "Shirt", "Shoes"].includes(item.category);
}
export function effectiveStyles(item) {
  return unrestrictedStyles(item).filter(style => style !== "Formal" || formalEligible(item));
}
function unrestrictedStyles(item) {
  if (item.details?.styleMode === "manual") return item.styles || [];
  if (item.details?.styleMode === "auto") return automaticStyles(item);
  // Legacy explicit multi-style choices are retained; a lone Casual was the old default.
  if (
    item.styles?.length &&
    !(item.styles.length === 1 && item.styles[0] === "Casual")
  )
    return item.styles;
  return automaticStyles(item);
}
export function lookStyleScore(top, pants, style) {
  const neutral = new Set(["White", "Black", "Grey", "Navy", "Beige", "Brown"]);
  const light = (item) => {
    const hex = item.details?.hex;
    return hex
      ? [1, 3, 5].reduce(
          (sum, k) => sum + parseInt(hex.slice(k, k + 2), 16),
          0,
        ) / 3
      : ({ White: 235, Black: 35, Grey: 145, Navy: 55, Blue: 135, Beige: 190 }[
          item.color
        ] ?? 130);
  };
  const contrast = Math.abs(light(top) - light(pants));
  if (style === "Formal")
    return (
      (neutral.has(top.color) ? 4 : 0) +
      (neutral.has(pants.color) ? 5 : 0) +
      (contrast > 65 ? 5 : 0) +
      (light(pants) < 125 ? 3 : 0) +
      (top.pattern === "Solid" || top.pattern === "Striped" ? 2 : top.pattern === "Checked" ? 1 : top.pattern === "Printed" ? -4 : 0) +
      (pants.pattern === "Solid" ? 2 : -3)
    );
  if (style === "Semi-formal")
    return (
      (neutral.has(pants.color) ? 3 : 0) +
      (contrast > 40 ? 3 : 0) +
      (top.category === "Shirt" ? 2 : 0)
    );
  return (
    (top.color !== pants.color ? 2 : 0) +
    (top.category === "T-shirt" || top.category === "Hoodie" ? 3 : 0) +
    (contrast < 65 ? 2 : 0)
  );
}
