import { useEffect, useRef, useState } from 'react';
import { detectAppearance } from '../lib/garment-detector.js';
import { analyzePixels, manualColorDetails, APPEARANCE_VERSION } from '../lib/appearance.js';
import { COLORS, PATTERNS } from '../lib/wardrobe.js';
export default function AppearanceDetails({photo,color,pattern,details={},onChange,disabled=false}) {
  const [status,setStatus]=useState(''),[pick,setPick]=useState(false),[retry,setRetry]=useState(0);
  const latest=useRef(); latest.current={details,onChange,disabled};
  useEffect(()=>{
    if(!photo || disabled || ((details.colorSource===APPEARANCE_VERSION||details.colorSource==='manual') && details.patternSource))return;
    let cancel=false;
    const timer=setTimeout(async()=>{
      setStatus('Checking fabric colours and pattern…');
      try {
        const result=await detectAppearance(photo,m=>!cancel&&setStatus(m));
        if(cancel||latest.current.disabled)return;
        const d=latest.current.details,patch={details:{...d}};
        if(d.colorSource!=='manual') {patch.color=result.color;Object.assign(patch.details,result.details);}
        if(d.patternSource!=='manual') {patch.pattern=result.pattern;patch.details.patternSource=result.patternSource;}
        latest.current.onChange(patch);
        setStatus(result.pattern==='Unknown'?'Pattern unclear — select it below. Colour is an estimate from the fabric area.':'Photo checked. Confirm colours and pattern against the actual garment.');
      }catch(e){if(!cancel)setStatus(e.message);}
    },900);
    return()=>{cancel=true;clearTimeout(timer);};
  },[photo,disabled,retry]);
  function sample(e) {
    const img=e.currentTarget,rect=img.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const result=analyzePixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,4,{x:Math.max(0,x-.025),y:Math.max(0,y-.025),w:.05,h:.05});
    onChange({color:result.color,details:{...details,...result.details,colorSource:'manual',colorConfidence:'confirmed'}});
    setPick(false);setStatus('Colour taken from the fabric area you selected.');
  }
  return <fieldset disabled={disabled} className="appearance-details"><legend>Colour & pattern</legend>
    {status&&<p className="hint" role="status">{status}</p>}
    <div className="form-grid"><label>Main colour<select value={color} onChange={e=>onChange({color:e.target.value,details:{...details,...manualColorDetails(e.target.value,COLORS[e.target.value])}})}>{Object.keys(COLORS).map(c=><option key={c}>{c}</option>)}</select></label>
    <label>Pattern<select value={pattern||'Unknown'} onChange={e=>onChange({pattern:e.target.value,details:{...details,patternSource:'manual'}})}>{PATTERNS.map(p=><option key={p}>{p}</option>)}</select></label></div>
    <div className="fabric-palette">{(details.palette||details.hex||'').split(',').filter(Boolean).map((hex,n)=><span key={n} style={{background:hex}} title={hex} aria-label={`Fabric colour ${hex}`} />)}<span>{details.shade||color}{details.colorConfidence==='mixed'?' · several colours detected':''}</span></div>
    <p className="hint">Lighting and bedsheets can affect estimates. Crop close to the garment, or pick a patch of fabric below. Small embroidery does not make an otherwise plain shirt a printed shirt.</p>
    {photo&&<><button type="button" className="button subtle" onClick={()=>setPick(!pick)}>{pick?'Close colour picker':'Pick fabric colour'}</button> <button type="button" className="button subtle" onClick={()=>{onChange({details:{...details,colorSource:'',patternSource:''}});setRetry(n=>n+1);}}>Recheck photo</button></>}
    {pick&&<><p className="hint">Click the main fabric colour, away from seams, shadows and the background.</p><img className="fabric-picker" src={photo} alt="Click fabric to sample its colour" onClick={sample}/></>}
  </fieldset>;
}
