import { useState } from "react";
import {
  CATEGORIES,
  COLORS,
  OCCASIONS,
  photoData,
  stylesForCategory,
  itemStyles,
} from "../lib/wardrobe.js";
import ClothingDetails from "./ClothingDetails.jsx";
import { suggestedStyles, typesFor } from "../lib/clothing-details.js";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
const emptyItem = {
  name: "",
  category: "Shirt",
  color: "White",
  pattern: "Solid",
  occasions: ["Everyday"],
  photo: "",
  styles: ["Casual"],
};
export default function ItemForm({
  item,
  initialStyle = "Casual",
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(
    item
      ? {
          name: item.name,
          category: item.category,
          color: item.color,
          pattern: item.pattern,
          occasions: item.occasions,
          photo: item.photo,
          styles: itemStyles(item),
          details: {
            ...item.details,
            styleMode: item.details?.styleMode || "auto",
          },
        }
      : {
          ...emptyItem,
          category: initialStyle === "Traditional" ? "Traditional" : "Shirt",
          styles: [initialStyle],
          details: { styleMode: "auto" },
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photoNote, setPhotoNote] = useState("");
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function upload(file) {
    setBusy(true);
    setError("");
    try {
      const result = await photoData(file);
      setForm((f) => ({
        ...f,
        ...result,
        details: { ...f.details, ...result.details },
      }));
      setPhotoNote(
        "Color estimated from the center of your photo. Please confirm it below.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          ...form,
          name:
            form.name.trim() || `${form.color} ${form.category.toLowerCase()}`,
        },
        item?.id,
      );
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item ? "Edit wardrobe item" : "Add to your wardrobe"}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit} className="item-form">
        <label className={`upload-zone ${form.photo ? "has-photo" : ""}`}>
          {form.photo ? (
            <img src={form.photo} alt="Clothing preview" />
          ) : (
            <>
              <Icon name="plus" size={30} />
              <strong>Give your clothes a place here</strong>
              <span>Choose a photo · JPEG, PNG or WebP</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose clothing photo"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files[0]) upload(e.target.files[0]);
            }}
          />
          {form.photo && <span className="replace-photo">Change photo</span>}
        </label>
        {photoNote && <p className="hint">{photoNote}</p>}
        <label>
          Label (optional)
          <input
            autoFocus
            maxLength={80}
            placeholder={`Auto: ${form.color} ${form.category.toLowerCase()}`}
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => {
                const category = e.target.value;
                const options = stylesForCategory(category);
                const styles = form.styles.filter((s) => options.includes(s));
                setForm((f) => ({
                  ...f,
                  category,
                  details: { ...f.details, garmentType: typesFor(category)[0] },
                  styles: styles.length
                    ? styles
                    : [options.includes("Casual") ? "Casual" : options[0]],
                }));
              }}
            >
              {CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Main color
            <select
              value={form.color}
              onChange={(e) => change("color", e.target.value)}
            >
              {Object.keys(COLORS).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <ClothingDetails
          category={form.category}
          details={form.details || {}}
          onChange={(details, styles) =>
            setForm((f) => ({ ...f, details, ...(styles ? { styles } : {}) }))
          }
        />
        <label>
          <input
            type="checkbox"
            checked={form.details?.styleMode !== "manual"}
            onChange={(e) =>
              change("details", {
                ...form.details,
                styleMode: e.target.checked ? "auto" : "manual",
              })
            }
          />
          Choose dress styles automatically
        </label>
        <p className="hint">
          Automatic mode uses photo color and contrast, category, fit and
          garment type. Unknown construction stays provisional; confirm jeans
          versus dress trousers for reliable formal looks.
        </p>
        <fieldset>
          <legend>Dress styles (manual override)</legend>
          <div className="check-options">
            {stylesForCategory(form.category).map((style) => (
              <label key={style}>
                <input
                  type="checkbox"
                  checked={form.styles.includes(style)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      details: { ...f.details, styleMode: "manual" },
                    }));
                    change(
                      "styles",
                      e.target.checked
                        ? [...form.styles, style]
                        : form.styles.filter((s) => s !== style),
                    );
                  }}
                />
                {style}
              </label>
            ))}
          </div>
          <p className="hint">
            Choose where this piece fits: formal dress shoes, smart trousers,
            casual jeans, or a relaxed T-shirt. These tags guide outfit
            matching.
          </p>
        </fieldset>
        <fieldset>
          <legend>Wear it for</legend>
          <div className="check-options">
            {OCCASIONS.map((o) => (
              <label key={o}>
                <input
                  type="checkbox"
                  checked={form.occasions.includes(o)}
                  onChange={(e) =>
                    change(
                      "occasions",
                      e.target.checked
                        ? [...form.occasions, o]
                        : form.occasions.filter((x) => x !== o),
                    )
                  }
                />
                {o}
              </label>
            ))}
          </div>
          <p className="hint">
            Everyday items can be suggested for any occasion.
          </p>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          disabled={
            busy || !form.photo || !form.occasions.length || !form.styles.length
          }
        >
          {busy ? "Saving…" : item ? "Save changes" : "Add item"}
          <Icon name="check" />
        </button>
      </form>
    </Modal>
  );
}
