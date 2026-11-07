/* Works out the Connections graph from the content: one node per person in
   people.json, and a link wherever the content already connects two people.
   Nothing here needs editing when you add material; new family entries,
   tree lines and story-flow steps show up as links automatically. */

import { N } from "./i18n.js";

export const LINK_TYPES = [
  { id: "family",   label: N("Parent, child or ancestor"), color: "var(--g-family)" },
  { id: "marriage", label: N("Married"),          color: "var(--g-marriage)" },
  { id: "kin",      label: N("Other relatives"),  color: "var(--g-kin)" },
  { id: "mentor",   label: N("Mentor or successor"), color: "var(--g-mentor)" },
  { id: "peer",     label: N("Served together"), color: "var(--g-peer)" },
  { id: "rival",    label: N("Enemies and overthrows"), color: "var(--g-rival)" },
  { id: "flow",     label: N("Next in the story"), color: "var(--g-flow)", dashed: true },
];
// When two people are linked in more than one way, the line shows the first of these.
const PRIORITY = ["marriage", "family", "mentor", "peer", "rival", "kin", "flow"];

/* Family labels in people.json → link type. Anything unlisted counts as "kin". */
const LABEL_TYPES = {
  wife: "marriage", wives: "marriage", husband: "marriage", spouse: "marriage",
  parents: "family", father: "family", mother: "family",
  son: "family", sons: "family", daughter: "family", daughters: "family", children: "family",
  grandfather: "family", grandmother: "family", grandson: "family", granddaughter: "family",
  "line leads to": "family", ancestor: "family", ancestors: "family", descendant: "family", descendants: "family",
  "sons by tamar": "family",
  mentor: "mentor", successor: "mentor", teacher: "mentor", student: "mentor",
  "served with": "peer", "served alongside": "peer", "served under": "peer", "served by": "peer",
  partner: "peer", contemporary: "peer", contemporaries: "peer",
  overthrew: "rival", "overthrown by": "rival", killed: "rival", "killed by": "rival",
  defeated: "rival", "defeated by": "rival", attacked: "rival", "attacked by": "rival",
  "opposed by": "rival", opposed: "rival", enemy: "rival", enemies: "rival", "taken captive by": "rival",
};
const labelType = label => LABEL_TYPES[label.trim().toLowerCase()] || "kin";

export function buildGraph(site) {
  const people = site.people;
  const isPerson = id => Object.prototype.hasOwnProperty.call(people, id);
  const links = new Map();   // "a|b" → { source, target, types: Set }

  const add = (a, b, type) => {
    if (!isPerson(a) || !isPerson(b) || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!links.has(key)) links.set(key, { source: a, target: b, types: new Set() });
    links.get(key).types.add(type);
  };

  // 1. Family and connections listed on each person
  for (const [id, p] of Object.entries(people)) {
    for (const f of p.family || []) for (const name of f.names) add(id, name, labelType(f.labelEn || f.label));
  }

  // 2. Family trees: each line is parent → child
  for (const tree of site.trees) {
    let prevId = null;
    for (const row of tree.line) {
      if (row.id && prevId) add(prevId, row.id, "family");
      if (row.id && row.spouseId) add(row.id, row.spouseId, "marriage");
      for (const o of row.others || []) if (row.id) add(row.id, o, "kin");
      for (const g of row.groups || []) for (const c of g.children) if (prevId) add(prevId, c, "family");
      if (row.id) prevId = row.id;
    }
  }

  // 3. Story flow: who led to whom, including across eras
  const flow = site.eras.flatMap(e => e.flow.map(f => f.id));
  for (let i = 1; i < flow.length; i++) add(flow[i - 1], flow[i], "flow");

  const linkList = [...links.values()].map(l => ({
    source: l.source,
    target: l.target,
    types: [...l.types],
    type: PRIORITY.find(t => l.types.has(t)),
  }));

  const degree = {};
  for (const l of linkList) { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; }

  const nodes = Object.entries(people).map(([id, p]) => ({
    id, name: p.name, era: p.era, degree: degree[id] || 0,
  }));

  return { nodes, links: linkList };
}
