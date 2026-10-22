import { useEffect, useMemo, useRef, useState } from "react";
import {
  DRESS_STYLES,
  OCCASIONS,
  roleOf,
  itemStyles,
  fitsContext,
  recommend,
  lastWear,
  ago,
} from "../lib/wardrobe.js";
import Icon from "./Icon.jsx";
const descriptions = {
  Formal: "Polished shirts, dress-ready pants, and suitable shoes.",
  "Semi-formal": "Smart shirts or suitable T-shirts, with a relaxed finish.",
  Casual: "Everyday shirts, T-shirts, and hoodies. Easy combinations.",
  Traditional: "Traditional tops with bottoms and shoes tagged to match.",
};
export default function OutfitMaker({
  items,
  history,
  occasion,
  setOccasion,
  dressStyle,
  setDressStyle,
  anchor,
  setAnchor,
  preferred,
  connected,
  loading,
  pending,
  onWear,
  onAdd,
  onEdit,
}) {
  const [picker, setPicker] = useState("Top"),
    [index, setIndex] = useState(0),
    [limit, setLimit] = useState(6);
  const [generated, setGenerated] = useState("");
  const contextKey = `${dressStyle}|${occasion}|${anchor}`;
  const hasGenerated = generated === contextKey || !!anchor;
  const pickerRef = useRef();
  const active = items.filter((i) => !i.archived),
    available = active.filter((i) => !i.laundry);
  const eligible = available.filter((i) =>
    fitsContext(i, occasion, dressStyle),
  );
  const looks = useMemo(
    () =>
      hasGenerated
        ? recommend(items, history, occasion, anchor, preferred, dressStyle)
        : [],
    [items, history, occasion, anchor, preferred, dressStyle, hasGenerated],
  );
  const signature = looks.map((o) => o.key).join(",");
  useEffect(() => {
    setIndex(0);
    setLimit(6);
  }, [signature, anchor, occasion, dressStyle]);
  const selected = looks[index % Math.max(1, looks.length)];
  const anchorItem = items.find((i) => i.id === anchor);
  const candidates = eligible.filter((i) => roleOf(i) === picker);
  const missing = ["Top", "Pants"].filter(
    (role) => !eligible.some((i) => roleOf(i) === role),
  );
  function changePiece(role) {
    setPicker(role);
    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="outfit-maker">
      <section className="maker-context" aria-labelledby="maker-heading">
        <div>
          <p className="eyebrow">01 · HOW DO YOU WANT TO DRESS?</p>
          <h2 id="maker-heading">What do you want to wear?</h2>
        </div>
        <div className="style-options">
          {DRESS_STYLES.map((style) => (
            <button
              key={style}
              className={dressStyle === style ? "selected" : ""}
              aria-pressed={dressStyle === style}
              onClick={() => setDressStyle(style)}
            >
              <span>
                {style === "Formal"
                  ? "01"
                  : style === "Semi-formal"
                    ? "02"
                    : style === "Casual"
                      ? "03"
                      : "04"}
              </span>
              <strong>{style}</strong>
              <small>{descriptions[style]}</small>
              {dressStyle === style && <Icon name="check" size={17} />}
            </button>
          ))}
        </div>
        <label className="maker-occasion">
          <span>
            <span className="eyebrow">02 · WHERE ARE YOU GOING?</span>
            <strong>Choose the occasion</strong>
          </span>
          <select
            aria-label="Where are you going?"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          >
            {OCCASIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <button
          className="button primary full"
          disabled={loading || !connected || pending}
          onClick={() => setGenerated(contextKey)}
        >
          Generate outfits <Icon name="spark" size={18} />
        </button>
      </section>
      {hasGenerated ? (
        <>
          {anchorItem && (
            <div className="anchor-note maker-anchor">
              <img src={anchorItem.photo} alt="" />
              <span>
                Keeping <strong>{anchorItem.name}</strong> in every combination
              </span>
              <button onClick={() => setAnchor("")}>Choose freely ×</button>
            </div>
          )}
          {anchor &&
            (!anchorItem ||
              anchorItem.archived ||
              anchorItem.laundry ||
              !fitsContext(anchorItem, occasion, dressStyle)) && (
              <div className="maker-alert" role="status">
                <strong>Your selected piece doesn’t fit this selection.</strong>
                <p>
                  {anchorItem?.laundry
                    ? "It is currently in laundry."
                    : anchorItem?.archived
                      ? "It is archived."
                      : `Choose a different style or occasion, edit its tags, or clear your selected piece. We won’t replace it silently.`}
                </p>
                {anchorItem && (
                  <button
                    className="text-button"
                    onClick={() => onEdit(anchorItem)}
                  >
                    Edit its dress styles <Icon name="edit" size={16} />
                  </button>
                )}
              </div>
            )}
          {selected ? (
            <>
              <section className="outfit-panel">
                <div className="outfit-intro">
                  <span className="eyebrow">
                    {dressStyle.toUpperCase()} · {occasion.toUpperCase()}
                  </span>
                  <h2>
                    {anchorItem
                      ? "One favorite. More possibilities."
                      : "Your wardrobe, put together."}
                  </h2>
                  <p>{selected.reason}</p>
                  <div className="outfit-controls">
                    <button
                      className="button primary"
                      disabled={!connected || pending}
                      onClick={() => onWear(selected)}
                    >
                      Wear this <Icon name="check" size={18} />
                    </button>
                    <button
                      className="button subtle"
                      disabled={looks.length < 2}
                      onClick={() => setIndex((n) => (n + 1) % looks.length)}
                    >
                      Try another ↻
                    </button>
                  </div>
                  <span className="outfit-counter">
                    Combination {(index % looks.length) + 1} of {looks.length}
                    {looks.length === 30 ? " top suggestions" : ""}
                  </span>
                </div>
                <div className="outfit-pieces">
                  {selected.items.map((i) => (
                    <div
                      className={`outfit-piece silhouette-${roleOf(i).toLowerCase()}`}
                      key={i.id}
                    >
                      <div>
                        <img src={i.photo} alt={i.name} />
                      </div>
                      <span className="eyebrow">
                        {anchor === i.id ? "YOUR SELECTED PIECE" : i.category}
                      </span>
                      <h3>{i.name}</h3>
                      <p className="hint">
                        {i.details?.shade || i.color} ·{" "}
                        {i.details?.fit || "Unknown"} fit
                      </p>
                      <p>
                        {lastWear(history, i.id)
                          ? `${ago(lastWear(history, i.id).wornAt)} · ${lastWear(history, i.id).occasion}`
                          : "Not worn yet"}
                      </p>
                      <button
                        className="piece-change"
                        onClick={() => changePiece(roleOf(i))}
                      >
                        Choose{" "}
                        {roleOf(i) === "Top"
                          ? "another top"
                          : roleOf(i) === "Pants"
                            ? "other pants"
                            : "other shoes"}{" "}
                        <Icon name="arrow" size={13} />
                      </button>
                    </div>
                  ))}
                  {selected.items.length === 2 && (
                    <div className="outfit-piece missing-shoes">
                      <Icon name="plus" size={25} />
                      <h3>No suitable shoes yet</h3>
                      <p>
                        Your top-and-pants look is ready. Add or tag shoes for{" "}
                        {dressStyle.toLowerCase()}.
                      </p>
                      <button className="piece-change" onClick={onAdd}>
                        Add shoes
                      </button>
                    </div>
                  )}
                </div>
              </section>
              {selected.prior && (
                <div className="repeat-note">
                  <Icon name="history" />
                  <div>
                    <strong>A familiar favorite.</strong>
                    <p>
                      Last worn {ago(selected.prior.wornAt).toLowerCase()} for{" "}
                      {selected.prior.occasion}. Your history stays with every
                      piece.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <section className="outfit-empty">
              <Icon name="spark" size={36} />
              <h2>
                {loading
                  ? "Opening your wardrobe…"
                  : !active.length
                    ? "Good outfits start with your own clothes."
                    : "Let’s find the right pieces."}
              </h2>
              <p>
                {!active.length
                  ? "Add a shirt or T-shirt and pants. Shoes can be added to complete the look."
                  : anchor
                    ? "Your selected piece must be available and suit this dress style and occasion."
                    : `No ${dressStyle.toLowerCase()} combination for ${occasion.toLowerCase()} yet. ${missing.length ? `Missing suitable ${missing.map((r) => (r === "Top" ? "tops" : "pants")).join(" and ")}.` : ""} Edit “Dress styles” on your existing clothes or add suitable pieces.`}
              </p>
              <div className="outfit-controls">
                <button
                  className="button primary"
                  disabled={!connected}
                  onClick={onAdd}
                >
                  Add clothing <Icon name="plus" size={17} />
                </button>
                {anchor && (
                  <button
                    className="button outline"
                    onClick={() => setAnchor("")}
                  >
                    Clear selected piece
                  </button>
                )}
              </div>
            </section>
          )}
          <section className="maker-picker section" ref={pickerRef}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">03 · OPTIONAL — START WITH A PIECE</p>
                <h2>
                  {anchorItem
                    ? "Switch your starting piece"
                    : "Have a favorite in mind?"}
                </h2>
              </div>
              {anchor && (
                <button className="text-button" onClick={() => setAnchor("")}>
                  Clear selection ×
                </button>
              )}
            </div>
            <p className="section-description">
              Pick a shirt or T-shirt to see matching pants, or start with pants
              to find suitable tops. Only pieces tagged for{" "}
              {dressStyle.toLowerCase()} and {occasion.toLowerCase()} appear.
            </p>
            <div className="tabs maker-tabs">
              {["Top", "Pants", "Shoes"].map((role) => (
                <button
                  key={role}
                  className={picker === role ? "selected" : ""}
                  aria-pressed={picker === role}
                  onClick={() => setPicker(role)}
                >
                  {role === "Top" ? "Shirts & tops" : role}{" "}
                  <span>
                    {eligible.filter((i) => roleOf(i) === role).length}
                  </span>
                </button>
              ))}
            </div>
            {candidates.length ? (
              <div className="anchor-picker">
                {candidates.map((i) => (
                  <button
                    key={i.id}
                    className={anchor === i.id ? "selected" : ""}
                    aria-pressed={anchor === i.id}
                    onClick={() => setAnchor(anchor === i.id ? "" : i.id)}
                  >
                    <img src={i.photo} alt="" />
                    <span>
                      {i.name}
                      <small>
                        {i.category} · {i.details?.shade || i.color} ·{" "}
                        {i.details?.fit || "Unknown"} fit
                      </small>
                    </span>
                    {anchor === i.id ? (
                      <Icon name="check" size={17} />
                    ) : (
                      <Icon name="plus" size={16} />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="small-empty">
                No suitable {picker === "Top" ? "tops" : picker.toLowerCase()}{" "}
                for this selection. Edit the dress-style tags on your wardrobe
                items.
              </div>
            )}
            {available.length > 0 && eligible.length < available.length && (
              <details className="maker-tag-help">
                <summary>Some of my clothes are missing</summary>
                <p>
                  Older items start with a Casual tag. Use Edit to mark formal
                  shirts, smart trousers, or dress shoes appropriately.
                  Availability and occasion tags also apply.
                </p>
                <div>
                  {available
                    .filter((i) => !fitsContext(i, occasion, dressStyle))
                    .map((i) => (
                      <button key={i.id} onClick={() => onEdit(i)}>
                        {i.name}
                        <small>{itemStyles(i).join(" · ")}</small>
                        <Icon name="edit" size={14} />
                      </button>
                    ))}
                </div>
              </details>
            )}
          </section>
          {looks.length > 1 && (
            <section className="section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MORE WAYS TO WEAR WHAT YOU OWN</p>
                  <h2>
                    {anchorItem
                      ? `Combinations with ${anchorItem.name}`
                      : `${dressStyle} combinations`}
                  </h2>
                </div>
                <span className="hint">{looks.length} suggestions</span>
              </div>
              <div className="combination-grid">
                {looks.slice(0, limit).map((look, n) => (
                  <button
                    key={look.key}
                    className={`combination-card ${selected?.key === look.key ? "selected" : ""}`}
                    aria-pressed={selected?.key === look.key}
                    onClick={() => {
                      setIndex(n);
                      document
                        .querySelector(".outfit-panel")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                  >
                    <div className="combination-photos">
                      {look.items.map((i) => (
                        <img
                          className={`silhouette-${roleOf(i).toLowerCase()}`}
                          key={i.id}
                          src={i.photo}
                          alt={i.name}
                        />
                      ))}
                    </div>
                    <strong>
                      Combination {n + 1}
                      {selected?.key === look.key ? " · Selected" : ""}
                    </strong>
                    <span>{look.items.map((i) => i.name).join(" + ")}</span>
                    <small>
                      {look.items.length === 2
                        ? "Top + pants · shoes optional"
                        : `${dressStyle} · ${occasion}`}
                    </small>
                  </button>
                ))}
              </div>
              {limit < looks.length && (
                <button
                  className="button outline more-looks"
                  onClick={() => setLimit((n) => n + 6)}
                >
                  Show more combinations <Icon name="plus" size={16} />
                </button>
              )}
            </section>
          )}
        </>
      ) : (
        <p className="small-empty">
          Choose your style and occasion, then generate looks from your own
          wardrobe.
        </p>
      )}
    </div>
  );
}
