/* Guided tour: points at each part of the screen in turn with a short note.
   Some steps show the real thing (a person card, the Bible panel) and put it
   away again afterwards. To change the wording, edit the steps below and the
   Hindi in content/translations/hi/ui.json. */
import { esc, t } from "./util.js";
import { N } from "./i18n.js";
import * as reader from "./reader.js";
import * as personPanel from "./person-panel.js";
import * as drawer from "./drawer.js";

const first = sel => document.querySelector(sel);

const STEPS = [
  { target: () => first("#tabs"), title: N("Sections"),
    text: N("The guide has eight sections. Tap a name here to switch. On a phone, slide this row left and right to see them all.") },
  { target: () => first("#menuBtn"), title: N("Menu"),
    text: N("Prefer a list? Tap this button to open the menu. It can also jump straight to an era, a family tree or a book.") },
  { target: () => first(".masthead .lang-switch"), title: N("Language"),
    text: N("Read everything in English or Hindi. The Bible switches language too.") },
  { target: () => first("#view .flow .node"), title: N("Names"),
    text: N("Every name you can tap opens a short card about that person. Let's open one.") },
  { target: () => first("#personPanel"), title: N("A person's card"),
    text: N("It shows who they were, what they did, their family, and where to read about them. Tap ✕ or anywhere outside the card to close it."),
    enter: () => personPanel.open(first("#view .flow .node")?.dataset.p || "adam"),
    leave: () => personPanel.close() },
  { target: () => first("#view .era .ref-link"), title: N("Bible references"),
    text: N("Gold words with a small book icon are Bible references. Tap one to read the verses. Let's try it.") },
  { target: () => first("#reader"), title: N("The Bible"),
    text: N("The verses open here, next to the page. The arrows turn the chapter, and WEB, KJV or IRV changes the translation. Tap ✕ to close it."),
    enter: s => { s.readerWasOpen = reader.isOpen(); const ref = first("#view .era .ref-link"); reader.openRef(ref?.dataset.ref || "genesis.1.", ref); },
    leave: s => { if (!s.readerWasOpen) reader.close(); } },
  { target: () => first("#bibleToggle"), title: N("Open the Bible anytime"),
    text: N("This button opens the Bible on its own, so you can read any book and chapter.") },
  { target: () => first('#tabs a[href="#connections"]'), title: N("Connections"),
    text: N("A map of how everyone is related. You can drag it, zoom in, and tap people to explore.") },
  { target: () => first("#helpBtn"), title: N("Need help again?"),
    text: N("Tap the ? button anytime to see the welcome screen and this tour again. Enjoy your reading!") },
];

let el = null, index = 0, state = {}, raf = 0;

export const isActive = () => !!el;

export function start() {
  if (el) return;
  drawer.close({ returnFocus: false });
  personPanel.close();
  if (location.hash && location.hash !== "#story") location.hash = "story";
  window.scrollTo(0, 0);
  state = {};
  el = document.createElement("div");
  el.className = "tour";
  el.innerHTML = `<div class="tour-block"></div><div class="tour-spot" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="tourTitle"></div>`;
  document.body.append(el);
  document.body.classList.add("tour-open");
  el.addEventListener("click", onClick);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  // Wait for the Story Flow to draw before pointing at it.
  requestAnimationFrame(() => requestAnimationFrame(() => go(0)));
}

export function end() {
  if (!el) return;
  STEPS[index]?.leave?.(state);
  el.remove();
  el = null;
  document.body.classList.remove("tour-open");
  window.removeEventListener("resize", place);
  window.removeEventListener("scroll", place, true);
  document.getElementById("helpBtn")?.focus({ preventScroll: true });
}

function go(i) {
  if (!el) return;
  STEPS[index]?.leave?.(state);
  index = Math.max(0, Math.min(i, STEPS.length - 1));
  const step = STEPS[index];
  step.enter?.(state);

  const card = el.querySelector(".tour-card");
  const last = index === STEPS.length - 1;
  card.innerHTML = `
    <div class="tour-top">
      <span class="label">${esc(t("Step {n} of {total}", { n: index + 1, total: STEPS.length }))}</span>
      <button class="tour-exit" data-tour="end">${esc(t("Exit tour"))}</button>
    </div>
    <h2 id="tourTitle">${esc(t(step.title))}</h2>
    <p>${esc(t(step.text))}</p>
    <div class="tour-dots" aria-hidden="true">${STEPS.map((_, j) => `<span class="${j === index ? "on" : ""}"></span>`).join("")}</div>
    <div class="tour-nav">
      ${index > 0 ? `<button class="btn" data-tour="back">← ${esc(t("Back"))}</button>` : "<span></span>"}
      <button class="btn primary" data-tour="${last ? "end" : "next"}">${esc(t(last ? N("Start exploring") : N("Next")))}${last ? "" : " →"}</button>
    </div>`;

  // Bring the target into view, then let panels finish opening before measuring.
  const target = step.target();
  if (target && !target.closest("header") && !target.closest(".reader") && !target.closest(".pp")) {
    target.scrollIntoView({ block: "center", inline: "nearest" });
  }
  if (target?.closest("#tabs") && target !== first("#tabs")) target.scrollIntoView({ block: "nearest", inline: "center" });
  cancelAnimationFrame(raf);
  place();
  setTimeout(place, 260);
  card.querySelector(".btn.primary").focus({ preventScroll: true });
}

/* Put the highlight around the target and the card next to it. */
function place() {
  if (!el) return;
  const spot = el.querySelector(".tour-spot");
  const card = el.querySelector(".tour-card");
  const target = STEPS[index].target();
  const vw = window.innerWidth, vh = window.innerHeight, gap = 14, pad = 6;
  const r = target && !target.hidden ? target.getBoundingClientRect() : null;
  const visible = r && r.width > 0 && r.height > 0;

  if (visible) {
    const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
    const right = Math.min(vw - 4, r.right + pad), bottom = Math.min(vh - 4, r.bottom + pad);
    Object.assign(spot.style, { top: `${top}px`, left: `${left}px`, width: `${right - left}px`, height: `${bottom - top}px`, opacity: 1 });
  } else {
    Object.assign(spot.style, { top: `${vh / 2}px`, left: `${vw / 2}px`, width: "0px", height: "0px", opacity: 1 });
  }

  card.style.cssText = "";
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const phone = vw < 640;

  if (!visible) { card.classList.add("centered"); return; }
  card.classList.remove("centered");

  if (phone) {
    // Dock at the bottom, or the top when the target is low on the screen.
    const low = r.top + r.height / 2 > vh / 2;
    card.style.left = "12px"; card.style.right = "12px";
    if (low) card.style.top = `calc(12px + env(safe-area-inset-top, 0px))`;
    else card.style.bottom = `calc(12px + env(safe-area-inset-bottom, 0px))`;
    return;
  }

  const clampX = x => Math.max(12, Math.min(x, vw - cw - 12));
  const clampY = y => Math.max(12, Math.min(y, vh - ch - 12));
  let top, left;
  if (r.bottom + gap + ch < vh - 8) { top = r.bottom + gap; left = clampX(r.left + r.width / 2 - cw / 2); }
  else if (r.top - gap - ch > 8) { top = r.top - gap - ch; left = clampX(r.left + r.width / 2 - cw / 2); }
  else {
    // Big targets (the person card, the Bible panel): use the wider side, narrowing the card to fit.
    const leftRoom = r.left - gap - 12, rightRoom = vw - r.right - gap - 12;
    const room = Math.max(leftRoom, rightRoom);
    if (room < 260) {
      // No room beside it: sit at the bottom of the screen, over the least important part.
      card.style.left = `${Math.max(12, (vw - cw) / 2)}px`;
      card.style.bottom = "16px";
      return;
    }
    const w = Math.min(380, room);
    card.style.width = `${w}px`;
    const h = card.offsetHeight;
    left = rightRoom >= leftRoom ? r.right + gap : r.left - gap - w;
    top = Math.max(12, Math.min(r.top + 40, vh - h - 12));
  }
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

function onClick(e) {
  const b = e.target.closest("[data-tour]");
  if (!b) return;
  const a = b.dataset.tour;
  if (a === "next") go(index + 1);
  else if (a === "back") go(index - 1);
  else end();
}

export function init() {
  // While the tour runs it owns the keyboard: arrows move, Esc exits, Tab stays in the card.
  document.addEventListener("keydown", e => {
    if (!el) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); end(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); if (index < STEPS.length - 1) go(index + 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); go(index - 1); return; }
    if (e.key === "Tab") {
      const card = el.querySelector(".tour-card");
      const items = [...card.querySelectorAll("button")];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      return;
    }
    if (e.key.length === 1) e.stopImmediatePropagation();
  }, true);
  window.addEventListener("langchange", () => { if (el) go(index); });
}
