/* The slide-out menu on the left. Lists the same tabs as the header, each with
   shortcuts into the page (eras, family trees, books, world sections), built
   from the content so new eras or books appear automatically. */
import { SITE } from "./site.js";
import { esc, t } from "./util.js";
import { N } from "./i18n.js";
import * as reader from "./reader.js";

const el = {
  drawer: document.getElementById("drawer"),
  scrim: document.getElementById("drawerScrim"),
  list: document.getElementById("drawerList"),
  open: document.getElementById("menuBtn"),
  close: document.getElementById("drawerClose"),
  bible: document.getElementById("drawerBible"),
};
let expanded = null;   // which category's shortcuts are showing

/* The categories, in the same order as the header tabs. */
function sections() {
  return [
    { view: "story", label: N("Story Flow"), items: SITE.eras.map(e => ({ anchor: `era-${e.key}`, label: e.name, color: `var(--e-${e.key})` })) },
    { view: "people", label: N("People") },
    { view: "family", label: N("Family Trees"), items: SITE.trees.map((tr, i) => ({ anchor: `tree-${i}`, label: tr.title, color: `var(--e-${tr.era})` })) },
    { view: "journeys", label: N("Journeys"), items: (SITE.journeys || []).map(j => ({ journey: j.id, label: j.title, color: `var(--e-${j.era})` })) },
    { view: "kings", label: N("Kings") },
    { view: "prophets", label: N("Prophets") },
    { view: "books", label: N("Books"), items: (SITE.books || []).map(b => ({ anchor: `book-${b.id}`, label: b.name, color: `var(--e-${b.era})` })) },
    { view: "world", label: N("World"), items: SITE.world.sections.map(s => ({ anchor: `world-${s.era}`, label: s.title || SITE.eras.find(e => e.key === s.era)?.name, color: `var(--e-${s.era})` })) },
    { view: "connections", label: N("Connections") },
  ];
}

const chevron = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

function draw() {
  const current = location.hash.slice(1) || "story";
  if (expanded === null) expanded = current;
  el.list.innerHTML = sections().map(s => {
    const open = expanded === s.view && s.items?.length;
    return `<li class="${s.view === current ? "current" : ""}">
      <div class="drawer-row">
        <a href="#${s.view}" data-view="${s.view}" ${s.view === current ? 'aria-current="page"' : ""}>${esc(t(s.label))}</a>
        ${s.items?.length ? `<button class="icon-btn expand" data-expand="${s.view}" aria-expanded="${!!open}" aria-label="${esc(t("Show sections in {name}", { name: t(s.label) }))}">${chevron}</button>` : ""}
      </div>
      ${open ? `<ul class="drawer-sub">${s.items.map(it =>
        `<li><a href="#${s.view}" data-view="${s.view}" ${it.journey ? `data-journey="${it.journey}"` : `data-anchor="${it.anchor}"`}><span class="dot" style="--c:${it.color}"></span>${esc(it.label)}</a></li>`).join("")}</ul>` : ""}
    </li>`;
  }).join("");
}

export const isOpen = () => !el.drawer.hidden;

export function open() {
  expanded = null;
  draw();
  el.drawer.hidden = false;
  el.scrim.hidden = false;
  el.open.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => el.drawer.classList.add("in"));
  el.close.focus({ preventScroll: true });
}

export function close({ returnFocus = true } = {}) {
  if (!isOpen()) return;
  el.drawer.classList.remove("in");
  el.open.setAttribute("aria-expanded", "false");
  el.scrim.hidden = true;
  el.drawer.hidden = true;
  if (returnFocus) el.open.focus({ preventScroll: true });
}

/* Go to a tab, and optionally to a section inside it. */
function go(view, anchor) {
  close({ returnFocus: false });
  const scroll = () => {
    const target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  };
  if (location.hash.slice(1) === view || (!location.hash && view === "story")) scroll();
  else {
    if (anchor) sessionStorage.setItem("otmap:anchor", anchor);
    location.hash = view;
  }
}

/* Open one journey on the Journeys tab. */
export function openJourney(id) {
  close({ returnFocus: false });
  sessionStorage.setItem("otmap:journey", id);
  if (location.hash === "#journeys") window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = "journeys";
}

export function init() {
  el.open.addEventListener("click", () => (isOpen() ? close() : open()));
  el.close.addEventListener("click", () => close());
  el.scrim.addEventListener("click", () => close());
  el.bible.addEventListener("click", () => { close({ returnFocus: false }); if (!reader.isOpen()) reader.toggle(); });
  document.getElementById("drawerHelp")?.addEventListener("click", () => close({ returnFocus: false }));
  el.list.addEventListener("click", e => {
    const ex = e.target.closest("[data-expand]");
    if (ex) { expanded = expanded === ex.dataset.expand ? "" : ex.dataset.expand; draw(); return; }
    const a = e.target.closest("a[data-view]");
    if (a?.dataset.journey) { e.preventDefault(); openJourney(a.dataset.journey); return; }
    if (a) { e.preventDefault(); go(a.dataset.view, a.dataset.anchor); }
  });
  window.addEventListener("langchange", () => { if (isOpen()) draw(); });
}
