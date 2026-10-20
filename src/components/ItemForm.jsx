import { useState } from "react";
import {
  CATEGORIES,
  COLORS,
  PATTERNS,
  OCCASIONS,
  photoData,
} from "../lib/wardrobe.js";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
const emptyItem = {
  name: "",
  category: "Shirt",
  color: "White",
  pattern: "Solid",
  occasions: ["Everyday"],
  photo: "",
};
export default function ItemForm({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          name: item.name,
          category: item.category,
          color: item.color,
          pattern: item.pattern,
          occasions: item.occasions,
          photo: item.photo,
        }
      : emptyItem,
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
      setForm((f) => ({ ...f, ...result }));
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
      await onSave(form, item?.id);
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
          Item name
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="e.g. Blue linen shirt"
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => change("category", e.target.value)}
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
        <label>
          Pattern
          <select
            value={form.pattern}
            onChange={(e) => change("pattern", e.target.value)}
          >
            {PATTERNS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
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
          disabled={busy || !form.photo || !form.occasions.length}
        >
          {busy ? "Saving…" : item ? "Save changes" : "Add item"}
          <Icon name="check" />
        </button>
      </form>
    </Modal>
  );
}
