import { FITS, typesFor, suggestedStyles } from "../lib/clothing-details.js";
export default function ClothingDetails({
  category,
  details = {},
  onChange,
  disabled = false,
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>Garment details</legend>
      <div className="form-grid">
        <label>
          Garment type
          <select
            value={details.garmentType || typesFor(category)[0]}
            onChange={(e) => {
              const next = { ...details, garmentType: e.target.value };
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
