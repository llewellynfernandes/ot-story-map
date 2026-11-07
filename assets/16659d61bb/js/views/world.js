/* World: what other nations were doing during each Old Testament era. */
import { SITE, ERAS, REGIONS, eraColor, regionColor } from "../site.js";
import { N } from "../i18n.js";
import { esc, refsHtml, t } from "../util.js";

export const title = N("World");
const START = 2200, END = 400;
const x = y => (START - Math.min(Math.max(y, END), START)) / (START - END) * 100;
const filter = { regions: null, tied: false };

function bar(name, from, to, row, color, cls = "") {
  if (to > START || from < END) return "";
  const left = x(from), w = Math.max(x(to) - left, .4);
  return `<span class="wbar ${cls}" title="${esc(name)}, ${from}–${to} ${esc(t("BC"))}" style="--c:${color};left:${left}%;width:${w}%;top:${row * 26}px">${esc(name)}</span>`;
}

export function render(root) {
  const W = SITE.world;
  const all = Object.keys(REGIONS);
  filter.regions ||= new Set(all);
  const bc = t("BC");
  let h = `<h2>${esc(t("The World Around Israel"))}</h2>
    <p class="lede">${esc(t("What other nations were doing during each era of the Old Testament. Scroll the chart sideways on a phone. Below it, each era lists events elsewhere; gold references mark where an event touches the Bible."))}</p>
    <div class="scroll"><div class="wchart">
      <div class="waxis"><span></span><div class="wtrack">${[2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600, 400].map(y => `<span class="tick" style="left:${x(y)}%">${y} ${esc(bc)}</span>`).join("")}</div></div>
      <div class="wlane"><span>${esc(t("Bible eras"))}</span><div class="wtrack" style="height:24px">${W.bibleBands.map(b => bar(b.label, b.from, b.to, 0, eraColor(b.era), "bible")).join("")}</div></div>`;

  for (const { key, name } of W.regions) {
    const lane = W.lanes[key] || [];
    const rows = Math.max(1, ...lane.map(z => (z.row || 0) + 1));
    h += `<div class="wlane"><span><span class="dot" style="--c:${regionColor(key)};margin-top:3px"></span>${esc(name)}</span>
      <div class="wtrack" style="height:${rows * 26 - 4}px">${lane.map(z => bar(z.name, z.from, z.to, z.row || 0, regionColor(key))).join("")}</div></div>`;
  }
  h += `<div class="wmarks"><span></span><div>${W.markers.map(m => `<span class="wnow" style="left:${x(m.year)}%"><span>${m.year} ${esc(m.label)}</span></span>`).join("")}</div></div>
    </div></div>
    <div class="wfilters">
      ${W.regions.map(r => `<button class="chip" data-region="${r.key}" style="--c:${regionColor(r.key)}" aria-pressed="${filter.regions.has(r.key)}">${esc(r.name)}</button>`).join("")}
      <button class="chip" data-tied style="--c:var(--gold)" aria-pressed="${filter.tied}">${esc(t("Bible links only"))}</button>
    </div>
    <div id="wlist"></div>`;
  root.innerHTML = h;

  const list = root.querySelector("#wlist");
  const draw = () => {
    let out = "";
    for (const s of W.sections) {
      const items = s.events.filter(i => filter.regions.has(i.region) && (!filter.tied || i.ref));
      if (!items.length) continue;
      const era = ERAS[s.era];
      out += `<section class="wsec" id="world-${s.era}" style="--c:${eraColor(s.era)}">
        <h3><span class="dot"></span>${esc(s.title || era.name)}</h3>
        <span class="era-meta num">${esc(s.dates || era.dates)}</span>
        <ul class="witems">${items.map(i => `<li class="witem">
          <span class="rchip" style="--c:${regionColor(i.region)}">${esc(REGIONS[i.region])}</span>
          <span class="when">${esc(i.date)}${/BC|AD|ई\./.test(i.date) ? "" : " " + esc(bc)}</span>
          <span>${esc(i.text)}${i.ref ? `<span class="tie">↔ ${refsHtml(i.ref)}</span>` : ""}</span></li>`).join("")}</ul>
        ${s.note && !filter.tied ? `<p class="wnote">${esc(s.note)}</p>` : ""}
      </section>`;
    }
    list.innerHTML = out || `<p class="empty">${esc(t("Nothing matches. Turn on more regions."))}</p>`;
  };

  root.addEventListener("click", e => {
    const rg = e.target.closest("[data-region]");
    if (rg) {
      const r = rg.dataset.region;
      if (filter.regions.size === all.length) filter.regions = new Set([r]);
      else if (filter.regions.has(r)) { filter.regions.delete(r); if (!filter.regions.size) filter.regions = new Set(all); }
      else filter.regions.add(r);
      root.querySelectorAll("[data-region]").forEach(b => b.setAttribute("aria-pressed", filter.regions.has(b.dataset.region)));
      draw();
    } else if (e.target.closest("[data-tied]")) {
      filter.tied = !filter.tied;
      e.target.closest("[data-tied]").setAttribute("aria-pressed", filter.tied);
      draw();
    }
  });
  draw();
}
