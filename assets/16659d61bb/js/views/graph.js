/* Connections: an interactive map of how everyone is linked, in the spirit of
   Obsidian's graph view. Drag people around, zoom, hover to see neighbors,
   tap someone to focus on them. Uses d3 (loaded only when this tab opens). */
import { SITE, PEOPLE, ERAS, ERA_KEYS, eraColor } from "../site.js";
import { buildGraph, LINK_TYPES } from "../graph-data.js";
import { esc, refsHtml, reducedMotion, lineOfJesus, t } from "../util.js";
import { lang, N } from "../i18n.js";

export const title = N("Connections");

const TYPE = Object.fromEntries(LINK_TYPES.map(lt => [lt.id, lt]));
const DISTANCE = { marriage: 34, family: 46, kin: 56, mentor: 62, flow: 80, era: 110 };

/* Kept while the page is open, so coming back to the tab doesn't reshuffle everything.
   When the language changes, names are refreshed but positions stay put. */
let base, builtFor = null;
const nodeById = new Map();
const hubs = new Map();
function refreshGraph() {
  if (builtFor === lang) return;
  builtFor = lang;
  base = buildGraph(SITE);
  base.nodes = base.nodes.map(n => {
    const kept = nodeById.get(n.id);
    if (kept) { kept.name = n.name; kept.degree = n.degree; return kept; }
    nodeById.set(n.id, n);
    return n;
  });
  for (const e of SITE.eras) {
    const hub = hubs.get(e.key) || { id: `era:${e.key}`, hub: true, era: e.key, degree: 0 };
    hub.name = e.name;
    hubs.set(e.key, hub);
  }
}
const settings = {
  eras: new Set(ERA_KEYS),
  types: new Set(LINK_TYPES.map(lt => lt.id)),
  hubs: false,
  timeline: false,
  local: false,
  line: false,
  depth: 1,
  selected: null,
  transform: null,
  laidOut: false,
};

let d3Promise;
function loadD3() {
  if (window.d3) return Promise.resolve(window.d3);
  d3Promise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = new URL("../../vendor/d3.min.js", import.meta.url).href;
    s.onload = () => resolve(window.d3);
    s.onerror = () => { d3Promise = null; reject(new Error("d3 failed to load")); };
    document.head.append(s);
  });
  return d3Promise;
}

const radius = d => d.hub ? 14 : 6 + Math.sqrt(d.degree) * 2.6;
const isMajor = d => d.hub || d.degree >= 6;
const linkKey = l => `${l.source.id ?? l.source}|${l.target.id ?? l.target}`;

export function render(root) {
  refreshGraph();
  root.innerHTML = `<h2>${esc(t("Connections"))}</h2>
    <p class="lede">${esc(t("Everyone in the guide and how they're linked: family, marriage, mentors, and who comes next in the story. Drag to move, scroll or pinch to zoom, and tap a person to focus on them."))}</p>
    <div class="graph-tools">
      <div class="row">
        <label class="sr" for="gSearch">${esc(t("Find a person"))}</label>
        <input class="graph-search" id="gSearch" type="search" list="gNames" placeholder="${esc(t("Find a person"))}" autocomplete="off">
        <datalist id="gNames">${base.nodes.map(n => `<option value="${esc(n.name)}">`).join("")}</datalist>
        <label class="toggle"><input type="checkbox" id="gTimeline" ${settings.timeline ? "checked" : ""}> ${esc(t("Arrange by era"))}</label>
        <label class="toggle"><input type="checkbox" id="gHubs" ${settings.hubs ? "checked" : ""}> ${esc(t("Show eras"))}</label>
        <label class="toggle"><input type="checkbox" id="gLine" ${settings.line ? "checked" : ""}> ✦ ${esc(t("Highlight Jesus' family line"))}</label>
        <label class="toggle"><input type="checkbox" id="gLocal" ${settings.local ? "checked" : ""}> ${esc(t("Only the selected person's links"))}</label>
        <label class="toggle" id="gDepthWrap" ${settings.local ? "" : "hidden"}>${esc(t("Depth"))}
          <select id="gDepth"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      </div>
      <div class="row"><span class="label">${esc(t("Links"))}</span>
        ${LINK_TYPES.map(lt => `<button class="ltype${lt.dashed ? " dashed" : ""}" data-type="${lt.id}" style="--lc:${lt.color}" aria-pressed="${settings.types.has(lt.id)}"><i></i>${esc(t(lt.label))}</button>`).join("")}
      </div>
      <div class="row"><span class="label">${esc(t("Eras"))}</span>
        ${SITE.eras.map(e => `<button class="chip" data-era="${e.key}" style="--c:${eraColor(e.key)}" aria-pressed="${settings.eras.has(e.key)}">${esc(e.name)}</button>`).join("")}
      </div>
    </div>
    <div class="graph-wrap" id="gWrap">
      <p class="graph-hint" id="gHint">${esc(t("Loading the graph…"))}</p>
      <div class="graph-zoom">
        <button class="icon-btn" data-zoom="in" aria-label="${esc(t("Zoom in"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
        <button class="icon-btn" data-zoom="out" aria-label="${esc(t("Zoom out"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
        <button class="icon-btn" data-zoom="fit" aria-label="${esc(t("Fit everyone in view"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      </div>
      <div class="graph-card" id="gCard" hidden></div>
    </div>
    <p class="graph-stats" id="gStats"></p>`;
  root.querySelector("#gDepth").value = String(settings.depth);

  let cleanup = () => {};
  let alive = true;
  loadD3().then(d3 => { if (alive) cleanup = mount(d3, root); })
    .catch(err => { console.error(err); root.querySelector("#gHint").textContent = t("The graph couldn't load. Check your connection and reload the page."); });
  return () => { alive = false; cleanup(); };
}

function mount(d3, root) {
  const wrap = root.querySelector("#gWrap");
  const card = root.querySelector("#gCard");
  const hint = root.querySelector("#gHint");
  const stats = root.querySelector("#gStats");
  const still = reducedMotion();

  const svg = d3.select(wrap).insert("svg", ".graph-zoom").attr("role", "img").attr("aria-label", t("Graph of connections between people"));
  const scene = svg.append("g");
  const gLinks = scene.append("g");
  const gNodes = scene.append("g");

  let nodes = [], links = [], neighbors = new Map(), hoverId = null;
  let linkSel = gLinks.selectAll("line"), nodeSel = gNodes.selectAll("g.node");

  const sim = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id))
    .force("charge", d3.forceManyBody().strength(d => d.hub ? -600 : -150).distanceMax(320))
    .force("collide", d3.forceCollide(d => radius(d) + 4))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .on("tick", ticked);
  sim.stop();

  const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", e => {
    scene.attr("transform", e.transform);
    settings.transform = e.transform;
    wrap.classList.toggle("zoomed", e.transform.k >= 1.35);
  });
  svg.call(zoom).on("dblclick.zoom", null);
  svg.on("click", e => { if (e.target === svg.node()) select(null); });

  const drag = d3.drag()
    .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });

  function ticked() {
    linkSel.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
  }

  /* Who is within `depth` steps of id, using the links currently shown. */
  function neighborhood(id, depth) {
    const seen = new Set([id]);
    let frontier = [id];
    for (let i = 0; i < depth; i++) {
      const next = [];
      for (const n of frontier) for (const m of neighbors.get(n) || []) if (!seen.has(m)) { seen.add(m); next.push(m); }
      frontier = next;
    }
    return seen;
  }

  /* Work out what's visible from the filters, then (re)start the layout. */
  function update({ reheat = 0.6 } = {}) {
    let visible = base.nodes.filter(n => settings.eras.has(n.era));
    const ids = new Set(visible.map(n => n.id));
    let vis = base.links.filter(l => settings.types.has(l.type) && ids.has(l.source) && ids.has(l.target));

    neighbors = new Map();
    for (const l of vis) {
      if (!neighbors.has(l.source)) neighbors.set(l.source, new Set());
      if (!neighbors.has(l.target)) neighbors.set(l.target, new Set());
      neighbors.get(l.source).add(l.target);
      neighbors.get(l.target).add(l.source);
    }

    if (settings.local && settings.selected && ids.has(settings.selected)) {
      const keep = neighborhood(settings.selected, settings.depth);
      visible = visible.filter(n => keep.has(n.id));
      vis = vis.filter(l => keep.has(l.source) && keep.has(l.target));
    }

    nodes = visible.map(n => nodeById.get(n.id));
    links = vis.map(l => ({ ...l }));   // copies: d3 replaces source/target with node objects
    if (settings.hubs) {
      const shown = new Set(nodes.map(n => n.era));
      for (const key of shown) {
        const hub = hubs.get(key);
        nodes.push(hub);
        for (const n of visible) if (n.era === key) links.push({ source: n.id, target: hub.id, type: "era", types: ["era"], era: key });
      }
    }

    // Arrange by era: pull each era toward its own column, oldest on the left.
    const spacing = 150, mid = (ERA_KEYS.length - 1) / 2;
    sim.force("x").x(d => settings.timeline ? (ERA_KEYS.indexOf(d.era) - mid) * spacing : 0).strength(settings.timeline ? 0.25 : 0.09);
    sim.force("y").y(0).strength(settings.timeline ? 0.1 : 0.09);
    sim.nodes(nodes);   // nodes first: the link force looks people up by id
    sim.force("link").links(links)
      .distance(l => DISTANCE[l.type] || 60)
      .strength(l => l.type === "era" ? 0.08 : l.type === "flow" ? 0.25 : 0.6);

    linkSel = gLinks.selectAll("line").data(links, linkKey).join("line")
      .attr("class", d => `link ${d.type}`)
      .style("--lc", d => d.type === "era" ? eraColor(d.era) : TYPE[d.type].color);

    nodeSel = gNodes.selectAll("g.node").data(nodes, d => d.id).join(enter => {
      const g = enter.append("g").attr("tabindex", 0).attr("role", "button");
      g.append("circle");
      g.append("text").attr("y", 4);
      g.call(drag)
        .on("click", (e, d) => { e.stopPropagation(); if (!d.hub) select(d.id === settings.selected ? null : d.id); })
        .on("keydown", (e, d) => { if ((e.key === "Enter" || e.key === " ") && !d.hub) { e.preventDefault(); select(d.id); } })
        .on("mouseenter focus", (e, d) => { hoverId = d.hub ? null : d.id; highlight(); })
        .on("mouseleave blur", () => { hoverId = null; highlight(); });
      return g;
    });
    nodeSel
      .attr("class", d => `node${d.hub ? " hub" : ""}${isMajor(d) ? " major" : ""}${PEOPLE[d.id]?.lineOfJesus ? " jl" : ""}`)
      .attr("aria-label", d => d.hub ? d.name : `${d.name}, ${ERAS[d.era].name}`)
      .style("--c", d => eraColor(d.era));
    nodeSel.select("circle").attr("r", radius);
    nodeSel.select("text").attr("x", d => radius(d) + 3).text(d => d.name);

    // Place newcomers near a neighbor (or the middle) so they don't fly in from nowhere.
    for (const n of nodes) if (n.x == null) {
      const nb = [...(neighbors.get(n.id) || [])].map(id => nodeById.get(id)).find(m => m?.x != null);
      n.x = (nb?.x ?? 0) + (Math.random() - 0.5) * 30;
      n.y = (nb?.y ?? 0) + (Math.random() - 0.5) * 30;
    }

    if (!settings.laidOut || still) {
      sim.alpha(1);
      for (let i = 0; i < 300; i++) sim.tick();
      ticked();
      settings.laidOut = true;
      fit(false);
    } else {
      sim.alpha(reheat).restart();
    }

    stats.textContent = t("{people} people · {links} links shown", { people: nodes.filter(n => !n.hub).length, links: links.filter(l => l.type !== "era").length });
    hint.hidden = true;
    highlight();
  }

  function highlight() {
    const center = hoverId || settings.selected;
    const set = center && nodes.some(n => n.id === center)
      ? (hoverId ? neighborhood(hoverId, 1) : neighborhood(settings.selected, settings.depth))
      : null;
    wrap.classList.toggle("has-focus", !!set);
    nodeSel.classed("hi", d => !!set && set.has(d.id)).classed("sel", d => d.id === settings.selected);
    linkSel.classed("hi", d => !!set && set.has(d.source.id) && set.has(d.target.id));
  }

  function fit(animate = true) {
    const shown = nodes.filter(n => n.x != null);
    if (!shown.length) return;
    const w = wrap.clientWidth, h = wrap.clientHeight, pad = 50;
    const xs = shown.map(n => n.x), ys = shown.map(n => n.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min(1.6, Math.max(0.2, Math.min((w - pad * 2) / (x1 - x0 || 1), (h - pad * 2) / (y1 - y0 || 1))));
    const tf = d3.zoomIdentity.translate(w / 2 - k * (x0 + x1) / 2, h / 2 - k * (y0 + y1) / 2).scale(k);
    (animate && !still ? svg.transition().duration(450) : svg).call(zoom.transform, tf);
  }

  function centerOn(id) {
    const n = nodeById.get(id);
    if (!n || n.x == null) return;
    const k = Math.max(settings.transform?.k || 1, 1.4);
    const tf = d3.zoomIdentity.translate(wrap.clientWidth / 2 - k * n.x, wrap.clientHeight / 2 - k * n.y).scale(k);
    (still ? svg : svg.transition().duration(450)).call(zoom.transform, tf);
  }

  function select(id) {
    settings.selected = id;
    if (settings.local) update({ reheat: 0.5 });
    else highlight();
    drawCard();
  }

  function drawCard() {
    const id = settings.selected;
    if (!id) { card.hidden = true; return; }
    const p = PEOPLE[id];
    const byType = {};
    for (const l of base.links) {
      const other = l.source === id ? l.target : l.target === id ? l.source : null;
      if (other) (byType[l.type] ||= []).push(other);
    }
    card.style.setProperty("--c", eraColor(p.era));
    card.innerHTML = `
      <button class="icon-btn close" data-gclose aria-label="${esc(t("Clear selection"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <span class="label" style="display:flex;gap:6px;align-items:center"><span class="dot"></span>${esc(ERAS[p.era].name)}</span>
      <h3>${esc(p.name)}</h3>
      <p class="role">${esc(p.role)}</p>
      ${lineOfJesus(p, { compact: true })}
      <ul>${p.did.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="conn">${LINK_TYPES.filter(lt => byType[lt.id]).map(lt =>
        `<div><b>${esc(t(lt.label))}:</b> ${byType[lt.id].map(o => `<button class="pname" data-gnode="${o}">${esc(PEOPLE[o].name)}</button>`).join(", ")}</div>`).join("")}</div>
      <div>${refsHtml(p.ref)}</div>
      <div class="actions">
        <button data-p="${id}">${esc(t("Full profile"))}</button>
        <button data-gcenter="${id}">${esc(t("Center"))}</button>
        <button data-glocal>${esc(t(settings.local ? N("Show everyone") : N("Only their links")))}</button>
      </div>`;
    card.hidden = false;
  }

  /* ---------- controls ---------- */
  const search = root.querySelector("#gSearch");
  const findAndSelect = () => {
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const n = base.nodes.find(x => x.name.toLowerCase() === q) || base.nodes.find(x => x.name.toLowerCase().startsWith(q))
      || base.nodes.find(x => x.name.toLowerCase().includes(q));
    if (!n) return;
    if (!settings.eras.has(n.era)) {
      settings.eras.add(n.era);
      root.querySelectorAll("[data-era]").forEach(b => b.setAttribute("aria-pressed", settings.eras.has(b.dataset.era)));
      update();
    }
    select(n.id);
    centerOn(n.id);
  };
  search.addEventListener("change", findAndSelect);
  search.addEventListener("keydown", e => { if (e.key === "Enter") findAndSelect(); });

  const depthWrap = root.querySelector("#gDepthWrap");
  root.querySelector("#gTimeline").addEventListener("change", e => { settings.timeline = e.target.checked; update({ reheat: 0.9 }); setTimeout(() => fit(), still ? 0 : 900); });
  wrap.classList.toggle("show-line", settings.line);
  root.querySelector("#gLine").addEventListener("change", e => { settings.line = e.target.checked; wrap.classList.toggle("show-line", settings.line); });
  root.querySelector("#gHubs").addEventListener("change", e => { settings.hubs = e.target.checked; update(); });
  root.querySelector("#gLocal").addEventListener("change", e => {
    settings.local = e.target.checked; depthWrap.hidden = !settings.local;
    update(); drawCard(); setTimeout(() => fit(), still ? 0 : 700);
  });
  root.querySelector("#gDepth").addEventListener("change", e => {
    settings.depth = +e.target.value; update(); setTimeout(() => fit(), still ? 0 : 700);
  });

  const onClick = e => {
    const tgt = e.target;
    const type = tgt.closest("[data-type]");
    if (type) {
      const id = type.dataset.type;
      settings.types.has(id) ? settings.types.delete(id) : settings.types.add(id);
      if (!settings.types.size) LINK_TYPES.forEach(lt => settings.types.add(lt.id));
      root.querySelectorAll("[data-type]").forEach(b => b.setAttribute("aria-pressed", settings.types.has(b.dataset.type)));
      update();
      return;
    }
    const era = tgt.closest("[data-era]");
    if (era) {
      const k = era.dataset.era;
      if (settings.eras.size === ERA_KEYS.length) settings.eras = new Set([k]);
      else if (settings.eras.has(k)) { settings.eras.delete(k); if (!settings.eras.size) settings.eras = new Set(ERA_KEYS); }
      else settings.eras.add(k);
      root.querySelectorAll("[data-era]").forEach(b => b.setAttribute("aria-pressed", settings.eras.has(b.dataset.era)));
      if (settings.selected && !settings.eras.has(PEOPLE[settings.selected].era)) settings.selected = null;
      update(); drawCard(); setTimeout(() => fit(), still ? 0 : 700);
      return;
    }
    const z = tgt.closest("[data-zoom]");
    if (z) {
      if (z.dataset.zoom === "fit") fit();
      else svg.transition().duration(still ? 0 : 250).call(zoom.scaleBy, z.dataset.zoom === "in" ? 1.4 : 1 / 1.4);
      return;
    }
    const gn = tgt.closest("[data-gnode]");
    if (gn) {
      const id = gn.dataset.gnode;
      if (!nodes.some(n => n.id === id)) {
        settings.eras.add(PEOPLE[id].era);
        root.querySelectorAll("[data-era]").forEach(b => b.setAttribute("aria-pressed", settings.eras.has(b.dataset.era)));
      }
      select(id);
      if (!nodes.some(n => n.id === id)) update();
      centerOn(id);
      return;
    }
    if (tgt.closest("[data-gclose]")) { select(null); return; }
    const gc = tgt.closest("[data-gcenter]");
    if (gc) { centerOn(gc.dataset.gcenter); return; }
    if (tgt.closest("[data-glocal]")) {
      const box = root.querySelector("#gLocal");
      box.checked = !box.checked;
      box.dispatchEvent(new Event("change"));
    }
  };
  root.addEventListener("click", onClick);

  /* ---------- start ---------- */
  update();
  if (settings.transform && settings.laidOut) svg.call(zoom.transform, settings.transform);

  const pending = sessionStorage.getItem("otmap:graph-focus");
  if (pending && PEOPLE[pending]) {
    sessionStorage.removeItem("otmap:graph-focus");
    if (!settings.eras.has(PEOPLE[pending].era)) { settings.eras.add(PEOPLE[pending].era); update(); }
    select(pending);
    centerOn(pending);
  } else drawCard();

  if (!still) sim.alpha(0.05).restart();

  return () => { sim.stop(); root.removeEventListener("click", onClick); };
}
