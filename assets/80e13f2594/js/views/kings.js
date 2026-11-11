/* Kings: Judah and Israel side by side, ordered by when each reign began. */
import { SITE, eraColor } from "../site.js";
import { esc, personLink, t } from "../util.js";
import { N } from "../i18n.js";

export const title = N("Kings");
const VERDICT = { good: N("Did right"), mixed: N("Mixed"), bad: N("Did evil") };

export function render(root) {
  const K = SITE.kings;
  const items = [
    ...K.judah.map(k => ({ year: k.from, side: "j", k })),
    ...K.israel.map(k => ({ year: k.from, side: "i", k })),
    ...K.events.map(e => ({ year: e.year + 0.5, side: "event", e })),   // events sort just above reigns that begin that year
  ].sort((a, b) => b.year - a.year);
  const bc = t("BC");

  let h = `<h2>${esc(t("Kings of the Divided Kingdom"))}</h2>
    <p class="lede">${esc(t("Judah on the left, Israel on the right, in order of when each reign began. The tag gives the verdict of 1–2 Kings on each reign."))}</p>
    <div class="legend"><span class="v good">${esc(t(VERDICT.good))}</span><span class="v mixed">${esc(t(VERDICT.mixed))}</span><span class="v bad">${esc(t(VERDICT.bad))}</span><span>${esc(t("Dates BC, approximate; some reigns overlap as co-regencies."))}</span></div>
    <div class="kgrid">
      <div class="khead" style="--c:${eraColor("united-kingdom")}"><h3>${esc(t("Judah"))}</h3><small>${esc(t("South · capital Jerusalem · line of David"))}</small></div>
      <div class="khead" style="--c:${eraColor("divided-kingdom")}"><h3>${esc(t("Israel"))}</h3><small>${esc(t("North · capital Samaria · 9 dynasties"))}</small></div>`;

  for (const it of items) {
    if (it.side === "event") { h += `<div class="kevent"><span class="num">${it.e.year} ${esc(bc)}</span>${esc(it.e.label)}</div>`; continue; }
    const k = it.k;
    h += `<div class="king ${it.side}">
      <div class="top"><b>${k.id ? personLink(k.id, k.name) : esc(k.name)}</b><span class="v ${k.verdict}">${esc(t(VERDICT[k.verdict]))}</span></div>
      <div class="yrs">${k.from === k.to ? k.from : `${k.from}–${k.to}`}</div>
      ${k.note ? `<div class="kn">${esc(k.note)}</div>` : ""}
    </div>`;
  }
  root.innerHTML = h + `</div>`;
}
