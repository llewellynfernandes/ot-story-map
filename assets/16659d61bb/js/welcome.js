/* Welcome screen, shown every time the site opens. Nothing is stored or
   tracked: visitors choose a short guided tour or go straight in. The ?
   button in the header and the menu brings it back. */
import { esc, t } from "./util.js";
import { N, lang, LANGS, setLang } from "./i18n.js";
import * as tour from "./tour.js";

const ICONS = {
  story: `<path d="M5 4v16M5 6h10l-2 3 2 3H5"/><circle cx="17" cy="18" r="2"/><path d="M5 20h10"/>`,
  person: `<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>`,
  book: `<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"/><path d="M5 21.5A2.5 2.5 0 0 1 7.5 19H19v3H7.5"/>`,
  language: `<path d="M4 6h9M8.5 4v2c0 4-2 7-4.5 9M6 10c1.5 2 3.5 3.5 6 4.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>`,
};

const FEATURES = [
  { icon: "story", title: N("Follow the story"), text: N("See who came after whom, from Adam to Malachi, era by era.") },
  { icon: "person", title: N("Meet the people"), text: N("Tap any name to see a short card about that person.") },
  { icon: "book", title: N("Read the Bible beside it"), text: N("Tap a gold reference with a book icon to open the verses.") },
  { icon: "language", title: N("English or हिन्दी"), text: N("Switch languages at the top of the page, anytime.") },
];

let root = null, returnFocus = null;

export const isOpen = () => !!root;

function draw() {
  root.innerHTML = `
    <div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">
      <span class="label">${esc(t("Welcome"))}</span>
      <h1 id="welcomeTitle">${esc(t("Old Testament Story Map"))}</h1>
      <p class="welcome-lede">${esc(t("A picture guide to the people and story of the Old Testament, with the Bible built in."))}</p>

      <div class="welcome-lang">
        <span>${esc(t("Choose a language"))}</span>
        <div class="seg" role="group" aria-label="${esc(t("Language"))}">
          ${LANGS.map(l => `<button data-wlang="${l.id}" lang="${l.id}" aria-pressed="${l.id === lang}">${esc(l.name)}</button>`).join("")}
        </div>
      </div>

      <ul class="welcome-features">
        ${FEATURES.map(f => `<li>
          <span class="welcome-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[f.icon]}</svg></span>
          <div><b>${esc(t(f.title))}</b><span>${esc(t(f.text))}</span></div>
        </li>`).join("")}
      </ul>

      <div class="welcome-actions">
        <button class="btn primary" data-welcome="tour">${esc(t("Show me how it works"))} <small>${esc(t("about 1 minute"))}</small></button>
        <button class="btn" data-welcome="skip">${esc(t("Skip and start reading"))}</button>
      </div>
      <p class="welcome-foot">${esc(t("You can see this guide again anytime with the ? button at the top."))}</p>
    </div>`;
}

export function show() {
  if (root) return;
  returnFocus = document.activeElement;
  root = document.createElement("div");
  root.className = "welcome";
  document.body.append(root);
  document.body.classList.add("welcome-open");
  draw();
  root.querySelector('[data-welcome="tour"]').focus({ preventScroll: true });

  root.addEventListener("click", e => {
    const l = e.target.closest("[data-wlang]");
    if (l) { setLang(l.dataset.wlang); return; }
    const a = e.target.closest("[data-welcome]");
    if (!a) return;
    hide();
    if (a.dataset.welcome === "tour") tour.start();
  });
}

export function hide() {
  if (!root) return;
  root.remove();
  root = null;
  document.body.classList.remove("welcome-open");
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
}

export function init() {
  window.addEventListener("langchange", () => {
    if (!root) return;
    const focused = document.activeElement?.dataset?.wlang;
    draw();
    root.querySelector(focused ? `[data-wlang="${focused}"]` : '[data-welcome="tour"]')?.focus({ preventScroll: true });
  });
  // While the welcome screen is open it owns the keyboard: Esc skips it, Tab stays inside.
  document.addEventListener("keydown", e => {
    if (!root) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); hide(); return; }
    if (e.key === "Tab") trapTab(e, root);
    else if (!e.target.closest?.(".welcome")) e.stopImmediatePropagation();
    else if (e.key.length === 1) e.stopImmediatePropagation();   // no single-key shortcuts behind the screen
  }, true);
  for (const id of ["helpBtn", "drawerHelp"]) document.getElementById(id)?.addEventListener("click", () => show());
}

/* Keep Tab and Shift+Tab inside an element. */
export function trapTab(e, container) {
  const items = [...container.querySelectorAll("button, [href], input, select, [tabindex]:not([tabindex='-1'])")].filter(el => !el.disabled && el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
