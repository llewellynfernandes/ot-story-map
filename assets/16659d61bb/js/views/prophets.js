/* Prophets: when each prophet spoke, against the empires of the day. */
import { SITE, eraColor } from "../site.js";
import { N } from "../i18n.js";
import { esc, personLink, t } from "../util.js";
import { BOOK } from "../refs.js";

export const title = N("Prophets");
const START = 900, END = 400;                       // years BC shown on the chart
const x = y => (START - y) / (START - END) * 100;   // year → % from the left

export function render(root) {
  const PR = SITE.prophets;
  const ticks = [900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400];
  const bc = t("BC");
  let h = `<h2>${esc(t("Prophets and Empires"))}</h2>
    <p class="lede">${esc(t("When each prophet spoke, who they spoke to, and which empire ruled the region. Dashed lines mark the three turning points. Tap a book icon to read that prophet. Scroll sideways on a phone."))}</p>
    <div class="scroll"><div class="chart">
      <div class="axis"><span></span><div class="track">${ticks.map(y => `<span class="tick" style="left:${x(y)}%">${y} ${esc(bc)}</span>`).join("")}</div></div>
      <div class="emp"><span class="label" style="padding-top:5px">${esc(t("Empire"))}</span><div class="track">${PR.empires.map(e =>
        `<span class="ebar" style="left:${x(e.from)}%;width:${x(e.to) - x(e.from)}%;background:color-mix(in srgb,${eraColor(e.era)} 22%,var(--surface));color:var(--ink)">${esc(e.name)}</span>`).join("")}</div></div>`;

  for (const g of PR.groups) {
    h += `<div class="pgroup" style="--c:${eraColor(g.era)}"><span>${esc(g.label)}</span><div>${g.prophets.map(p => {
      const w = Math.max(x(p.to) - x(p.from), 1.2);
      // Prophets with a book of their own get a link to chapter 1 of it.
      const read = BOOK[p.id] ? ` <button class="ref-link" data-ref="${p.id}.1." title="${esc(t("Read {ref}", { ref: p.name }))}" aria-label="${esc(t("Read {ref}", { ref: p.name }))}"></button>` : "";
      return `<div class="prow"><span class="pbar ${w > 9 ? "wide" : ""}" style="left:${x(p.from)}%;width:${w}%"><span class="lbl">${p.id ? personLink(p.id, p.name) : esc(p.name)}${read}${p.audience ? ` <small style="color:var(--muted)">→ ${esc(p.audience)}</small>` : ""}</span></span></div>`;
    }).join("")}</div></div>`;
  }

  h += `<div class="marks"><span></span><div>${PR.markers.map(m => `<span class="mark" style="left:${x(m.year)}%"><span class="markl">${esc(m.label)}</span></span>`).join("")}</div></div>
    </div></div>
    <p class="note">${esc(t("Joel is not placed because scholars date him anywhere from the 800s to the 400s BC. Dates are approximate and follow common evangelical reference works."))}</p>`;
  root.innerHTML = h;
}
