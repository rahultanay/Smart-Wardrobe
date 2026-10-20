import { useState } from "react";
import { OCCASIONS } from "../lib/wardrobe.js";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
export default function WearForm({ outfit, occasion, onClose, onSave }) {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [where, setWhere] = useState(occasion),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        itemIds: outfit.items.map((i) => i.id),
        occasion: where,
        wornAt: new Date(time).toISOString(),
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal title="A look to remember" onClose={() => !busy && onClose()}>
      <form className="item-form" onSubmit={submit}>
        <div className="mini-outfit">
          {outfit.items.map((i) => (
            <img key={i.id} src={i.photo} alt={i.name} />
          ))}
        </div>
        <p>{outfit.items.map((i) => i.name).join(" + ")}</p>
        <label>
          Occasion
          <select value={where} onChange={(e) => setWhere(e.target.value)}>
            {OCCASIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label>
          When did you wear it?
          <input
            type="datetime-local"
            value={time}
            required
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <p className="hint">
          Items stay available until you mark them for laundry.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "Recording…" : "Record this outfit"}
          <Icon name="check" />
        </button>
      </form>
    </Modal>
  );
}
