/* Draws one journey on the map of Bible lands, using d3's map projections.

   The map has two layers:
   - the land, lakes and rivers (data/maps/base.json), drawn once and moved
     with a single transform, so zooming stays smooth on phones;
   - the route, place markers and names, worked out again for every frame in
     screen pixels, so lines and text keep the same size at any zoom.

   draw(progress) shows the journey part-way through: 2 means "at the third
   stop", 2.5 means "half-way to the fourth". The view in views/journeys.js
   turns page scrolling into that number. */
import { t } from "./util.js";

const BASE_W = 1000;            // the whole map is laid out 1000 units wide
const PAD = 0.32;               // room around the places in view
const SVG = "http://www.w3.org/2000/svg";

let cachedBase = null;          // { projection, size, land, lakes, rivers } for the loaded base map

function prepareBase(d3, base) {
  if (cachedBase?.data === base) return cachedBase;
  const [w, s, e, n] = base.bbox;
  const projection = d3.geoMercator().fitWidth(BASE_W, { type: "MultiPoint", coordinates: [[w, s], [e, n]] });
  const [[x0, y0], [x1, y1]] = d3.geoPath(projection).bounds({ type: "MultiPoint", coordinates: [[w, s], [e, n]] });
  projection.translate([projection.translate()[0] - x0, projection.translate()[1] - y0]);
  const path = d3.geoPath(projection);
  cachedBase = {
    data: base,
    projection,
    size: [x1 - x0, y1 - y0],
    land: path(base.land),
    lakes: path(base.lakes),
    rivers: base.rivers.features.map(f => path(f)).join(""),
  };
  return cachedBase;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
};

/* The legs of a journey: where each stop is reached from, and how. */
export function journeyLegs(journey) {
  let at = null;
  return journey.stops.map(s => {
    const type = s.leg || "travel";
    const from = s.from || at;
    at = s.place;
    return type !== "none" && from && from !== s.place ? { from, to: s.place, type } : null;
  });
}

/* Straight-line distance in km between two places. */
export function km(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* opts: { d3, base, container, journey, places, labels, color, era, still, onPlace } */
export function createJourneyMap(opts) {
  const { d3, container, journey, places, color, still } = opts;
  const B = prepareBase(d3, opts.base);
  const proj = p => B.projection([p.lon, p.lat]);
  const stops = journey.stops;
  const legs = journeyLegs(journey);
  const placeIds = [...new Set(stops.flatMap((s, i) => [s.place, legs[i]?.from].filter(Boolean)))];
  const P = Object.fromEntries(placeIds.map(id => [id, { id, ...places[id], xy: proj(places[id]) }]));
  const firstVisit = id => stops.findIndex(s => s.place === id);

  /* ---------- views: [centre x, centre y, width] in map units ---------- */
  let sw = 1, sh = 1;
  const degW = BASE_W / (opts.base.bbox[2] - opts.base.bbox[0]);
  function fit(points, minDeg) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const aspect = sh / sw;
    let w = Math.max(x1 - x0, (y1 - y0) / aspect) * (1 + PAD * 2);
    w = Math.max(w, minDeg * degW);
    return limit([(x0 + x1) / 2, (y0 + y1) / 2, w]);
  }
  // Keep the view over the map, so its edges never show.
  function limit([cx, cy, w]) {
    const [mw, mh] = B.size;
    w = Math.min(w, mw, mh * sw / sh);
    const h = w * sh / sw;
    return [clamp(cx, w / 2, mw - w / 2), clamp(cy, h / 2, mh - h / 2), w];
  }
  let views = [], overviewView, zooms = [];
  function computeViews() {
    const minFor = id => (P[id].certainty === "region" ? 4.5 : 1.4);
    views = stops.map((s, i) => {
      const ids = [s.place, legs[i]?.from].filter(Boolean);
      return fit(ids.map(id => P[id].xy), Math.max(...ids.map(minFor)));
    });
    overviewView = fit(placeIds.map(id => P[id].xy), 3);
    zooms = views.map((v, i) => (i + 1 < views.length ? d3.interpolateZoom(v, views[i + 1]) : null));
    zooms.intro = d3.interpolateZoom(overviewView, views[0]);
  }

  /* ---------- the drawing ---------- */
  container.querySelector("svg.jm")?.remove();
  const svg = el("svg", { class: "jm", role: "img", "aria-label": t("Map of {title}", { title: journey.title }) });
  container.prepend(svg);
  el("rect", { class: "jm-sea", x: -5000, y: -5000, width: 10000, height: 10000 }, svg);
  const gBase = el("g", {}, svg);
  el("path", { class: "jm-land", d: B.land }, gBase);
  el("path", { class: "jm-lake", d: B.lakes }, gBase);
  el("path", { class: "jm-river", d: B.rivers }, gBase);
  const gLabels = el("g", { class: "jm-labels" }, svg);
  const gLegs = el("g", { class: "jm-legs" }, svg);
  const gMarks = el("g", { class: "jm-marks" }, svg);
  const gNames = el("g", { class: "jm-names" }, svg);
  svg.style.setProperty("--route", color);

  const legEls = legs.map(l => l && {
    line: el("path", { class: `jm-leg ${l.type}` }, gLegs),
    arrow: el("path", { class: "jm-arrow" }, gLegs),
  });
  const traveler = el("circle", { class: "jm-traveler", r: 6 }, gMarks);
  const markEls = Object.fromEntries(placeIds.filter(id => firstVisit(id) >= 0).map(id => {
    const g = el("g", { class: `jm-mark ${P[id].certainty}`, "data-place": id }, gMarks);
    el("circle", { class: "halo", r: 15 }, g);
    el("circle", { class: "dot", r: P[id].certainty === "region" ? 16 : 5.5 }, g);
    el("circle", { class: "hit", r: 16 }, g);
    return [id, g];
  }));
  if (opts.onPlace) gMarks.addEventListener("click", e => {
    const m = e.target.closest("[data-place]");
    if (m) opts.onPlace(m.dataset.place);
  });

  // Map labels: region and water names, filtered to this journey's era.
  const areaLabels = opts.labels.filter(l => !l.eras || l.eras.includes(opts.era));
  const labelEls = areaLabels.map(l => {
    const n = el("text", { class: `jm-area ${l.kind} s${l.size}` }, gLabels);
    n.textContent = l.name;
    if (l.alt) { const a = el("tspan", { class: "alt", dy: "1.15em" }, n); a.textContent = l.alt; }
    return { ...l, node: n, xy: proj(l) };
  });
  const nameEls = Object.fromEntries(placeIds.map(id => [id, el("text", { class: "jm-name" }, gNames)]));

  // Scale bar
  const gScale = el("g", { class: "jm-scale" }, svg);
  const scaleLine = el("path", {}, gScale);
  const scaleText = el("text", { y: -6 }, gScale);

  /* Text widths, measured once per label. */
  const ctx = document.createElement("canvas").getContext("2d");
  const font = getComputedStyle(container).fontFamily;
  const widths = new Map();
  const measure = (text, px, weight) => {
    const key = `${weight}|${px}|${text}`;
    if (!widths.has(key)) { ctx.font = `${weight} ${px}px ${font}`; widths.set(key, ctx.measureText(text).width); }
    return widths.get(key);
  };

  function resize() {
    const r = container.getBoundingClientRect();
    sw = Math.max(1, r.width); sh = Math.max(1, r.height);
    svg.setAttribute("viewBox", `0 0 ${sw} ${sh}`);
    svg.setAttribute("width", sw); svg.setAttribute("height", sh);
    computeViews();
  }
  resize();

  /* A leg as a gentle curve, so out-and-back trips don't draw on top of each other. */
  function curve(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const bend = Math.min(len * 0.16, 60);
    const c = [(a[0] + b[0]) / 2 - (dy / (len || 1)) * bend, (a[1] + b[1]) / 2 + (dx / (len || 1)) * bend];
    return { a, b, c, len };
  }
  const at = ({ a, b, c }, s) => {
    const p = [a[0] + (c[0] - a[0]) * s, a[1] + (c[1] - a[1]) * s];
    const q = [c[0] + (b[0] - c[0]) * s, c[1] + (b[1] - c[1]) * s];
    return { p, q, pt: [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s] };
  };
  const partial = (cv, s) => {
    const { p, pt } = at(cv, s);
    return `M${cv.a[0].toFixed(1)},${cv.a[1].toFixed(1)}Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
  };
  const arrowAt = (cv, s) => {
    const { p, q, pt } = at(cv, s);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const pts = [[6, 0], [-4, -4.5], [-4, 4.5]].map(([x, y]) =>
      [pt[0] + x * Math.cos(ang) - y * Math.sin(ang), pt[1] + x * Math.sin(ang) + y * Math.cos(ang)]);
    return `M${pts.map(p2 => p2.map(v => v.toFixed(1)).join(",")).join("L")}Z`;
  };

  /* ---------- one frame ---------- */
  // mode "overview": the whole route. Otherwise progress runs from -1 (overview)
  // through 0 (first stop) to stops.length - 1 (last stop).
  function draw(progress, { overview = false } = {}) {
    let view, cur, drawn, partialLeg = -1, partialAmt = 0;
    if (overview) {
      view = overviewView; cur = -1; drawn = stops.length - 1;
    } else if (progress < 0) {
      const s = clamp(progress + 1, 0, 1);
      view = zooms.intro(still ? (s < 0.5 ? 0 : 1) : ease(s));
      cur = 0; drawn = 0;
    } else {
      const i = Math.min(Math.floor(progress), stops.length - 1);
      let f = progress - i;
      // Stay at a stop for the first part of the scroll, then travel.
      let g = clamp((f - 0.25) / 0.65, 0, 1);
      if (still) g = g < 0.5 ? 0 : 1;
      view = zooms[i] ? zooms[i](ease(g)) : views[i];
      const amt = clamp((g - 0.05) / 0.85, 0, 1);
      drawn = i;
      cur = amt >= 1 && i + 1 < stops.length ? i + 1 : i;
      if (amt >= 1) drawn = cur;
      else if (amt > 0 && i + 1 < stops.length) { partialLeg = i + 1; partialAmt = amt; }
    }
    view = limit(view);

    const k = sw / view[2];
    const tx = sw / 2 - view[0] * k, ty = sh / 2 - view[1] * k;
    gBase.setAttribute("transform", `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${k.toFixed(5)})`);
    const S = xy => [xy[0] * k + tx, xy[1] * k + ty];
    const spanDeg = view[2] / degW;

    // Route
    let travelerAt = null;
    legs.forEach((l, i) => {
      const e = legEls[i];
      if (!e) return;
      const cv = curve(S(P[l.from].xy), S(P[l.to].xy));
      if (i <= drawn) {
        e.line.setAttribute("d", partial(cv, 1));
        e.arrow.setAttribute("d", cv.len > 40 ? arrowAt(cv, 0.55) : "");
        e.line.classList.remove("hide"); e.arrow.classList.remove("hide");
      } else if (i === partialLeg) {
        e.line.setAttribute("d", partial(cv, partialAmt));
        e.arrow.setAttribute("d", "");
        e.line.classList.remove("hide");
        travelerAt = at(cv, partialAmt).pt;
      } else {
        e.line.classList.add("hide"); e.arrow.classList.add("hide");
      }
    });
    if (!overview && !travelerAt && cur >= 0 && !stops[cur].leg?.includes("none")) travelerAt = S(P[stops[cur].place].xy);
    traveler.classList.toggle("hide", overview || !travelerAt || partialLeg < 0);
    if (travelerAt) { traveler.setAttribute("cx", travelerAt[0]); traveler.setAttribute("cy", travelerAt[1]); }

    // Markers
    const currentPlace = cur >= 0 ? stops[cur].place : null;
    for (const [id, g] of Object.entries(markEls)) {
      const [x, y] = S(P[id].xy);
      g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      const visited = overview || stops.some((s, i) => s.place === id && i <= Math.max(cur, drawn));
      g.classList.toggle("visited", visited);
      g.classList.toggle("current", id === currentPlace);
    }

    // Names: the current place first, then places already visited, then the rest.
    const boxes = [];
    const inside = b => b.x0 >= 2 && b.y0 >= 2 && b.x1 <= sw - 2 && b.y1 <= sh - 2;
    const free = b => inside(b) && !boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    for (const id of Object.keys(markEls)) {
      const [x, y] = S(P[id].xy);
      const r = P[id].certainty === "region" ? 6 : 6;
      boxes.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });
    }
    const order = placeIds.filter(id => firstVisit(id) >= 0).map(id => {
      const visits = stops.map((s, i) => (s.place === id ? i : -1)).filter(i => i >= 0);
      const past = visits.filter(i => i <= cur);
      const rank = id === currentPlace ? 0 : overview ? 1 + visits[0] / 100 : past.length ? 1 + (cur - Math.max(...past)) / 100 : 3 + visits[0] / 100;
      return { id, rank };
    }).sort((a, b) => a.rank - b.rank);
    for (const { id, rank } of order) {
      const node = nameEls[id];
      const isCur = rank === 0;
      const stopName = isCur ? stops[cur].name : null;
      const text = stopName || P[id].name;
      const px = isCur ? 15 : 12.5, weight = isCur ? 700 : 500;
      const w = measure(text, px, weight), h = px * 1.05;
      const [x, y] = S(P[id].xy);
      const off = P[id].certainty === "region" ? 20 : 10;
      const spots = [[x + off, y + h * 0.35, "start"], [x - off, y + h * 0.35, "end"], [x, y - off - 2, "middle"], [x, y + off + h * 0.8, "middle"]];
      let placed = false;
      // The current place always gets its name: the first free spot, else the
      // first that fits on screen, else to the right.
      const box = ([lx, ly, anchor]) => {
        const x0 = anchor === "start" ? lx : anchor === "end" ? lx - w : lx - w / 2;
        return { x0: x0 - 2, y0: ly - h * 0.85, x1: x0 + w + 2, y1: ly + h * 0.25 };
      };
      const forced = isCur && !spots.some(sp => free(box(sp))) ? (spots.find(sp => inside(box(sp))) || spots[0]) : null;
      for (const [lx, ly, anchor] of spots) {
        const b = box([lx, ly, anchor]);
        if (free(b) || forced?.[0] === lx && forced?.[1] === ly) {
          boxes.push(b);
          node.textContent = text;
          node.setAttribute("x", lx.toFixed(1)); node.setAttribute("y", ly.toFixed(1));
          node.setAttribute("text-anchor", anchor);
          node.setAttribute("class", `jm-name${isCur ? " cur" : rank >= 3 ? " future" : ""}`);
          placed = true;
          break;
        }
      }
      node.classList.toggle("hide", !placed);
    }

    // Region and water names, sized to the zoom level.
    for (const l of labelEls) {
      const show = l.size === 1 ? spanDeg > 5 : spanDeg < 9;
      if (!show) { l.node.classList.add("hide"); continue; }
      const [x, y] = S(l.xy);
      const px = l.size === 1 ? 13 : 11.5;
      const w = Math.max(measure(l.name.toUpperCase(), px, 600) * 1.12, l.alt ? measure(l.alt, px, 400) : 0);
      const lines = l.alt ? 2 : 1;
      const b = { x0: x - w / 2 - 2, y0: y - px, x1: x + w / 2 + 2, y1: y + px * 0.3 + (lines - 1) * px * 1.15 };
      if (!free(b)) { l.node.classList.add("hide"); continue; }
      boxes.push(b);
      l.node.classList.remove("hide");
      l.node.setAttribute("x", x.toFixed(1)); l.node.setAttribute("y", y.toFixed(1));
      l.node.querySelector("tspan")?.setAttribute("x", x.toFixed(1));
    }

    drawScale(k, tx, ty);
    return cur;
  }

  /* Scale bar in kilometres, bottom left. */
  function drawScale(k, tx, ty) {
    const y = sh - 14, x = 14;
    const toGeo = sx => B.projection.invert([(sx - tx) / k, (y - ty) / k]);
    const kmPerPx = d3.geoDistance(toGeo(x), toGeo(x + 100)) * 6371 / 100;
    const target = kmPerPx * Math.min(120, sw * 0.28);
    const nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].reverse().find(n => n <= target) || 5;
    const len = nice / kmPerPx;
    scaleLine.setAttribute("d", `M${x},${y - 4}V${y}H${(x + len).toFixed(1)}V${y - 4}`);
    scaleText.setAttribute("x", x);
    scaleText.setAttribute("y", y - 7);
    scaleText.textContent = t("{n} km", { n: nice });
  }

  return {
    draw,
    resize,
    destroy: () => svg.remove(),
  };
}
