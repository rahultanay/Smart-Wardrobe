// Image-text comparisons identify construction, not the garment's color.
export const GARMENT_LABELS = {
  Pants: {
    Jeans: 'denim jeans with visible stitching, patch back pockets and rivets',
    'Dress trousers': 'tailored formal suit trousers with smooth woven fabric, pressed creases and welt pockets',
    Chinos: 'casual cotton chino or khaki trousers',
    Joggers: 'sweatpants or joggers with an elastic waist or cuffs',
    Shorts: 'short pants ending above the knee',
    Unknown: 'unrecognizable clothing, patterned bedding or other objects',
  },
  Shirt: {
    'Dress shirt': 'a tailored formal button up dress shirt with a structured collar',
    'Casual shirt': 'a casual button up shirt, denim shirt, flannel shirt or relaxed overshirt',
    Unknown: 'a t-shirt, hoodie, unrecognizable clothing or bedding',
  },
  'T-shirt': {
    'Plain T-shirt': 'a plain t-shirt without a graphic print',
    'Graphic T-shirt': 'a t-shirt with a large graphic print or logo',
    Unknown: 'a button up shirt, hoodie, unrecognizable clothing or bedding',
  },
  Shoes: {
    'Dress shoes': 'formal leather oxford or derby dress shoes',
    Sneakers: 'casual sneakers or sports shoes',
    Sandals: 'sandals or flip flops',
    Unknown: 'unrecognizable clothing or other objects',
  },
};
export function interpretGarmentScores(category, results) {
  const labels = GARMENT_LABELS[category] || {};
  const ranked = results.map(r => ({ type: Object.keys(labels).find(k => labels[k] === r.label) || 'Unknown', score: r.score })).sort((a,b) => b.score-a.score);
  const best = ranked[0];
  let type = 'Unknown';
  if (best && Number.isFinite(best.score) && best.score >= .65 && best.score - (ranked[1]?.score || 0) >= .25) type = best.type;
  // A stricter gate for formal candidates. Similarity scores are not calibrated probabilities.
  if (['Dress trousers','Dress shirt','Dress shoes'].includes(type) && (best.score < .90 || best.score - (ranked[1]?.score || 0) < .65)) type = 'Unknown';
  if (category === 'Pants' && type === 'Dress trousers' && (ranked.find(r => r.type === 'Jeans')?.score || 0) > .03) type = 'Unknown';
  return { garmentType: type, typeSource: type === 'Unknown' ? 'image-uncertain' : 'image' };
}
