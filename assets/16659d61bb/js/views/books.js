/* Books: one section per book in content/books.json, covering its big idea,
   shape, themes, key passages and how it connects to the rest of the Bible. */
import { SITE, ERAS, eraColor } from "../site.js";
import { BOOK, encodePassage, parseRefs, bookName } from "../refs.js";
import { esc, personChip, refsHtml, t } from "../util.js";
import { lang, N } from "../i18n.js";

export const title = N("Books");

const LEVEL = { A: 0, B: 1, C: 2, D: 3, E: 4 };

/* A thin bar showing each section's share of the book, then a card per section. */
function barMap(b) {
  const total = b.structure.sections.reduce((n, s) => n + (s.verses || 1), 0);
  const shade = i => 18 + (i % 2) * 22 + Math.floor(i / 2) % 2 * 10;   // alternate tints of the era color
  return `
    <div class="ribbon" role="list" aria-label="${esc(t("{book}: sections by length", { book: b.name }))}">
      ${b.structure.sections.map((s, i) => `<button role="listitem" class="seg" data-ref="${encodeRef(s.ref)}"
        style="flex-grow:${s.verses || 1};--shade:${shade(i)}%" title="${esc(s.title)} · ${esc(t("{n} verses", { n: s.verses }))}"
        aria-label="${esc(s.title)}"></button>`).join("")}
    </div>
    <ol class="sections">
      ${b.structure.sections.map((s, i) => `<li style="--shade:${shade(i)}%">
        <span class="swatch" aria-hidden="true"></span>
        <div><b>${esc(s.title)}</b> <span class="sref">${refsHtml(s.ref)}</span>
        ${s.note ? `<p>${esc(s.note)}</p>` : ""}
        <span class="share num">${esc(t("{pct}% of the book", { pct: Math.round((s.verses || 0) / total * 100) || "<1" }))}</span></div>
      </li>`).join("")}
    </ol>`;
}

/* Matching sections face each other, stepping in toward the center and back out. */
function mirrorMap(b) {
  const seen = {};
  return `<ol class="mirror">${b.structure.sections.map(s => {
    if (s.outside) return `<li class="outside"><div class="mrow"><b>${esc(s.title)}</b> <span class="sref">${refsHtml(s.ref)}</span>${s.note ? `<p>${esc(s.note)}</p>` : ""}</div></li>`;
    const second = seen[s.pair]; seen[s.pair] = true;
    const level = LEVEL[s.pair] ?? 0;
    const center = level === Math.max(...b.structure.sections.filter(x => x.pair).map(x => LEVEL[x.pair] ?? 0));
    return `<li class="${center ? "center" : ""}" style="--level:${level}">
      <span class="pair">${s.pair}${second ? "′" : ""}</span>
      <div class="mrow"><b>${esc(s.title)}</b> <span class="sref">${refsHtml(s.ref)}</span>${s.note ? `<p>${esc(s.note)}</p>` : ""}</div>
    </li>`;
  }).join("")}</ol>`;
}

/* The first passage in a reference string, encoded for a data-ref attribute. */
const encodeRef = ref => {
  const first = parseRefs(ref).find(x => x.passage);
  return first ? encodePassage(first.passage) : "";
};

function bookHtml(b) {
  const era = ERAS[b.era];
  const book = BOOK[b.id];
  const sourceName = new URL(b.source || "https://bibleproject.com").hostname.replace(/^www\./, "");
  return `<section class="book" id="book-${b.id}" style="--c:${eraColor(b.era)}">
    <div class="book-head">
      <span class="label">${esc(t(book.chapters > 1 ? N("{n} chapters") : N("{n} chapter"), { n: book.chapters }))}</span>
      <h2>${esc(b.name)}</h2>
      <p class="tagline">${esc(b.tagline)}</p>
      <button class="ref-link read-all" data-ref="${encodePassage({ book: b.id, chapter: 1, verse: null })}">${esc(t("Read {ref}", { ref: lang === "en" ? b.name : bookName(b.id, lang) }))}</button>
    </div>

    <div class="book-grid">
      <div class="big-idea">
        <h3 class="label">${esc(t("The big idea"))}</h3>
        <ul>${b.bigIdea.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>
      <div class="book-facts">
        <h3 class="label">${esc(t("Who wrote it"))}</h3>
        <p>${esc(b.authorship || "")} ${b.authorshipRef ? `<span class="sref">${refsHtml(b.authorshipRef)}</span>` : ""}</p>
        <h3 class="label">${esc(t("Where it fits"))}</h3>
        <p><span class="dot"></span> ${esc(era.name)} <span class="muted num">${esc(era.dates)}</span></p>
        ${b.people?.length ? `<h3 class="label">${esc(t("People"))}</h3><div class="chips">${b.people.map(personChip).join("")}</div>` : ""}
      </div>
    </div>

    <div class="shape">
      <h3 class="label">${esc(t("The shape of the book"))}</h3>
      ${b.structure.note ? `<p class="shape-note">${esc(b.structure.note)} ${b.structure.noteRef ? `<span class="sref">${refsHtml(b.structure.noteRef)}</span>` : ""}</p>` : ""}
      ${b.structure.layout === "mirror" ? mirrorMap(b) : barMap(b)}
    </div>

    <h3 class="label">${esc(t("Themes"))}</h3>
    <div class="themes">${b.themes.map(t => `<div class="theme">
      <h4>${esc(t.title)}</h4>
      <ul>${t.points.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${t.ref ? `<div class="sref">${refsHtml(t.ref)}</div>` : ""}
    </div>`).join("")}</div>

    <div class="book-grid">
      <div>
        <h3 class="label">${esc(t("Key passages"))}</h3>
        <ul class="passages">${b.keyPassages.map(k => `<li>${refsHtml(k.ref)} <span>${esc(k.text)}</span></li>`).join("")}</ul>
      </div>
      <div>
        <h3 class="label">${esc(t("How it connects"))}</h3>
        <ul class="connects">${b.connections.map(c => `<li>${esc(c.text)} <span class="sref">${refsHtml(c.ref)}</span></li>`).join("")}</ul>
      </div>
    </div>

    ${b.source ? `<p class="credit">${t("Summarized from {link}, with cross-references added.", { link: `<a href="${esc(b.source)}" target="_blank" rel="noopener">${esc(t("{site}'s guide to {book}", { site: sourceName, book: b.name }))}</a>` })}</p>` : ""}
  </section>`;
}

export function render(root) {
  const books = SITE.books || [];
  const groups = [...new Set(books.map(b => b.group))];
  root.innerHTML = `<h2>${esc(t("Books"))}</h2>
    <p class="lede">${esc(t("Some books are about ideas more than people. Each one here gets its big idea, its shape, its themes and its key passages. Tap any reference to read it."))}</p>
    <div class="strip">${groups.map(g => `<span class="label strip-group">${esc(g)}</span>${books.filter(b => b.group === g).map(b =>
      `<button data-jump-book="${b.id}"><span class="dot" style="--c:${eraColor(b.era)}"></span>${esc(b.name)}</button>`).join("")}`).join("")}</div>
    ${groups.map(g => `<div class="book-group"><h2 class="group-title">${esc(g)}</h2>${books.filter(b => b.group === g).map(bookHtml).join("")}</div>`).join("")}`;

  root.addEventListener("click", e => {
    const j = e.target.closest("[data-jump-book]");
    if (j) document.getElementById("book-" + j.dataset.jumpBook)?.scrollIntoView({ behavior: "smooth" });
  });

  const pending = sessionStorage.getItem("otmap:book-focus");
  if (pending) {
    sessionStorage.removeItem("otmap:book-focus");
    requestAnimationFrame(() => document.getElementById("book-" + pending)?.scrollIntoView());
  }
}
