/* Bible reader panel.
   - Wide screens: a column on the right; the page shrinks to make room.
   - Phones: a sheet that slides up over the page.
   Opens from any scripture reference (data-ref) or the Bible button in the header. */
import { BOOKS, BOOK, decodePassage, passageLabel, bookName } from "./refs.js";
import { esc, store, t } from "./util.js";
import { lang, N } from "./i18n.js";

/* "versed" translations print one verse per line, since their source has no paragraphs. */
const TRANSLATIONS = [
  { id: "web", short: "WEB", name: N("World English Bible"), note: N("World English Bible · public domain · eBible.org") },
  { id: "kjv", short: "KJV", name: N("King James Version"), versed: true, note: N("King James Version, 1769 Oxford text · public domain · italics mark words the translators supplied") },
  { id: "irv", short: "IRV", name: N("Indian Revised Version (Hindi)"), versed: true, note: "इंडियन रिवाइज्ड वर्जन (IRV) हिंदी · © 2017–2019 Bridge Connectivity Solutions · CC BY-SA 4.0" },
];
// Each language remembers its own translation; Hindi starts on the IRV.
const DEFAULT_TR = { en: "web", hi: "irv" };
const trFor = l => {
  const saved = store.get(`reader-tr-${l}`, l === "en" ? store.get("reader-tr", null) : null);
  return TRANSLATIONS.some(x => x.id === saved) ? saved : DEFAULT_TR[l];
};
const WIDE = matchMedia("(min-width: 821px)");
const MIN_W = 320;

const el = {
  reader: document.getElementById("reader"),
  scrim: document.getElementById("readerScrim"),
  toggle: document.getElementById("bibleToggle"),
  title: document.getElementById("readerTitle"),
  context: document.getElementById("readerContext"),
  tr: document.getElementById("readerTr"),
  close: document.getElementById("readerClose"),
  prev: document.getElementById("readerPrev"),
  next: document.getElementById("readerNext"),
  book: document.getElementById("readerBook"),
  chapter: document.getElementById("readerChapter"),
  body: document.getElementById("readerBody"),
  foot: document.getElementById("readerFoot"),
  resize: document.getElementById("readerResize"),
};

const state = {
  tr: trFor(lang),
  book: "genesis",
  chapter: 1,
  passage: null,         // the reference that was opened, for highlighting and the context line
  width: store.get("reader-w", 460),
  ...store.get("reader-pos", {}),
};
const cache = new Map();   // "web/genesis" → Promise<book data>
let activeLink = null;

/* ---------- loading ---------- */

function loadBook(tr, book) {
  const key = `${tr}/${book}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`bible/${tr}/${book}.json`).then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).catch(err => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

/* ---------- drawing ---------- */

function inRange(ch, v) {
  const p = state.passage;
  if (!p || p.verse == null || p.book !== state.book) return false;
  const endCh = p.endBook && p.endBook !== p.book ? Infinity : (p.endChapter ?? p.chapter);
  const endV = p.endVerse ?? (p.endChapter && p.endChapter !== p.chapter ? Infinity : p.verse);
  const afterStart = ch > p.chapter || (ch === p.chapter && v >= p.verse);
  const beforeEnd = ch < endCh || (ch === endCh && v <= endV);
  return afterStart && beforeEnd;
}

const supplied = s => esc(s).replace(/\[([^\]]+)\]/g, '<span class="supplied">$1</span>');

function verseHtml(ch, v, text, tr) {
  const cont = v < 0, n = Math.abs(v);
  const hl = inRange(ch, n) ? " hl" : "";
  const num = cont ? "" : `<sup class="vn">${n}</sup>`;
  const body = tr === "kjv" ? supplied(text) : esc(text);
  return `<span class="vs${hl}" data-v="${n}">${num}${body}</span>`;
}

function chapterHtml(blocks, ch, tr) {
  let h = `<span class="chapter-num" aria-hidden="true">${ch}</span>`;
  blocks.forEach((b, i) => {
    if (b.t === "h") { h += `<p class="heading">${esc(b.x)}</p>`; return; }
    if (b.t === "q") {
      h += `<div class="stanza">${b.v.map(([v, t]) => `<span class="line${v < 0 ? " cont" : ""}">${verseHtml(ch, v, t, tr)}</span>`).join("")}</div>`;
      return;
    }
    const mark = tr === "kjv" && i > 0 ? `<span class="pilcrow" aria-hidden="true">¶</span>` : "";
    h += `<p>${mark}${b.v.map(([v, t]) => verseHtml(ch, v, t, tr)).join(" ")}</p>`;
  });
  return h;
}

async function draw({ scroll = "top" } = {}) {
  const { tr, book, chapter } = state;
  const b = BOOK[book];
  const name = bookName(book, lang);
  el.title.textContent = `${name} ${chapter}`;
  el.book.value = book;
  fillChapters();
  el.chapter.value = String(chapter);
  el.prev.disabled = b.index === 0 && chapter === 1;
  el.next.disabled = b.index === BOOKS.length - 1 && chapter === b.chapters;
  el.tr.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.tr === tr));
  el.body.classList.toggle("kjv", tr === "kjv");
  el.body.classList.toggle("versed", !!TRANSLATIONS.find(x => x.id === tr).versed);
  el.body.lang = tr === "irv" ? "hi" : "en";
  el.foot.textContent = t(TRANSLATIONS.find(x => x.id === tr).note);

  if (state.passage) {
    el.context.hidden = false;
    el.context.textContent = t("Opened from {ref}", { ref: passageLabel(state.passage, lang) });
  } else el.context.hidden = true;

  store.set("reader-pos", { book, chapter });
  el.body.innerHTML = `<p class="msg">${esc(t("Loading {ref}…", { ref: `${name} ${chapter}` }))}</p>`;
  let data;
  try { data = await loadBook(tr, book); }
  catch {
    el.body.innerHTML = `<p class="msg">${esc(t("Couldn't load {book}. Check your connection, then pick the chapter again.", { book: name }))}</p>`;
    return;
  }
  // The viewer may have moved on while this was loading.
  if (state.book !== book || state.chapter !== chapter || state.tr !== tr) return;

  const blocks = data.chapters[chapter - 1] || [];
  let h = chapterHtml(blocks, chapter, tr);
  const nb = nextLocation();
  if (nb) h += `<button class="next-ch" data-go="${nb.book}.${nb.chapter}">${esc(t("Continue to {ref}", { ref: `${bookName(nb.book, lang)} ${nb.chapter}` }))} →</button>`;
  el.body.innerHTML = h;

  const first = el.body.querySelector(".hl");
  if (scroll === "verse" && first) first.scrollIntoView({ block: "center" });
  else if (scroll === "top") el.body.scrollTop = 0;
}

function fillChapters() {
  const n = BOOK[state.book].chapters;
  if (el.chapter.options.length === n && el.chapter.dataset.book === state.book) return;
  el.chapter.dataset.book = state.book;
  el.chapter.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
}

function nextLocation() {
  const b = BOOK[state.book];
  if (state.chapter < b.chapters) return { book: b.id, chapter: state.chapter + 1 };
  const nb = BOOKS[b.index + 1];
  return nb ? { book: nb.id, chapter: 1 } : null;
}
function prevLocation() {
  const b = BOOK[state.book];
  if (state.chapter > 1) return { book: b.id, chapter: state.chapter - 1 };
  const pb = BOOKS[b.index - 1];
  return pb ? { book: pb.id, chapter: pb.chapters } : null;
}

/* ---------- open / close / layout ---------- */

export const isOpen = () => !el.reader.hidden;

function applyLayout() {
  const open = isOpen();
  const wide = WIDE.matches;
  const max = Math.min(900, Math.round(window.innerWidth * 0.62));
  const w = Math.max(MIN_W, Math.min(state.width, max));
  el.reader.style.setProperty("--reader-w", `${w}px`);
  document.documentElement.style.setProperty("--reader-space", open && wide ? `${w}px` : "0px");
  document.body.classList.toggle("reader-open", open && wide);
  el.scrim.hidden = !(open && !wide);
  el.toggle.setAttribute("aria-pressed", open);
}

function show() {
  if (isOpen()) return;
  el.reader.hidden = false;
  applyLayout();
  store.set("reader-open", true);
  window.dispatchEvent(new Event("resize"));   // let charts and the graph fit the new width
}

export function close() {
  if (!isOpen()) return;
  el.reader.hidden = true;
  applyLayout();
  store.set("reader-open", false);
  setActiveLink(null);
  window.dispatchEvent(new Event("resize"));
}

export function toggle() {
  if (isOpen()) close();
  else { show(); draw({ scroll: "verse" }); }
}

function setActiveLink(link) {
  activeLink?.classList.remove("is-open");
  activeLink = link;
  link?.classList.add("is-open");
}

/* Open a passage encoded in a data-ref attribute. */
export function openRef(encoded, link) {
  const p = decodePassage(encoded);
  if (!BOOK[p.book]) return;
  state.passage = p;
  state.book = p.book;
  state.chapter = p.chapter;
  setActiveLink(link || null);
  show();
  draw({ scroll: p.verse != null ? "verse" : "top" });
}

function go(book, chapter, { keepPassage = true } = {}) {
  if (!keepPassage) state.passage = null;
  state.book = book;
  state.chapter = chapter;
  draw();
}

/* ---------- setup ---------- */

/* Labels that change with the language. */
function labels() {
  el.tr.innerHTML = TRANSLATIONS.map(x => `<button data-tr="${x.id}" title="${esc(t(x.name))}" aria-pressed="${x.id === state.tr}">${x.short}</button>`).join("");
  el.book.innerHTML = ["OT", "NT"].map(tm => `<optgroup label="${esc(t(tm === "OT" ? N("Old Testament") : N("New Testament")))}">${
    BOOKS.filter(b => b.testament === tm).map(b => `<option value="${b.id}">${esc(bookName(b.id, lang))}</option>`).join("")}</optgroup>`).join("");
  el.book.value = state.book;
}

export function init() {
  labels();
  window.addEventListener("langchange", () => {
    state.tr = trFor(lang);
    labels();
    if (isOpen()) draw({ scroll: "none" });
  });
  if (!BOOK[state.book]) { state.book = "genesis"; state.chapter = 1; }

  el.toggle.addEventListener("click", toggle);
  el.close.addEventListener("click", close);
  el.scrim.addEventListener("click", close);
  el.tr.addEventListener("click", e => {
    const b = e.target.closest("[data-tr]");
    if (!b || b.dataset.tr === state.tr) return;
    state.tr = b.dataset.tr;
    store.set(`reader-tr-${lang}`, state.tr);
    const keep = el.body.scrollTop;
    draw({ scroll: "none" }).then(() => { el.body.scrollTop = keep; });
  });
  el.book.addEventListener("change", () => go(el.book.value, 1, { keepPassage: false }));
  el.chapter.addEventListener("change", () => go(state.book, +el.chapter.value));
  el.prev.addEventListener("click", () => { const l = prevLocation(); if (l) go(l.book, l.chapter); });
  el.next.addEventListener("click", () => { const l = nextLocation(); if (l) go(l.book, l.chapter); });
  el.body.addEventListener("click", e => {
    const g = e.target.closest("[data-go]");
    if (g) { const [b, c] = g.dataset.go.split("."); go(b, +c); }
  });

  // Drag the left edge to resize (wide screens only).
  el.resize.addEventListener("pointerdown", e => {
    e.preventDefault();
    el.resize.setPointerCapture(e.pointerId);
    el.reader.classList.add("resizing");
    const move = ev => { state.width = window.innerWidth - ev.clientX; applyLayout(); };
    const up = () => {
      el.resize.removeEventListener("pointermove", move);
      el.reader.classList.remove("resizing");
      store.set("reader-w", Math.round(state.width));
      window.dispatchEvent(new Event("resize"));
    };
    el.resize.addEventListener("pointermove", move);
    el.resize.addEventListener("pointerup", up, { once: true });
    el.resize.addEventListener("pointercancel", up, { once: true });
  });
  el.resize.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    state.width += e.key === "ArrowLeft" ? 24 : -24;
    applyLayout();
    store.set("reader-w", Math.round(state.width));
  });

  WIDE.addEventListener("change", applyLayout);
  window.addEventListener("resize", () => { if (isOpen()) applyLayout(); });

  // Reopen where the viewer left off, on wide screens only.
  if (store.get("reader-open", false) && WIDE.matches) { show(); draw(); }
  else applyLayout();
}
