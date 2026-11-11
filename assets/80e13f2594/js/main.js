/* Entry point: starts the Bible reader, the menu, the person panel and the
   views, and handles things that work the same on every view: taps on
   references and names, keyboard shortcuts and the language switch. */
import { initRouter, route } from "./router.js";
import * as reader from "./reader.js";
import * as personPanel from "./person-panel.js";
import * as drawer from "./drawer.js";
import * as welcome from "./welcome.js";
import * as tour from "./tour.js";
import { t, lang, setLang, locale } from "./i18n.js";
import * as analytics from "./analytics.js";

analytics.init();
reader.init();
drawer.init();
tour.init();
welcome.init();
initRouter();
applyStaticText();

window.addEventListener("langchange", e => analytics.event(`language/${e.detail}`));

// Switching tabs closes any open person details.
window.addEventListener("hashchange", () => personPanel.close());

/* ---------- language ---------- */

/* Fixed text in index.html: elements marked data-i18n, data-i18n-aria, data-i18n-title. */
function applyStaticText() {
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", b.dataset.lang === lang);
  const date = document.getElementById("buildDate");
  if (date?.getAttribute("datetime")) {
    date.textContent = new Intl.DateTimeFormat(locale(), { dateStyle: "long" }).format(new Date(date.getAttribute("datetime") + "T12:00:00"));
  }
}

document.addEventListener("click", e => {
  const l = e.target.closest("[data-lang]");
  if (l) setLang(l.dataset.lang);
});

window.addEventListener("langchange", () => {
  personPanel.close();
  applyStaticText();
  route({ keepScroll: true });
});

/* ---------- taps that work everywhere ---------- */

document.addEventListener("click", e => {
  // A scripture reference anywhere on the page opens it in the Bible panel.
  const ref = e.target.closest("[data-ref]");
  if (ref) { e.preventDefault(); e.stopPropagation(); reader.openRef(ref.dataset.ref, ref); return; }
  // A person's name or card opens their details.
  const person = e.target.closest("[data-p]");
  if (person) personPanel.open(person.dataset.p);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (drawer.isOpen()) drawer.close();
    else if (personPanel.isOpen()) personPanel.close();
    else if (reader.isOpen()) reader.close();
    return;
  }
  // "B" toggles the Bible, unless the viewer is typing.
  const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
  if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b") reader.toggle();
});

// Sticky headings inside views sit just under the page header, whatever its height.
const header = document.querySelector("header");
new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`)).observe(header);
