import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  COLORS,
  api,
  lastWear,
  ago,
  dateLabel,
} from "./lib/wardrobe.js";

import Icon from "./components/Icon.jsx";
import ItemForm from "./components/ItemForm.jsx";
import WearForm from "./components/WearForm.jsx";
import Modal from "./components/Modal.jsx";
import OutfitMaker from "./components/OutfitMaker.jsx";
function App() {
  const [items, setItems] = useState([]),
    [history, setHistory] = useState([]),
    [loading, setLoading] = useState(true),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [view, setView] = useState("outfits"),
    [occasion, setOccasion] = useState("Everyday"),
    [dressStyle, setDressStyle] = useState("Casual"),
    [anchor, setAnchor] = useState(""),
    [category, setCategory] = useState("All"),
    [search, setSearch] = useState(""),
    [showArchive, setShowArchive] = useState(false),
    [modal, setModal] = useState(null),
    [pending, setPending] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem("wardrobePreferences") || "{}");
      return {
        name: typeof p.name === "string" ? p.name.slice(0, 40) : "",
        colors: Array.isArray(p.colors)
          ? p.colors.filter((c) => COLORS[c])
          : [],
      };
    } catch {
      return { name: "", colors: [] };
    }
  });
  const importRef = useRef();
  async function refresh() {
    setError("");
    try {
      const data = await api("/backup");
      setItems(data.items);
      setHistory(data.history);
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const active = items.filter((i) => !i.archived),
    available = active.filter((i) => !i.laundry),
    laundry = active.filter((i) => i.laundry);
  const filtered = items.filter(
    (i) =>
      i.archived === showArchive &&
      (category === "All" || i.category === category) &&
      `${i.name} ${i.color} ${i.pattern}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const recentHistory = [...history].sort(
    (a, b) => Date.parse(b.wornAt) - Date.parse(a.wornAt),
  );
  const monthCount = history.filter((w) => {
    const d = new Date(w.wornAt),
      n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }).length;
  function navigate(next) {
    setView(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function mutation(path, method, body, message) {
    setPending(true);
    setError("");
    try {
      await api(path, method, body);
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  async function saveItem(form, id) {
    const saved = await api(
      id ? `/items/${id}` : "/items",
      id ? "PUT" : "POST",
      form,
    );
    setItems((all) =>
      id ? all.map((i) => (i.id === id ? saved : i)) : [saved, ...all],
    );
    setNotice(
      id
        ? "Item updated. Wear history preserved."
        : "A new addition to your wardrobe.",
    );
  }
  async function saveWear(data) {
    const saved = await api("/history", "POST", data);
    setHistory((h) => [saved, ...h]);
    setNotice("Outfit recorded. Your wear history is up to date.");
  }
  function pickItem(i) {
    setAnchor(i.id);
    setView("outfits");
    setNotice(`${i.name} selected. Showing combinations around it.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function backup() {
    setPending(true);
    try {
      const data = await api("/backup");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart-wardrobe-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Backup downloaded, including photos and history.");
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  async function restore(file) {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("Please choose a backup under 100 MB.");
      const data = JSON.parse(await file.text());
      const result = await api("/restore", "POST", data);
      await refresh();
      setNotice(
        `Restored ${result.itemsAdded} items and ${result.eventsAdded} wear records. Existing records were preserved.`,
      );
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "This is not a valid backup file."
          : e.message,
      );
    } finally {
      setPending(false);
      importRef.current.value = "";
    }
  }
  function preferenceChange(p) {
    setPreferences(p);
    try {
      localStorage.setItem("wardrobePreferences", JSON.stringify(p));
    } catch {
      setError(
        "Browser could not save your preferences. Allow local storage and try again.",
      );
    }
  }
  const nav = [
    ["overview", "spark", "Overview"],
    ["wardrobe", "wardrobe", "My wardrobe"],
    ["outfits", "spark", "Outfit maker"],
    ["laundry", "laundry", "Laundry"],
    ["history", "history", "Wear journal"],
  ];
  const titles = {
    overview: "A little less “what to wear?”",
    wardrobe: "Good clothes. All yours.",
    outfits: "Your next outfit starts here.",
    laundry: "A fresh start, on repeat.",
    history: "Every outfit has a story.",
    settings: "Make yourself at home.",
  };
  const subtitles = {
    overview: "Your wardrobe, thoughtfully put together.",
    wardrobe: "Photograph it. Organize it. Wear it your way.",
    outfits:
      "Choose how you want to dress. Build around a shirt, T-shirt, or pants.",
    laundry: "Keep track of what’s resting and what’s ready.",
    history: "Remember what you wore, when, and where.",
    settings: "Your preferences, your data, your wardrobe.",
  };
  function wardrobeCard(i) {
    const last = lastWear(history, i.id),
      same = lastWear(history, i.id, occasion);
    return (
      <article className="clothing-card" key={i.id}>
        <div className="clothing-photo">
          <img loading="lazy" src={i.photo} alt={i.name} />
          {i.archived ? (
            <span className="status-tag">Archived</span>
          ) : i.laundry ? (
            <span className="status-tag amber">In laundry</span>
          ) : (
            <span className="status-tag">Ready to wear</span>
          )}
          <button
            className="edit-photo icon-button"
            onClick={() => setModal({ type: "item", item: i })}
            aria-label={`Edit ${i.name}`}
          >
            <Icon name="edit" size={17} />
          </button>
        </div>
        <div className="clothing-details">
          <p className="eyebrow">
            {i.category}{" "}
            <span
              className="color-dot"
              style={{ background: COLORS[i.color] }}
            />{" "}
            {i.color}
          </p>
          <h3>{i.name}</h3>
          <p className="item-style-tags">
            {(i.styles || ["Casual"]).join(" · ")}
          </p>
          <p className="last-worn">
            {last ? `${ago(last.wornAt)} · ${last.occasion}` : "Not worn yet"}
          </p>
          {same && same.id !== last?.id && (
            <p className="hint">
              Last for {occasion}: {ago(same.wornAt)}
            </p>
          )}
          <div className="card-actions">
            {i.archived ? (
              <button
                disabled={pending}
                onClick={() =>
                  mutation(
                    `/items/${i.id}/archive`,
                    "PATCH",
                    { value: false },
                    "Item restored to your wardrobe.",
                  )
                }
              >
                Restore item <Icon name="back" size={16} />
              </button>
            ) : (
              <>
                <button
                  disabled={pending || i.laundry || !connected}
                  onClick={() => pickItem(i)}
                >
                  Style this <Icon name="arrow" size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={pending || !connected}
                  onClick={() =>
                    mutation(
                      `/items/${i.id}/laundry`,
                      "PATCH",
                      { value: !i.laundry },
                      i.laundry
                        ? "Fresh and ready to wear."
                        : "Item moved to laundry.",
                    )
                  }
                  aria-label={
                    i.laundry
                      ? `Return ${i.name} to wardrobe`
                      : `Mark ${i.name} for laundry`
                  }
                >
                  <Icon name={i.laundry ? "back" : "laundry"} size={18} />
                </button>
              </>
            )}
          </div>
          <button
            className="archive-link"
            onClick={() => setModal({ type: "details", item: i })}
          >
            Wear details
          </button>
          {!i.archived && (
            <button
              className="archive-link"
              disabled={pending}
              onClick={() =>
                mutation(
                  `/items/${i.id}/archive`,
                  "PATCH",
                  { value: true },
                  "Item archived. Its history is safe.",
                )
              }
            >
              Archive item
            </button>
          )}
        </div>
      </article>
    );
  }
  function outfitPanel() {
    return (
      <OutfitMaker
        items={items}
        history={history}
        occasion={occasion}
        setOccasion={setOccasion}
        dressStyle={dressStyle}
        setDressStyle={setDressStyle}
        anchor={anchor}
        setAnchor={setAnchor}
        preferred={preferences.colors}
        connected={connected}
        loading={loading}
        pending={pending}
        onWear={(outfit) => setModal({ type: "wear", outfit })}
        onAdd={() => setModal({ type: "item" })}
        onEdit={(item) => setModal({ type: "item", item })}
      />
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#overview"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            <Icon name="wardrobe" size={25} />
          </span>
          <span>
            thread<span className="brand-amp"> & </span>tone
            <small>YOUR EVERYDAY WARDROBE</small>
          </span>
        </a>
        <p className="nav-label">YOUR SPACE</p>
        <nav>
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {key === "laundry" && laundry.length > 0 && (
                <span className="nav-count">{laundry.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-spark">✦</span>
          <h3>
            Less deciding.
            <br />
            More living.
          </h3>
          <p>A little intention goes a long way.</p>
        </div>
        <button
          className={`settings-nav ${view === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Icon name="settings" /> Preferences & backup
        </button>
        <div className="sidebar-profile">
          <span>{preferences.name?.[0]?.toUpperCase() || "Y"}</span>
          <div>
            <strong>{preferences.name || "Your wardrobe"}</strong>
            <small>Personal collection</small>
          </div>
          <span
            className={`connection-dot ${connected ? "online" : ""}`}
            title={connected ? "Connected" : "Offline"}
          />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            YOUR SPACE <span>/</span>{" "}
            {view === "overview"
              ? "Overview"
              : view === "history"
                ? "Wear journal"
                : view === "outfits"
                  ? "Outfit maker"
                  : view === "settings"
                    ? "Preferences"
                    : view === "laundry"
                      ? "Laundry"
                      : "My wardrobe"}
          </div>
          <div className="topbar-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
            <span className="avatar">
              {preferences.name?.[0]?.toUpperCase() || "Y"}
            </span>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {view === "overview"
                  ? `HELLO${preferences.name ? `, ${preferences.name.toUpperCase()}` : ""} — MAKE IT A GOOD DAY`
                  : view === "outfits"
                    ? "A WARDROBE THAT WORKS TOGETHER"
                    : "THOUGHTFULLY, EVERY DAY"}
              </p>
              <h1>{titles[view]}</h1>
              <p>{subtitles[view]}</p>
            </div>
            {view !== "settings" && (
              <button
                className="button primary"
                disabled={!connected}
                onClick={() => setModal({ type: "item" })}
              >
                <Icon name="plus" size={18} /> Add item
              </button>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={refresh} disabled={pending}>
                Retry connection
              </button>
            </div>
          )}
          {!connected && !loading && (
            <p className="hint offline-note">
              Start the Java backend on port 8080 to load and save your
              collection. Your data stays in the project’s SQL database.
            </p>
          )}
          {notice && (
            <div className="toast" role="status">
              <Icon name="check" size={18} />
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <section className="stats">
                {[
                  ["wardrobe", active.length, "Pieces in your wardrobe"],
                  ["check", available.length, "Ready to wear"],
                  ["laundry", laundry.length, "Taking a laundry break"],
                  ["history", monthCount, "Looks worn this month"],
                ].map(([icon, num, label]) => (
                  <div className="stat" key={label}>
                    <div className="stat-top">
                      <Icon name={icon} />
                      <span className="eyebrow">{label}</span>
                    </div>
                    <strong>{loading ? "—" : num}</strong>
                  </div>
                ))}
              </section>
              {outfitPanel()}
              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">THE PIECES THAT MAKE YOU, YOU</p>
                    <h2>A peek into your wardrobe</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("wardrobe")}
                  >
                    View collection <Icon name="arrow" size={17} />
                  </button>
                </div>
                {active.length ? (
                  <div className="clothes-grid">
                    {active.slice(0, 4).map(wardrobeCard)}
                  </div>
                ) : (
                  <div className="small-empty">
                    Start with what you own. Add a few favorite pieces above.
                  </div>
                )}
              </section>
            </>
          )}
          {view === "wardrobe" && (
            <>
              <div className="collection-toolbar">
                <div className="tabs">
                  {["All", ...CATEGORIES].map((c) => (
                    <button
                      key={c}
                      className={category === c ? "selected" : ""}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                    >
                      {c === "All" ? "All pieces" : c}
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <Icon name="search" size={18} />
                  <input
                    aria-label="Search wardrobe"
                    placeholder="Find a piece…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="collection-meta">
                <span>
                  {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
                </span>
                <label>
                  <input
                    type="checkbox"
                    checked={showArchive}
                    onChange={(e) => setShowArchive(e.target.checked)}
                  />{" "}
                  Show archived items
                </label>
              </div>
              {filtered.length ? (
                <div className="clothes-grid">{filtered.map(wardrobeCard)}</div>
              ) : (
                <div className="outfit-empty">
                  <Icon name="wardrobe" size={36} />
                  <h2>
                    {showArchive
                      ? "Nothing tucked away."
                      : "A little room for your favorites."}
                  </h2>
                  <p>
                    {search
                      ? "No pieces match that search. Try another name or color."
                      : showArchive
                        ? "Archived clothes will stay here, with their history preserved."
                        : "Add your first item, or try a different category."}
                  </p>
                </div>
              )}
            </>
          )}
          {view === "outfits" && outfitPanel()}
          {view === "laundry" && (
            <>
              <div className="laundry-summary">
                <span className="laundry-symbol">
                  <Icon name="laundry" size={38} />
                </span>
                <div>
                  <h2>
                    {laundry.length}{" "}
                    {laundry.length === 1 ? "piece is" : "pieces are"} taking a
                    break.
                  </h2>
                  <p>
                    Return items when they’re clean and ready. Their wear
                    history stays with them.
                  </p>
                </div>
              </div>
              {laundry.length ? (
                <div className="laundry-list">
                  {laundry.map((i) => (
                    <article key={i.id}>
                      <img src={i.photo} alt={i.name} />
                      <div>
                        <h3>{i.name}</h3>
                        <p>
                          {i.category} ·{" "}
                          {lastWear(history, i.id)
                            ? `Last worn ${ago(lastWear(history, i.id).wornAt).toLowerCase()}`
                            : "No wear recorded"}
                        </p>
                      </div>
                      <button
                        className="button outline"
                        disabled={pending || !connected}
                        onClick={() =>
                          mutation(
                            `/items/${i.id}/laundry`,
                            "PATCH",
                            { value: false },
                            `${i.name} is ready to wear.`,
                          )
                        }
                      >
                        <Icon name="back" size={17} /> Back to wardrobe
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="outfit-empty">
                  <Icon name="check" size={36} />
                  <h2>All fresh. All ready.</h2>
                  <p>
                    Mark an item for laundry from your wardrobe or a journal
                    entry.
                  </p>
                  <button
                    className="button outline"
                    onClick={() => navigate("wardrobe")}
                  >
                    Go to wardrobe <Icon name="arrow" />
                  </button>
                </div>
              )}
            </>
          )}
          {view === "history" && (
            <>
              <div className="journal-info">
                <Icon name="history" />
                <p>
                  {history.length} recorded looks. Dates, occasions, and the
                  individual pieces — all in one place.
                </p>
              </div>
              {recentHistory.length ? (
                <div className="journal-list">
                  {recentHistory.map((w) => (
                    <article className="journal-entry" key={w.id}>
                      <div className="journal-heading">
                        <div>
                          <span className="occasion-badge">
                            {w.occasion} · {w.dressStyle || "Casual"}
                          </span>
                          <h2>{ago(w.wornAt)}</h2>
                          <p>{dateLabel(w.wornAt)}</p>
                        </div>
                        <Icon name="history" size={23} />
                      </div>
                      <div className="journal-pieces">
                        {w.items.map((wi) => {
                          const i = items.find((x) => x.id === wi.id);
                          return (
                            <div key={wi.id}>
                              {i && <img src={i.photo} alt={wi.name} />}
                              <div>
                                <strong>{wi.name}</strong>
                                <small>
                                  {wi.category}
                                  {i?.archived ? " · Archived" : ""}
                                </small>
                                {i && !i.archived && (
                                  <button
                                    disabled={
                                      pending || i.laundry || !connected
                                    }
                                    onClick={() =>
                                      mutation(
                                        `/items/${i.id}/laundry`,
                                        "PATCH",
                                        { value: true },
                                        `${i.name} moved to laundry.`,
                                      )
                                    }
                                  >
                                    {i.laundry
                                      ? "In laundry"
                                      : "Mark for laundry"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="outfit-empty">
                  <Icon name="history" size={36} />
                  <h2>Your next outfit starts the story.</h2>
                  <p>
                    Choose “Wear this” in the outfit maker to record your first
                    look.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => navigate("outfits")}
                  >
                    Find an outfit <Icon name="arrow" />
                  </button>
                </div>
              )}
            </>
          )}
          {view === "settings" && (
            <div className="settings-grid">
              <section className="settings-card">
                <span className="eyebrow">MAKE IT PERSONAL</span>
                <h2>Your everyday preferences</h2>
                <label>
                  Your name
                  <input
                    maxLength={40}
                    placeholder="What should we call you?"
                    value={preferences.name}
                    onChange={(e) =>
                      preferenceChange({ ...preferences, name: e.target.value })
                    }
                  />
                </label>
                <fieldset>
                  <legend>Colors you love wearing</legend>
                  <p className="hint">
                    An optional preference, used to gently prioritize
                    suggestions. Choose what feels good on you.
                  </p>
                  <div className="palette">
                    {Object.entries(COLORS).map(([name, color]) => (
                      <button
                        key={name}
                        className={
                          preferences.colors.includes(name) ? "selected" : ""
                        }
                        onClick={() =>
                          preferenceChange({
                            ...preferences,
                            colors: preferences.colors.includes(name)
                              ? preferences.colors.filter((c) => c !== name)
                              : [...preferences.colors, name],
                          })
                        }
                        aria-pressed={preferences.colors.includes(name)}
                      >
                        <span style={{ background: color }} />
                        {name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="hint">
                  There’s no single “Indian skin tone.” Your taste and
                  preferences guide these suggestions. Preferences are saved in
                  this browser.
                </p>
              </section>
              <section className="settings-card">
                <span className="eyebrow">KEEP YOUR COLLECTION CLOSE</span>
                <h2>Your data, safely kept</h2>
                <p>
                  Clothing photos and wear records are stored in the local SQL
                  database. Download a backup to keep a separate copy.
                </p>
                <button
                  className="button outline full"
                  disabled={pending || !connected}
                  onClick={backup}
                >
                  <Icon name="download" /> Download backup
                </button>
                <input
                  ref={importRef}
                  hidden
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => restore(e.target.files[0])}
                />
                <button
                  className="button outline full"
                  disabled={pending || !connected}
                  onClick={() => importRef.current.click()}
                >
                  <Icon name="back" /> Restore from backup
                </button>
                <p className="hint">
                  Restore adds missing records. It never replaces existing
                  records. Backup files include your personal photos; store them
                  privately.
                </p>
                <div className="connection-status">
                  <span
                    className={`connection-dot ${connected ? "online" : ""}`}
                  />
                  {connected
                    ? "Connected to your local wardrobe"
                    : "Backend unavailable"}
                </div>
                <p className="hint">
                  Personal, single-user edition. Keep the app on your own
                  computer. Preferences are browser-local and are not included
                  in the wardrobe backup.
                </p>
              </section>
            </div>
          )}
          <footer>
            <span>thread & tone</span>
            <p>A little intention. A wardrobe that feels like you.</p>
            <span>Made for the clothes you own.</span>
          </footer>
        </div>
      </main>
      {modal?.type === "details" && (
        <Modal title={modal.item.name} onClose={() => setModal(null)}>
          <div className="item-history">
            <img src={modal.item.photo} alt={modal.item.name} />
            <p className="hint">
              Every recorded wear, across every occasion. Laundry never clears
              this history.
            </p>
            {recentHistory
              .filter((w) => w.items.some((i) => i.id === modal.item.id))
              .map((w) => (
                <div key={w.id}>
                  <strong>
                    {ago(w.wornAt)} · {w.occasion}
                  </strong>
                  <p>{dateLabel(w.wornAt)}</p>
                </div>
              ))}
            {!lastWear(history, modal.item.id) && (
              <p className="small-empty">No wear recorded yet.</p>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "item" && (
        <ItemForm
          item={modal.item}
          initialStyle={dressStyle}
          onClose={() => setModal(null)}
          onSave={saveItem}
        />
      )}
      {modal?.type === "wear" && (
        <WearForm
          outfit={modal.outfit}
          occasion={modal.outfit.occasion}
          onClose={() => setModal(null)}
          onSave={saveWear}
        />
      )}
    </div>
  );
}
export default App;
