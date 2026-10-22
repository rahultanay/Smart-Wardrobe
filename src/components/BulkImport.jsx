import { useEffect, useRef, useState } from "react";
import ClothingDetails from "./ClothingDetails.jsx";
import { suggestedStyles, typesFor } from "../lib/clothing-details.js";
import {
  CATEGORIES,
  stylesForCategory as styleOptions,
} from "../lib/wardrobe.js";
import Modal from "./Modal.jsx";
import { COLORS, photoData, stylesForCategory } from "../lib/wardrobe.js";
import {
  MAX_PIECES,
  boxFromPoints,
  clampBox,
  transformBox,
} from "../lib/bulk-regions.js";
import { loadPhoto, cropPhoto } from "../lib/bulk-photo.js";
const groups = [
  ["Jeans / pants", "Pants"],
  ["Shirts", "Shirt"],
  ["T-shirts", "T-shirt"],
  ["Hoodies", "Hoodie"],
  ["Traditional wear", "Traditional"],
  ["Shoes", "Shoes"],
];
export default function BulkImport({ onClose, onSave }) {
  const [category, setCategory] = useState("Pants"),
    [styles, setStyles] = useState(["Casual"]);
  const [photo, setPhoto] = useState(""),
    [pieces, setPieces] = useState([]),
    [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [draw, setDraw] = useState(false),
    [draft, setDraft] = useState(null),
    [locked, setLocked] = useState(false);
  const source = useRef(),
    canvas = useRef(),
    start = useRef(),
    request = useRef(),
    operation = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function upload(file) {
    const job = ++operation.current;
    setBusy(true);
    setError("");
    setPieces([]);
    setSelected(null);
    setPhoto("");
    try {
      const result = await photoData(file, { maxSide: 2000 });
      const image = await loadPhoto(result.photo);
      if (!alive.current || job !== operation.current) return;
      source.current = image;
      setPhoto(result.photo);
      setBusy(false);
      setStatus(
        "Photo ready. Add a box, then drag it around a piece of clothing.",
      );
    } catch (e) {
      if (alive.current && job === operation.current) {
        setError(e.message);
        setBusy(false);
      }
    }
  }
  function update(id, patch) {
    setPieces((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function resize(piece, box) {
    const region = { ...piece, box: clampBox(box), mask: null };
    const crop = cropPhoto(source.current, region);
    update(piece.id, {
      ...region,
      ...crop,
      details: { ...piece.details, ...crop.details },
    });
  }
  function point(e) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  function addBox(box) {
    if (pieces.length >= MAX_PIECES) return;
    const region = {
      box: clampBox(box),
      id: crypto.randomUUID(),
      included: true,
      name: "",
      rotation: 0,
      category,
      styles: suggestedStyles(category),
      details: { fit: "Unknown", garmentType: typesFor(category)[0] },
    };
    setPieces((all) => [
      ...all,
      {
        ...region,
        ...cropPhoto(source.current, region),
        details: {
          ...region.details,
          ...cropPhoto(source.current, region).details,
        },
      },
    ]);
    setSelected(region.id);
    setDraw(false);
  }
  function rotate(piece, degrees) {
    const region = {
      ...piece,
      rotation: ((piece.rotation || 0) + degrees + 360) % 360,
    };
    update(piece.id, {
      ...region,
      photo: cropPhoto(source.current, region).photo,
    });
  }
  async function save(ids) {
    if (saving) return;
    setSaving(true);
    setLocked(true);
    setError("");
    if (!request.current) {
      const chosen = pieces.filter((p) => !p.saved && ids.includes(p.id));
      if (!chosen.length) {
        setSaving(false);
        setLocked(false);
        return;
      }
      request.current = {
        ids: chosen.map((p) => p.id),
        body: {
          requestId: crypto.randomUUID(),
          items: chosen.map((p) => ({
            name:
              p.name.trim() ||
              `${p.details?.shade || p.color} ${(p.category || category).toLowerCase()}`,
            category: p.category || category,
            details: p.details,
            color: p.color,
            pattern: "Solid",
            styles:
              p.styles || suggestedStyles(p.category || category, p.details),
            occasions: ["Everyday"],
            photo: p.photo,
          })),
        },
      };
    }
    try {
      await onSave(request.current.body);
      const savedIds = request.current.ids;
      setPieces((all) =>
        all.map((p) =>
          savedIds.includes(p.id) ? { ...p, saved: true, included: false } : p,
        ),
      );
      setStatus(
        `${savedIds.length} ${savedIds.length === 1 ? "piece saved" : "pieces saved"}. Add another box or finish when you’re done.`,
      );
      request.current = null;
      setLocked(false);
      setSaving(false);
    } catch (e) {
      setError(
        `${e.message} Retry this save below; the same pieces will not be added twice.`,
      );
      setSaving(false);
    }
  }
  function endGesture(e, cancel = false) {
    const gesture = start.current;
    if (!gesture) return;
    start.current = null;
    setDraft(null);
    if (gesture.id) {
      const piece = pieces.find((p) => p.id === gesture.id);
      resize(
        piece,
        cancel
          ? gesture.box
          : transformBox(
              gesture.box,
              point(e).x - gesture.point.x,
              point(e).y - gesture.point.y,
              gesture.handle,
            ),
      );
    } else if (!cancel) {
      const end = point(e);
      if (
        Math.abs(end.x - gesture.point.x) > 0.02 &&
        Math.abs(end.y - gesture.point.y) > 0.02
      )
        addBox(boxFromPoints(gesture.point, end));
    }
  }
  const current = pieces.find((p) => p.id === selected),
    count = pieces.filter((p) => p.included && !p.saved).length;
  return (
    <Modal title="Import a group photo" onClose={() => !saving && onClose()}>
      <div className="bulk-import">
        <p>
          One photo, several pieces. Add a box around each garment, rotate its
          preview if needed, and save it individually.
        </p>
        <fieldset disabled={busy || saving || locked}>
          <legend>What’s in this photo?</legend>
          <div className="bulk-categories">
            {groups.map(([label, value]) => (
              <button
                type="button"
                key={value}
                aria-pressed={category === value}
                className={category === value ? "selected" : ""}
                onClick={() => {
                  setCategory(value);
                  setStyles([
                    value === "Traditional" ? "Traditional" : "Casual",
                  ]);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="hint">
            This is the default for new boxes. Each box can have its own
            category, garment type, fit, and dress styles.
          </p>
        </fieldset>
        {!photo && (
          <label className="upload-zone">
            <strong>Choose a photo of your clothes</strong>
            <span>JPEG, PNG or WebP · up to 15 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose bulk clothing photo"
              disabled={busy}
              onChange={(e) => {
                if (e.target.files[0]) upload(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <p className="hint">
          Manual selection opens as soon as your photo is ready. No model
          download or automatic scan.
        </p>
        {status && (
          <p className="bulk-status" role="status">
            {status}
          </p>
        )}
        {busy && <p role="status">Opening your photo…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {photo && (
          <>
            <div className="bulk-toolbar">
              <button
                type="button"
                className="button outline"
                disabled={busy || locked || pieces.length >= MAX_PIECES}
                onClick={() => {
                  setDraw(!draw);
                  setDraft(null);
                }}
                aria-pressed={draw}
              >
                {draw ? "Cancel drawing" : "Draw a box"}
              </button>
              <button
                type="button"
                className="button outline"
                disabled={busy || locked || pieces.length >= MAX_PIECES}
                onClick={() => addBox({ x: 0.25, y: 0.25, w: 0.3, h: 0.4 })}
              >
                Add box
              </button>
            </div>
            <p className="hint">
              {draw
                ? "Drag across a piece to draw its crop."
                : "Drag a box to move it. Drag its corner handles to resize it. Rotation changes only that piece’s saved photo."}
            </p>
            <div
              className={`bulk-canvas ${draw ? "drawing" : ""}`}
              ref={canvas}
              onPointerDown={(e) => {
                if (busy || locked) return;
                const node = e.target.closest("[data-piece]");
                if (draw) {
                  start.current = { point: point(e) };
                  setDraft(boxFromPoints(point(e), point(e)));
                } else if (node) {
                  const piece = pieces.find((p) => p.id === node.dataset.piece);
                  if (!piece || piece.saved) return;
                  setSelected(piece.id);
                  start.current = {
                    id: piece.id,
                    box: { ...piece.box },
                    point: point(e),
                    handle: e.target.dataset.handle || "move",
                  };
                } else return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const gesture = start.current;
                if (!gesture) return;
                const pos = point(e);
                if (gesture.id)
                  update(gesture.id, {
                    box: transformBox(
                      gesture.box,
                      pos.x - gesture.point.x,
                      pos.y - gesture.point.y,
                      gesture.handle,
                    ),
                  });
                else setDraft(boxFromPoints(gesture.point, pos));
              }}
              onPointerUp={(e) => endGesture(e)}
              onPointerCancel={(e) => endGesture(e, true)}
            >
              <img
                src={photo}
                alt="Group photo with numbered clothing selections"
                draggable="false"
              />
              {pieces.map((p, n) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={draw || busy || locked || p.saved}
                  data-piece={p.id}
                  aria-label={`Select piece ${n + 1}`}
                  className={`bulk-box ${selected === p.id ? "active" : ""} ${p.included ? "" : "excluded"}`}
                  style={{
                    left: `${p.box.x * 100}%`,
                    top: `${p.box.y * 100}%`,
                    width: `${p.box.w * 100}%`,
                    height: `${p.box.h * 100}%`,
                  }}
                  onClick={() => setSelected(p.id)}
                >
                  <span>
                    {n + 1}
                    {p.saved ? " ✓" : ""}
                  </span>
                  {!p.saved &&
                    selected === p.id &&
                    ["nw", "ne", "sw", "se"].map((corner) => (
                      <i
                        key={corner}
                        data-handle={corner}
                        className={`crop-handle ${corner}`}
                      />
                    ))}
                </button>
              ))}
              {draft && (
                <div
                  className="bulk-box active"
                  style={{
                    pointerEvents: "none",
                    left: `${draft.x * 100}%`,
                    top: `${draft.y * 100}%`,
                    width: `${draft.w * 100}%`,
                    height: `${draft.h * 100}%`,
                  }}
                />
              )}
            </div>
            {current && (
              <fieldset
                disabled={busy || locked || current.saved}
                className="bulk-editor"
              >
                <legend>Adjust piece {pieces.indexOf(current) + 1}</legend>
                <div className="bulk-toolbar">
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => rotate(current, -90)}
                  >
                    Rotate left ↶
                  </button>
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => rotate(current, 90)}
                  >
                    Rotate right ↷
                  </button>
                  <span>{current.rotation || 0}°</span>
                </div>
                <div className="bulk-toolbar">
                  <button type="button" onClick={() => rotate(current, -1)}>
                    −1°
                  </button>
                  <button type="button" onClick={() => rotate(current, 1)}>
                    +1°
                  </button>
                  <button type="button" onClick={() => rotate(current, -5)}>
                    −5°
                  </button>
                  <button type="button" onClick={() => rotate(current, 5)}>
                    +5°
                  </button>
                  <label>
                    Rotation (degrees)
                    <input
                      type="number"
                      step="1"
                      min="-360"
                      max="360"
                      value={current.rotation || 0}
                      onChange={(e) =>
                        rotate(
                          current,
                          Number(e.target.value) - (current.rotation || 0),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="bulk-coordinates">
                  {[
                    ["x", "Left"],
                    ["y", "Top"],
                    ["w", "Width"],
                    ["h", "Height"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label} (%)
                      <input
                        type="number"
                        min={key === "w" || key === "h" ? 2 : 0}
                        max={100}
                        step="1"
                        value={Math.round(current.box[key] * 100)}
                        onChange={(e) =>
                          resize(current, {
                            ...current.box,
                            [key]: Number(e.target.value) / 100,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setPieces((all) => all.filter((p) => p.id !== current.id));
                    setSelected(null);
                  }}
                >
                  Remove this selection
                </button>
              </fieldset>
            )}
            <div className="bulk-previews">
              {pieces.map((p, n) => (
                <article key={p.id} className={p.included ? "" : "excluded"}>
                  <button
                    type="button"
                    className="bulk-preview-image"
                    onClick={() => setSelected(p.id)}
                    disabled={busy || locked || p.saved}
                    aria-label={`Adjust crop ${n + 1}`}
                  >
                    <img src={p.photo} alt={`Clothing crop ${n + 1}`} />
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      disabled={busy || locked || p.saved}
                      checked={p.included}
                      onChange={(e) =>
                        update(p.id, { included: e.target.checked })
                      }
                    />{" "}
                    Include piece {n + 1}
                  </label>
                  <label>
                    Category
                    <select
                      disabled={busy || locked || p.saved}
                      value={p.category || category}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const details = {
                          ...p.details,
                          garmentType: typesFor(cat)[0],
                        };
                        update(p.id, {
                          category: cat,
                          details,
                          styles: suggestedStyles(cat, details),
                        });
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <ClothingDetails
                    category={p.category || category}
                    details={p.details}
                    disabled={busy || locked || p.saved}
                    onChange={(details, nextStyles) =>
                      update(p.id, {
                        details,
                        ...(nextStyles ? { styles: nextStyles } : {}),
                      })
                    }
                  />
                  <fieldset disabled={busy || locked || p.saved}>
                    <legend>Dress styles</legend>
                    {styleOptions(p.category || category).map((s) => (
                      <label key={s}>
                        <input
                          type="checkbox"
                          checked={(p.styles || []).includes(s)}
                          onChange={(e) =>
                            update(p.id, {
                              styles: e.target.checked
                                ? [...(p.styles || []), s]
                                : (p.styles || []).filter((x) => x !== s),
                            })
                          }
                        />
                        {s}
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Color
                    <select
                      disabled={busy || locked || p.saved}
                      value={p.color}
                      onChange={(e) => update(p.id, { color: e.target.value })}
                    >
                      {Object.keys(COLORS).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Label (optional)
                    <input
                      disabled={busy || locked || p.saved}
                      maxLength="80"
                      placeholder={`${p.color} ${category.toLowerCase()}`}
                      value={p.name}
                      onChange={(e) => update(p.id, { name: e.target.value })}
                    />
                  </label>
                  <div className="bulk-toolbar">
                    <button
                      type="button"
                      disabled={busy || locked || p.saved}
                      onClick={() => rotate(p, -90)}
                      aria-label={`Rotate piece ${n + 1} left`}
                    >
                      ↶ Rotate
                    </button>
                    <button
                      type="button"
                      disabled={busy || locked || p.saved}
                      onClick={() => rotate(p, 90)}
                      aria-label={`Rotate piece ${n + 1} right`}
                    >
                      Rotate ↷
                    </button>
                  </div>
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy || locked || p.saved || !p.styles?.length}
                    onClick={() => save([p.id])}
                  >
                    {p.saved ? "Saved ✓" : "Save this piece"}
                  </button>
                </article>
              ))}
            </div>
            <button
              type="button"
              className="button primary full"
              disabled={
                busy ||
                saving ||
                (!locked &&
                  (!count ||
                    pieces.some(
                      (p) => p.included && !p.saved && !p.styles?.length,
                    )))
              }
              onClick={() =>
                save(
                  pieces
                    .filter((p) => p.included && !p.saved && p.styles?.length)
                    .map((p) => p.id),
                )
              }
            >
              {saving
                ? "Saving…"
                : locked
                  ? "Retry this save"
                  : `Save all ${count} selected pieces`}
            </button>
            {locked && (
              <p className="hint">
                Retry the pending save before editing more boxes. This prevents
                duplicates if the connection was interrupted.
              </p>
            )}
            <button
              type="button"
              className="button outline full"
              disabled={saving}
              onClick={onClose}
            >
              Done
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
