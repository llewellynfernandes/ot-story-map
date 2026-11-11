/* Journeys: people's travels on a map.

   Nothing is drawn until the visitor picks a journey. Then the whole route
   shows, and "Start journey" walks through it one stop at a time: the map
   stays put while the stops scroll past, flying from place to place and
   drawing the route as you go.

   Journeys are written in content/journeys.json and places in
   content/places.json. The map itself is drawn by journey-map.js. */
import { SITE, ERAS, eraColor } from "../site.js";
import { esc, personChip, refsHtml, reducedMotion, t } from "../util.js";
import { N, locale } from "../i18n.js";
import { loadD3 } from "../vendor.js";
import { createJourneyMap, journeyLegs, km } from "../journey-map.js";
import * as analytics from "../analytics.js";

export const title = N("Journeys");

/* Which journey is open, and whether it is being travelled. Kept while the page
   is open. Other parts of the site open a journey through "otmap:journey". */
const state = { id: null, mode: "overview" };
let keepMode = false;
let counted = null;      // the journey whose visit was last counted (analytics.js)
window.addEventListener("langchange", () => { keepMode = true; });

let basePromise;
const loadBase = () => (basePromise ||= fetch(new URL("../../maps/base.json", import.meta.url))
  .then(r => { if (!r.ok) throw new Error(`map ${r.status}`); return r.json(); })
  .catch(e => { basePromise = null; throw e; }));

const journeys = () => SITE.journeys || [];
const places = () => SITE.places.places;
const findJourney = id => journeys().find(j => j.id === id);

/* Total distance of the route, place to place, in km. */
function distance(j) {
  const P = places();
  return journeyLegs(j).reduce((sum, l) => sum + (l ? km(P[l.from], P[l.to]) : 0), 0);
}
const roundKm = n => (n < 100 ? Math.round(n / 5) * 5 : n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50);
const num = n => new Intl.NumberFormat(locale()).format(n);

/* The router calls render() once per visit to the tab; choosing a journey
   redraws the view inside it, so the cleanup always runs the latest one. */
let activeCleanup = null;
export function render(root) {
  mount(root);
  return () => { activeCleanup?.(); activeCleanup = null; };
}

function mount(root) {
  const asked = sessionStorage.getItem("otmap:journey");
  sessionStorage.removeItem("otmap:journey");
  if (asked && findJourney(asked)) { state.id = asked; state.mode = "overview"; }
  else if (!keepMode && state.mode === "travel") state.mode = "overview";
  keepMode = false;

  const j = state.id && findJourney(state.id);
  if (j && counted !== j.id) analytics.page(`/journeys/${j.id}`);
  counted = j ? j.id : null;
  if (!j) { state.id = null; activeCleanup = renderPicker(root); }
  else activeCleanup = renderJourney(root, j);
}

/* ---------- 1. choose a journey ---------- */

/* A small sketch of the route for the journey cards. */
function sketch(j) {
  const P = places();
  const pts = j.stops.map(s => P[s.place]);
  const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const xs = pts.map(p => p.lon * Math.cos(lat0 * Math.PI / 180)), ys = pts.map(p => -p.lat);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 96, H = 64, pad = 7;
  const s = Math.min((W - pad * 2) / (x1 - x0 || 1), (H - pad * 2) / (y1 - y0 || 1));
  const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
  const xy = pts.map((_, i) => [ox + (xs[i] - x0) * s, oy + (ys[i] - y0) * s]);
  const legs = journeyLegs(j);
  const idx = Object.fromEntries(j.stops.map((st, i) => [st.place, i]));
  const d = legs.map((l, i) => l ? `M${xy[idx[l.from] ?? i - 1].map(v => v.toFixed(1))}L${xy[i].map(v => v.toFixed(1))}` : "").join("");
  return `<svg class="jsketch" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <path d="${d}"/>
    <circle cx="${xy[0][0].toFixed(1)}" cy="${xy[0][1].toFixed(1)}" r="3" class="start"/>
    <circle cx="${xy.at(-1)[0].toFixed(1)}" cy="${xy.at(-1)[1].toFixed(1)}" r="3"/>
  </svg>`;
}

function renderPicker(root) {
  const byEra = SITE.eras.map(e => ({ era: e, list: journeys().filter(j => j.era === e.key) })).filter(g => g.list.length);
  root.innerHTML = `<h2>${esc(t("Journeys"))}</h2>
    <p class="lede">${esc(t("Choose a journey. The map shows the whole route, then takes you through it one stop at a time."))}</p>
    ${byEra.map(({ era, list }) => `<section class="jgroup">
      <h3 class="label"><span class="dot" style="--c:${eraColor(era.key)}"></span>${esc(era.name)} · <span class="num">${esc(era.dates)}</span></h3>
      <div class="jcards">${list.map(j => {
        const P = places();
        const first = P[j.stops[0].place].name, last = P[j.stops.at(-1).place].name;
        return `<button class="jcard" data-journey="${j.id}" style="--c:${eraColor(j.era)}">
          ${sketch(j)}
          <span class="jcard-text">
            <span class="jcard-title">${esc(j.title)}</span>
            <span class="jcard-sum">${esc(j.summary)}</span>
            <span class="jcard-meta">${esc(first)} → ${esc(last)} · ${esc(t("{n} stops", { n: j.stops.length }))}</span>
          </span>
        </button>`;
      }).join("")}</div>
    </section>`).join("")}`;

  root.addEventListener("click", e => {
    const c = e.target.closest("[data-journey]");
    if (!c) return;
    state.id = c.dataset.journey;
    state.mode = "overview";
    rerender(root);
    window.scrollTo(0, 0);
  });
}

function rerender(root) {
  // Swap in a fresh view element, as the router does, so old listeners go away.
  activeCleanup?.();
  const fresh = root.cloneNode(false);
  root.replaceWith(fresh);
  keepMode = true;
  mount(fresh);
}

/* ---------- 2. one journey: the whole route, then stop by stop ---------- */

const CERTAINTY = {
  likely: N("Likely site"),
  debated: N("Site uncertain"),
  region: N("Area"),
};

function legend(j) {
  const exile = j.stops.some(s => s.leg === "exile");
  return `<div class="jm-legend" aria-hidden="true">
    <span><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="4.5" class="lg-sure"/></svg>${esc(t("Known site"))}</span>
    <span><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="4.5" class="lg-debated"/></svg>${esc(t("Site uncertain"))}</span>
    <span><svg viewBox="0 0 22 14"><path d="M1 7h20" class="lg-travel"/></svg>${esc(t("Journey"))}</span>
    ${exile ? `<span><svg viewBox="0 0 22 14"><path d="M1 7h20" class="lg-exile"/></svg>${esc(t("Carried into exile"))}</span>` : ""}
  </div>`;
}

function stopCard(j, s, i) {
  const pl = places()[s.place];
  const name = s.name || pl.name;
  const cert = CERTAINTY[pl.certainty];
  return `<article class="jstep" data-step="${i}">
    <div class="jstep-card">
      <span class="label num">${esc(t("Stop {n} of {total}", { n: i + 1, total: j.stops.length }))}</span>
      <h3>${esc(name)}${s.name && s.name !== pl.name ? ` <small>${esc(pl.name)}</small>` : ""}</h3>
      <p class="jstep-text">${esc(s.text)}</p>
      <div class="jstep-ref">${refsHtml(s.ref)}</div>
      ${s.people?.length ? `<div class="chips">${s.people.map(personChip).join("")}</div>` : ""}
      ${cert || pl.today || pl.note ? `<p class="jstep-site">
        ${cert ? `<span class="jcert ${pl.certainty}">${esc(t(cert))}</span>` : ""}
        ${pl.today ? `<span>${esc(t("Today: {site}", { site: pl.today }))}</span>` : ""}
        ${pl.note ? `<span>${esc(pl.note)}</span>` : ""}
      </p>` : ""}
    </div>
  </article>`;
}

function renderJourney(root, j) {
  const travel = state.mode === "travel";
  const era = ERAS[j.era];
  const P = places();
  const dist = roundKm(distance(j));
  const others = journeys().filter(x => x.id !== j.id);
  const nextJ = others[(journeys().indexOf(j)) % others.length];

  root.innerHTML = `<div class="jview${travel ? " traveling" : ""}" style="--c:${eraColor(j.era)}">
    <button class="jback" data-jback>← ${esc(t("All journeys"))}</button>
    <div class="jhead">
      <span class="era-tag"><span class="dot"></span><span class="label">${esc(era.name)} · ${esc(j.dates)}</span></span>
      <h2>${esc(j.title)}</h2>
      <p class="jsum">${esc(j.summary)}</p>
      <p class="jmeta num">${esc(t("{n} stops", { n: j.stops.length }))} · ${esc(t("about {km} km in straight lines", { km: num(dist) }))}</p>
      <div class="chips">${j.people.map(personChip).join("")}</div>
    </div>
    ${travel ? `
      <div class="jtravel">
        <div class="jmapcol"><div class="jmap" id="jMap">
          <div class="jm-tools">
            <button class="btn small" data-joverview>${esc(t("Whole route"))}</button>
          </div>
          <div class="jm-step-nav">
            <button class="icon-btn" data-jstep="-1" aria-label="${esc(t("Previous stop"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>
            <button class="icon-btn" data-jstep="1" aria-label="${esc(t("Next stop"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
          </div>
          ${legend(j)}
          <p class="sr" id="jStatus" aria-live="polite"></p>
        </div></div>
        <div class="jsteps">
          <p class="jscroll-hint">${esc(t("Scroll down to travel from stop to stop."))} ↓</p>
          ${j.stops.map((s, i) => stopCard(j, s, i)).join("")}
          <div class="jend">
            <span class="label">${esc(t("Journey complete"))}</span>
            <h3>${esc(j.title)}</h3>
            <div class="jend-actions">
              <button class="btn" data-joverview>${esc(t("See the whole route"))}</button>
              <button class="btn" data-jrestart>${esc(t("Start again"))}</button>
              ${nextJ ? `<button class="btn primary" data-journey="${nextJ.id}">${esc(t("Next journey: {title}", { title: nextJ.title }))} →</button>` : ""}
              <button class="btn" data-jback>${esc(t("All journeys"))}</button>
            </div>
          </div>
        </div>
      </div>` : `
      <div class="jmap jmap-overview" id="jMap">${legend(j)}</div>
      <div class="jstart-row">
        <button class="btn primary jstart" data-jstart>${esc(t("Start journey"))} <span aria-hidden="true">▸</span></button>
      </div>
      <ol class="jstops">${j.stops.map((s, i) => `<li><button data-jgo="${i}"><span class="n num">${i + 1}</span>${esc(s.name || P[s.place].name)}</button></li>`).join("")}</ol>`}
    <p class="jcredit">${esc(t("Map drawn from Natural Earth. Places from OpenBible.info (CC BY 4.0). Many ancient sites are uncertain."))}</p>
  </div>`;

  const mapBox = root.querySelector("#jMap");
  let finished = false, map = null, alive = true, raf = 0, steps = [], current = -1;
  const still = reducedMotion();
  const listeners = [];
  const on = (target, type, fn, opt) => { target.addEventListener(type, fn, opt); listeners.push(() => target.removeEventListener(type, fn, opt)); };

  /* Where on screen a stop counts as "reached". */
  function readingLine() {
    const col = root.querySelector(".jmapcol");
    const r = col.getBoundingClientRect();
    const stacked = getComputedStyle(root.querySelector(".jtravel")).display !== "grid";
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
    return stacked ? r.bottom + (innerHeight - r.bottom) * 0.18 : headerH + (innerHeight - headerH) * 0.55;
  }
  const anchors = () => steps.map(s => s.getBoundingClientRect().top);

  /* Page scroll → position along the route. */
  function progress() {
    const line = readingLine();
    const a = anchors();
    if (!a.length) return 0;
    if (line < a[0]) {
      const D = innerHeight * 0.4;
      return -1 + Math.max(0, Math.min(1, (line - (a[0] - D)) / D));
    }
    let i = a.length - 1;
    while (i > 0 && a[i] > line) i--;
    if (i === a.length - 1) return i;
    return i + (line - a[i]) / (a[i + 1] - a[i]);
  }

  function frame() {
    raf = 0;
    if (!map) return;
    if (!travel) { map.draw(0, { overview: true }); return; }
    const cur = map.draw(progress());
    if (cur !== current) {
      current = cur;
      if (cur === j.stops.length - 1 && !finished) { finished = true; analytics.event(`journey-finish/${j.id}`); }
      steps.forEach((s, i) => s.classList.toggle("active", i === cur));
      const s = j.stops[cur];
      const status = root.querySelector("#jStatus");
      if (status && s) status.textContent = `${cur + 1} / ${j.stops.length} · ${s.name || P[s.place].name}`;
    }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };

  /* Scroll so that stop i sits on the reading line. */
  function goTo(i, smooth = !still) {
    const s = steps[Math.max(0, Math.min(i, steps.length - 1))];
    if (!s) return;
    const y = window.scrollY + s.getBoundingClientRect().top - readingLine() + 2;
    window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
  }

  function onPlace(id) {
    if (!travel) { start(j.stops.findIndex(s => s.place === id)); return; }
    const later = j.stops.findIndex((s, i) => s.place === id && i > current);
    goTo(later >= 0 ? later : j.stops.findIndex(s => s.place === id));
  }

  function start(i = 0) {
    analytics.event(`journey-start/${j.id}`);
    state.mode = "travel";
    rerender(root);
    // The new view is in the page now; scroll it so the chosen stop is in place.
    requestAnimationFrame(() => {
      const view = document.getElementById("view");
      const top = view.querySelector(".jtravel");
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
      if (i > 0) view._goTo?.(i, false);
      else window.scrollTo({ top: window.scrollY + top.getBoundingClientRect().top - headerH - 8, behavior: "auto" });
    });
  }
  root._goTo = goTo;

  on(root, "click", e => {
    if (e.target.closest("[data-jback]")) { state.id = null; rerender(root); window.scrollTo(0, 0); return; }
    if (e.target.closest("[data-jstart]")) { start(0); return; }
    if (e.target.closest("[data-jrestart]")) { goTo(0); return; }
    const go = e.target.closest("[data-jgo]");
    if (go) { start(+go.dataset.jgo); return; }
    if (e.target.closest("[data-joverview]")) { state.mode = "overview"; rerender(root); window.scrollTo(0, 0); return; }
    const st = e.target.closest("[data-jstep]");
    if (st) { goTo(Math.max(0, current) + +st.dataset.jstep); return; }
    const other = e.target.closest("[data-journey]");
    if (other) { state.id = other.dataset.journey; state.mode = "overview"; rerender(root); window.scrollTo(0, 0); }
  });

  Promise.all([loadD3(), loadBase()]).then(([d3, base]) => {
    if (!alive) return;
    map = createJourneyMap({
      d3, base, container: mapBox, journey: j, places: P, labels: SITE.places.labels,
      color: eraColor(j.era), era: j.era, still, onPlace,
    });
    steps = [...root.querySelectorAll(".jstep")];
    frame();
    const ro = new ResizeObserver(() => { map.resize(); schedule(); });
    ro.observe(mapBox);
    listeners.push(() => ro.disconnect());
    if (travel) { on(window, "scroll", schedule, { passive: true }); on(window, "resize", schedule); }
  }).catch(err => {
    console.error(err);
    mapBox.insertAdjacentHTML("afterbegin", `<p class="jm-error">${esc(t("The map couldn't load. Check your connection and reload the page."))}</p>`);
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    listeners.forEach(off => off());
    map?.destroy();
  };
}
