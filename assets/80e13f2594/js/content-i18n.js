/* Which parts of the content get translated. Shared by the page (to show the
   site in another language) and by the build (to list text that still needs
   translating). Ids, colors, years and scripture references are never
   translated; references are shown with translated book names instead.

   translateSite(site, tr, isPersonId)
     tr(text, area) returns the translated text. area is the content file the
     text comes from ("people", "eras", …), which the translations helper uses
     to file new strings in the matching translations file. */
import { parseRefs } from "./refs.js";

/* Text in a reference field that isn't itself a reference, e.g. "(era uncertain". */
export const refLeftovers = ref => parseRefs(ref)
  .filter(p => !p.passage && /\p{L}/u.test(p.text))
  .map(p => p.text.trim());

export function translateSite(site, tr, isPersonId) {
  const T = area => s => (typeof s === "string" && s !== "" ? tr(s, area) : s);
  const names = (list, f) => list.map(n => (isPersonId(n) ? n : f(n)));
  const refText = (ref, area) => { if (ref) refLeftovers(ref).forEach(x => tr(x, area)); return ref; };

  const E = T("eras");
  const eras = site.eras.map(e => ({
    ...e,
    name: E(e.name), dates: E(e.dates), books: refText(e.books, "eras"),
    flow: e.flow.map(f => ({ ...f, next: E(f.next) })),
    moments: e.moments.map(m => ({ ...m, text: E(m.text), ref: refText(m.ref, "eras") })),
  }));

  const P = T("people");
  const people = {};
  for (const [id, p] of Object.entries(site.people)) {
    people[id] = {
      ...p,
      name: P(p.name), role: P(p.role), did: p.did.map(P), ref: refText(p.ref, "people"),
      // labelEn keeps the English word, which the Connections graph uses to pick the link type.
      ...(p.family && { family: p.family.map(f => ({ label: P(f.label), labelEn: f.labelEn || f.label, names: names(f.names, P) })) }),
      ...(p.lineOfJesus && { lineOfJesus: { ...p.lineOfJesus, note: P(p.lineOfJesus.note) } }),
    };
  }

  const F = T("family-trees");
  const trees = site.trees.map(tree => ({
    ...tree,
    title: F(tree.title), source: refText(tree.source, "family-trees"),
    line: tree.line.map(x => ({
      ...x,
      name: F(x.name),
      ...(x.spouse && { spouse: F(x.spouse) }),
      ...(x.note && { note: F(x.note) }),
      ...(x.othersLabel && { othersLabel: F(x.othersLabel) }),
      ...(x.others && { others: names(x.others, F) }),
      ...(x.groups && { groups: x.groups.map(g => ({ mother: F(g.mother), children: names(g.children, F) })) }),
    })),
  }));

  const K = T("kings");
  const king = k => ({ ...k, name: K(k.name), ...(k.note && { note: K(k.note) }) });
  const kings = {
    events: site.kings.events.map(e => ({ ...e, label: K(e.label) })),
    judah: site.kings.judah.map(king),
    israel: site.kings.israel.map(king),
  };

  const R = T("prophets");
  const prophets = {
    empires: site.prophets.empires.map(e => ({ ...e, name: R(e.name) })),
    markers: site.prophets.markers.map(m => ({ ...m, label: R(m.label) })),
    groups: site.prophets.groups.map(g => ({
      ...g, label: R(g.label),
      prophets: g.prophets.map(p => ({ ...p, name: R(p.name), ...(p.audience && { audience: R(p.audience) }) })),
    })),
  };

  const W = T("world");
  const world = {
    regions: site.world.regions.map(r => ({ ...r, name: W(r.name) })),
    bibleBands: site.world.bibleBands.map(b => ({ ...b, label: W(b.label) })),
    markers: site.world.markers.map(m => ({ ...m, label: W(m.label) })),
    lanes: Object.fromEntries(Object.entries(site.world.lanes).map(([k, lane]) => [k, lane.map(z => ({ ...z, name: W(z.name) }))])),
    sections: site.world.sections.map(s => ({
      ...s,
      ...(s.title && { title: W(s.title) }), ...(s.dates && { dates: W(s.dates) }), ...(s.note && { note: W(s.note) }),
      events: s.events.map(e => ({ ...e, date: W(e.date), text: W(e.text), ...(e.ref && { ref: refText(e.ref, "world") }) })),
    })),
  };

  const B = T("books");
  const books = (site.books || []).map(b => ({
    ...b,
    name: B(b.name), group: B(b.group), tagline: B(b.tagline), bigIdea: b.bigIdea.map(B),
    authorship: B(b.authorship),
    structure: {
      ...b.structure,
      ...(b.structure.note && { note: B(b.structure.note) }),
      sections: b.structure.sections.map(s => ({ ...s, title: B(s.title), ...(s.note && { note: B(s.note) }) })),
    },
    themes: b.themes.map(th => ({ ...th, title: B(th.title), points: th.points.map(B) })),
    keyPassages: b.keyPassages.map(k => ({ ...k, text: B(k.text) })),
    connections: b.connections.map(c => ({ ...c, text: B(c.text) })),
  }));

  // Journeys tab: places on the map and the journeys through them. Modern site
  // names ("today") are left as they are.
  const J = T("journeys");
  const pl = site.places || { places: {}, labels: [] };
  const places = {
    ...pl,
    places: Object.fromEntries(Object.entries(pl.places).map(([id, p]) => [id, { ...p, name: J(p.name), ...(p.note && { note: J(p.note) }) }])),
    labels: pl.labels.map(l => ({ ...l, name: J(l.name), ...(l.alt && { alt: J(l.alt) }) })),
  };
  const journeys = (site.journeys || []).map(j => ({
    ...j,
    title: J(j.title), summary: J(j.summary), dates: J(j.dates),
    stops: j.stops.map(st => ({ ...st, text: J(st.text), ref: refText(st.ref, "journeys"), ...(st.name && { name: J(st.name) }) })),
  }));

  return { ...site, eras, people, trees, kings, prophets, world, books, places, journeys };
}

/* Text that needs no translation: only numbers, punctuation, "c.", "BC", "AD". */
export const needsTranslation = s => /\p{L}/u.test(s.replace(/\bc\.|\bBC\b|\bAD\b/g, ""));
