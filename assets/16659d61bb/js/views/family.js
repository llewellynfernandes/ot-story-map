/* Family Trees: genealogies from content/family-trees.json, read top to bottom. */
import { SITE, PEOPLE, eraColor } from "../site.js";
import { N } from "../i18n.js";
import { esc, personLink, personChip, refsHtml, t } from "../util.js";

export const title = N("Family Trees");

/* ✦ after anyone named in Jesus' genealogies (Matthew 1, Luke 3) */
const star = id => PEOPLE[id]?.lineOfJesus
  ? `<span class="jl-star" title="${esc(t("In Jesus' family line"))}: ${esc(PEOPLE[id].lineOfJesus.ref)}" aria-label="${esc(t("In Jesus' family line"))}">✦</span>` : "";

export function render(root) {
  let h = `<h2>${esc(t("Family Trees"))}</h2>
    <p class="lede">${esc(t("Each tree reads top to bottom, parent to child. The number is the generation counted from Adam. Names beside a line are brothers, sisters or other children not on the main line."))}
      <span class="jl-star" aria-hidden="true">✦</span> ${esc(t("marks people named in Jesus' genealogies in Matthew 1 and Luke 3."))}</p>
    <div class="trees">`;

  SITE.trees.forEach((tree, i) => {
    let gen = tree.startGeneration || 1;
    h += `<div class="tree" id="tree-${i}" style="--c:${eraColor(tree.era)}">
      <h3>${esc(tree.title)}</h3><p class="src">${refsHtml(tree.source)}</p><ol class="line">`;
    for (const x of tree.line) {
      const name = (x.id ? personLink(x.id, x.name, "pname gname") : `<span class="gname plain">${esc(x.name)}</span>`) + star(x.id);
      const spouse = x.spouse ? ` <span class="sp">+ ${x.spouseId ? personLink(x.spouseId, x.spouse) + star(x.spouseId) : esc(x.spouse)}</span>` : "";
      h += `<li class="gen"><span class="gnum">${x.groups ? "" : gen}</span><div>${name}${spouse}`;
      if (x.note) h += `<div class="gnote">${esc(x.note)}</div>`;
      if (x.others) h += `<div class="sideb">${esc(x.othersLabel || t("also:"))} ${x.others.map(personChip).join("")}</div>`;
      if (x.groups) h += `<div class="groups">${x.groups.map(g => `<div><em>${esc(g.mother)}</em>${g.children.map(personChip).join("")}</div>`).join("")}</div>`;
      h += `</div></li>`;
      gen++;
    }
    h += `</ol></div>`;
  });
  root.innerHTML = h + `</div>`;
}
