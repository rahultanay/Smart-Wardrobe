import { useEffect, useRef, useState } from "react";
import { GARMENT_LABELS } from "../lib/garment-labels.js";
import { detectGarment } from "../lib/garment-detector.js";
import { FITS, typesFor, suggestedStyles } from "../lib/clothing-details.js";
export default function ClothingDetails({
  category,
  photo,
  details = {},
  onChange,
  disabled = false,
}) {
  const [status, setStatus] = useState("");
  const latest = useRef({details, onChange});
  latest.current = {details, onChange};
  useEffect(() => {
    if (!photo || !GARMENT_LABELS[category] || details.typeSource || (details.garmentType && details.garmentType !== "Unknown")) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("Waiting for photo recognition… You can also choose the type yourself.");
      try {
        const result = await detectGarment(photo, category, message => !cancelled && setStatus(message));
        if (cancelled || !result || latest.current.details.typeSource === "manual") return;
        const next = {...latest.current.details, ...result};
        latest.current.onChange(next, next.styleMode === "manual" ? undefined : suggestedStyles(category, next));
        setStatus(result.garmentType === "Unknown" ? "Photo unclear — please choose a type. Unknown garments cannot appear in Formal." : `Photo suggests ${result.garmentType.toLowerCase()}. Correct it below if needed.`);
      } catch (error) { if (!cancelled) setStatus(error.message); }
    }, 900);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [photo, category, details.typeSource]);
  return (
    <fieldset disabled={disabled}>
      <legend>Garment details</legend>
      {status && <p role="status" className="hint">{status}</p>}
      {details.typeSource === "image" && <p className="hint">Type suggested from the photo. Please correct it if needed.</p>}
      {details.typeSource === "image-uncertain" && <p className="hint">The photo was unclear. Choose a garment type; this piece stays out of Formal until identified.</p>}
      {photo && details.typeSource && <button type="button" className="button subtle" onClick={() => onChange({...details,garmentType:"Unknown",typeSource:""})}>Check photo again</button>}
      <div className="form-grid">
        <label>
          Garment type
          <select
            value={details.garmentType || typesFor(category)[0]}
            onChange={(e) => {
              const next = { ...details, garmentType: e.target.value, typeSource: "manual" };
              onChange(next, suggestedStyles(category, next));
            }}
          >
            {typesFor(category).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Fit
          <select
            value={details.fit || "Unknown"}
            onChange={(e) => {
              const next = { ...details, fit: e.target.value };
              onChange(next, suggestedStyles(category, next));
            }}
          >
            {FITS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Shade (estimated)
          <input
            maxLength={60}
            value={details.shade || ""}
            placeholder="Estimated when saved"
            onChange={(e) => onChange({ ...details, shade: e.target.value })}
          />
        </label>
      </div>
      <p className="hint">
        Fit and garment type need your confirmation. Dress styles are suggested
        from these details; you can adjust them. Photo lighting can affect the
        shade estimate.
      </p>
    </fieldset>
  );
}
