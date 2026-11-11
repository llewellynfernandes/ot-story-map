/* Person details panel. Opens over the page (left side) so the Bible panel
   stays usable next to it. */
import { PEOPLE, ERAS, ORDER, eraColor } from "./site.js";
import { esc, personChip, refsHtml, lineOfJesus, t } from "./util.js";
import { SITE } from "./site.js";
import * as analytics from "./analytics.js";

const panel = document.getElementById("personPanel");
const scrim = document.getElementById("ppScrim");
let returnFocus = null;

export const isOpen = () => !panel.hidden;

export function open(id) {
  const p = PEOPLE[id];
  if (!p) return;
  analytics.page(`/person/${id}`);
  if (panel.hidden) returnFocus = document.activeElement;

  const i = ORDER.indexOf(id);
  const prev = i > 0 ? ORDER[i - 1] : null;
  const next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
  const era = ERAS[p.era];

  panel.style.setProperty("--c", eraColor(p.era));
  panel.innerHTML = `
    <button class="icon-btn close" data-close aria-label="${esc(t("Close"))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <span class="era-tag"><span class="dot"></span><span class="label">${esc(era.name)} · ${esc(era.dates)}</span></span>
    <h2 id="ppName">${esc(p.name)}</h2>
    <p class="role">${esc(p.role)}</p>
    ${lineOfJesus(p)}
    <div><span class="label">${esc(t("What they did"))}</span><ul>${p.did.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    ${p.family ? `<div class="fam"><span class="label">${esc(t("Family and connections"))}</span>${p.family.map(f =>
      `<div><em>${esc(f.label)}</em>${f.names.map(personChip).join("")}</div>`).join("")}</div>` : ""}
    <div class="read"><span class="label">${esc(t("Read"))}</span><br>${refsHtml(p.ref)}</div>
    <div class="actions">
      <button data-graph="${id}">${esc(t("See {name} in Connections", { name: p.name }))} →</button>
      ${(SITE.journeys || []).filter(j => j.people.includes(id)).map(j =>
        `<button data-journey="${j.id}">${esc(t("Journey: {title}", { title: j.title }))} →</button>`).join("")}
      ${(SITE.books || []).filter(b => (b.people || []).includes(id)).map(b =>
        `<button data-book="${b.id}">${esc(t("{book} on the Books page", { book: b.name }))} →</button>`).join("")}
    </div>
    ${i >= 0 ? `<div class="nav2">
      <span>${prev ? `← <button data-p="${prev}">${esc(PEOPLE[prev].name)}</button>` : ""}</span>
      <span>${next ? `<button data-p="${next}">${esc(PEOPLE[next].name)}</button> →` : ""}</span>
    </div>` : ""}`;

  panel.hidden = false;
  scrim.hidden = false;
  panel.scrollTop = 0;
  panel.querySelector(".close").focus({ preventScroll: true });
}

export function close() {
  if (panel.hidden) return;
  panel.hidden = true;
  scrim.hidden = true;
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}

scrim.addEventListener("click", close);
panel.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) close();
  const jr = e.target.closest("[data-journey]");
  if (jr) {
    close();
    sessionStorage.setItem("otmap:journey", jr.dataset.journey);
    if (location.hash === "#journeys") window.dispatchEvent(new HashChangeEvent("hashchange"));
    else location.hash = "journeys";
    return;
  }
  const bk = e.target.closest("[data-book]");
  if (bk) {
    close();
    sessionStorage.setItem("otmap:book-focus", bk.dataset.book);
    if (location.hash === "#books") window.dispatchEvent(new HashChangeEvent("hashchange"));
    else location.hash = "books";
    return;
  }
  const g = e.target.closest("[data-graph]");
  if (g) {
    close();
    sessionStorage.setItem("otmap:graph-focus", g.dataset.graph);
    if (location.hash === "#connections") window.dispatchEvent(new HashChangeEvent("hashchange"));
    else location.hash = "connections";
  }
});
