import { shadeEstimate } from './clothing-details.js';
export const APPEARANCE_VERSION = 'palette-v2';
export const PATTERN_LABELS = {
  Solid: 'plain solid color clothing fabric, possibly heathered texture or a small embroidered logo, without stripes or checks',
  Striped: 'clothing fabric with repeated parallel contrasting stripes',
  Checked: 'clothing fabric with a plaid, gingham or checkered grid pattern',
  Printed: 'clothing with floral, geometric, abstract or large graphic prints',
  Unknown: 'unclear clothing pattern or mostly a patterned bedsheet background',
};
export function patternDecision(results, repetition) {
  const ranked=[...results].sort((a,b)=>b.score-a.score), first=ranked[0];
  const name=Object.keys(PATTERN_LABELS).find(k=>PATTERN_LABELS[k]===first?.label);
  if(!first || !Number.isFinite(first.score) || !name || name==='Unknown')return 'Unknown';
  const margin=first.score-(ranked[1]?.score||0);
  if(name==='Striped')return first.score>=.5 && margin>=.25 && (repetition?.horizontal.repeated || repetition?.vertical.repeated) ? name:'Unknown';
  if(name==='Checked')return first.score>=.65 && margin>=.25 && repetition?.horizontal.repeated && repetition?.vertical.repeated ? name:'Unknown';
  return first.score >= (name==='Solid'?.55:.7) && margin>=.25 ? name:'Unknown';
}
export function rgbToHsl(rgb) {
  const [r,g,b]=rgb.map(v=>v/255), max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min, l=(max+min)/2;
  let h=0;
  if(d) h=(max===r ? (g-b)/d+(g<b?6:0) : max===g ? (b-r)/d+2 : (r-g)/d+4)*60;
  return [h,d?d/(1-Math.abs(2*l-1)):0,l];
}
export function colorFamily(rgb) {
  const [h,s,l]=rgbToHsl(rgb), max=Math.max(...rgb), min=Math.min(...rgb), chroma=max-min;
  const light=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  if(light<32 && chroma<18) return 'Black';
  if(chroma<20 || (s<.13 && light>50)) return light>205 ? 'White' : light<58 ? 'Black' : 'Grey';
  if(light>207 && s<.45) return 'White';
  if(h>=18 && h<65 && light>145 && s<.52) return 'Beige';
  if((h<65 || h>345) && light<130 && h<65) return 'Brown';
  if(h<15 || h>=345) return l>.64 ? 'Pink':'Red';
  if(h<42) return 'Orange';
  if(h<70) return 'Yellow';
  if(h<170) return 'Green';
  if(h<260) return light<90 ? 'Navy':'Blue';
  if(h<325) return 'Purple';
  return 'Pink';
}
const median = xs => [...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
export function analyzePixels(data,width,height,channels=4,region={x:.2,y:.2,w:.6,h:.6}) {
  const families=new Map(); let count=0;
  const step=Math.max(1,Math.floor(Math.sqrt(width*height/12000)));
  for(let y=Math.max(0,Math.floor(height*region.y));y<Math.min(height,height*(region.y+region.h));y+=step)
    for(let x=Math.max(0,Math.floor(width*region.x));x<Math.min(width,width*(region.x+region.w));x+=step) {
      const i=(y*width+x)*channels;
      if(channels===4 && data[i+3]<200) continue;
      const rgb=[data[i],data[i+1],data[i+2]];
      if(!rgb.every(Number.isFinite))continue;
      const family=colorFamily(rgb); const samples=families.get(family)||[];
      samples.push(rgb); families.set(family,samples); count++;
    }
  if(!count) return {color:'Grey',details:{hex:'#999999',shade:'Unclear',palette:'#999999',colorSource:APPEARANCE_VERSION,colorConfidence:'low'}};
  const ranked=[...families.entries()].sort((a,b)=>b[1].length-a[1].length);
  const [color,samples]=ranked[0];
  const rgb=[0,1,2].map(k=>median(samples.map(x=>x[k])));
  const dominantHex=shadeEstimate(rgb,color).hex;
  const palettes=[dominantHex,...extractAccents([...families.values()].flat(),rgb)].slice(0,3);
  return {color,details:{...shadeEstimate(rgb,color),palette:palettes.join(','),colorSource:APPEARANCE_VERSION,colorConfidence:samples.length/count>.65?'clear':'mixed'}};
}
export function manualColorDetails(color,hex) {
  const rgb=[1,3,5].map(k=>parseInt(hex.slice(k,k+2),16));
  return {...shadeEstimate(rgb,color),palette:hex,colorSource:'manual',colorConfidence:'confirmed'};
}
export function paletteOf(item) {
  return (item.details?.palette || item.details?.hex || '').split(',').filter(s=>/^#[a-f\d]{6}$/i.test(s));
}
export function patternCompatibility(a,b) {
  const known = i => ['Striped','Checked','Printed'].includes(i.pattern);
  if(a.pattern==='Unknown'||b.pattern==='Unknown')return -1;
  if(known(a)&&known(b))return -5;
  if(known(a)||known(b))return 3;
  return 1;
}
export function paletteHarmony(a,b) {
  const pa=paletteOf(a),pb=paletteOf(b);
  if(!pa.length||!pb.length)return 0;
  const rgb=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16));
  const [ha,sa,la]=rgbToHsl(rgb(pa[0])),[hb,sb,lb]=rgbToHsl(rgb(pb[0]));
  const delta=Math.min(Math.abs(ha-hb),360-Math.abs(ha-hb));
  let score=0;
  if(sa<.18||sb<.18)score=2;
  else if(delta<40)score=2;
  else if(delta>145 && (sa<.55||sb<.55))score=1;
  if(sa>.65&&sb>.65&&delta>65)score-=3;
  if(a.color===b.color && Math.abs(la-lb)>.18)score+=2;
  // Repeat an accent from a patterned garment in a plain companion.
  const patterned=['Striped','Checked','Printed'].includes(a.pattern)?pa.slice(1):['Striped','Checked','Printed'].includes(b.pattern)?pb.slice(1):[];
  const plain= a.pattern==='Solid'?pa[0]:b.pattern==='Solid'?pb[0]:null;
  if(plain && patterned.some(h=>colorFamily(rgb(h))===colorFamily(rgb(plain))))score+=2;
  return score;
}
// Repeated contrast along several fabric scanlines corroborates stripe predictions.
// Slow lighting gradients and folds are removed before testing periodicity.
export function fabricRepetition(data,width,height,channels=4) {
  function axis(vertical) {
    const n=128, lines=16; let best=0, amplitude=0;
    const signals=[];
    for(let line=0;line<lines;line++){
      const values=[];
      for(let j=0;j<n;j++) {
        const a=.22+.56*j/(n-1),b=.3+.4*line/(lines-1);
        const x=Math.min(width-1,Math.floor((vertical?b:a)*width)),y=Math.min(height-1,Math.floor((vertical?a:b)*height));
        const k=(y*width+x)*channels;values.push((.2126*data[k]+.7152*data[k+1]+.0722*data[k+2])/255);
      }
      const signal=values.map((v,j)=>{let total=0,count=0;for(let k=Math.max(0,j-12);k<=Math.min(n-1,j+12);k++){total+=values[k];count++;}return v-total/count;});
      signals.push(signal);amplitude+=Math.sqrt(signal.reduce((s,v)=>s+v*v,0)/n)/lines;
    }
    for(let lag=4;lag<=24;lag++){
      let corr=0;
      for(const signal of signals){let dot=0,a=0,b=0;for(let j=12;j<n-lag-12;j++){dot+=signal[j]*signal[j+lag];a+=signal[j]**2;b+=signal[j+lag]**2;}corr+=dot/Math.max(.000001,Math.sqrt(a*b))/lines;}
      best=Math.max(best,corr);
    }
    return {correlation:best,amplitude,repeated:best>.32&&amplitude>.025};
  }
  return {horizontal:axis(false),vertical:axis(true)};
}

function extractAccents(pixels,base) {
  const distance=(a,b)=>a.reduce((sum,v,k)=>sum+(v-b[k])**2,0);
  const bins=new Map();
  for(const rgb of pixels){const key=rgb.map(v=>Math.floor(v/24)).join(',');const bin=bins.get(key)||[];bin.push(rgb);bins.set(key,bin);}
  const groups=[...bins.values()].sort((a,b)=>b.length-a.length);
  const centers=[base];
  while(centers.length<4 && groups.length){
    const candidate=groups.reduce((best,g)=>{const rgb=g[Math.floor(g.length/2)];const score=Math.min(...centers.map(c=>distance(c,rgb)))*Math.sqrt(g.length);return score>best.score?{rgb,score}:best;},{score:0});
    if(!candidate.rgb || candidate.score<100)break;centers.push(candidate.rgb);
  }
  let clusters=[];
  for(let round=0;round<6;round++){
    clusters=centers.map(()=>[]);
    for(const rgb of pixels){let best=0;for(let k=1;k<centers.length;k++)if(distance(rgb,centers[k])<distance(rgb,centers[best]))best=k;clusters[best].push(rgb);}
    clusters.forEach((cluster,k)=>{if(cluster.length)centers[k]=[0,1,2].map(c=>median(cluster.map(p=>p[c])));});
  }
  const used=[base],result=[];
  for(const cluster of clusters.sort((a,b)=>b.length-a.length)){
    if(cluster.length/pixels.length<.07)continue;
    const rgb=[0,1,2].map(k=>median(cluster.map(p=>p[k])));
    if(used.some(c=>distance(c,rgb)<65**2))continue;
    used.push(rgb);result.push(shadeEstimate(rgb,'').hex);
  }
  return result;
}
