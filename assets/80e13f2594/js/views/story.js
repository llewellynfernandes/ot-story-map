/* Story Flow: each era as a chain of who led to whom, with key moments. */
import { SITE, PEOPLE, eraColor } from "../site.js";
import { N } from "../i18n.js";
import { esc, personChip, refsHtml, t } from "../util.js";

export const title = N("Story Flow");

export function render(root) {
  let h = `<h2>${esc(t("Story Flow"))}</h2>
    <p class="lede">${esc(t("Read each era top to bottom. The gold words between names show how one person leads to the next. Early dates follow traditional biblical chronology and are approximate."))}</p>
    <div class="strip">${SITE.eras.map(e => `<button data-jump="${e.key}"><span class="dot" style="--c:${eraColor(e.key)}"></span>${esc(e.name)}</button>`).join("")}</div>`;

  SITE.eras.forEach((era, i) => {
    const nextEra = SITE.eras[i + 1];
    const nextId = nextEra?.flow[0]?.id;
    h += `<section class="era" id="era-${era.key}" style="--c:${eraColor(era.key)}">
      <div class="era-head">
        <h2><span class="dot"></span>${esc(era.name)}</h2>
        <span class="era-meta"><b class="num">${esc(era.dates)}</b> · ${refsHtml(era.books)}</span>
      </div>
      <div><span class="label">${esc(t("Who led to whom"))}</span><ol class="flow">`;

    era.flow.forEach(({ id, next }, j) => {
      const p = PEOPLE[id], last = j === era.flow.length - 1;
      h += `<li><button class="node" data-p="${id}"><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></button>`;
      if (next && (!last || nextId)) h += `<span class="link">↓ ${esc(next)}</span>`;
      if (last) {
        if (nextId) h += `<div class="next">${t("continues with {name} in {era}", {
          name: `<button class="pname" data-jump="${nextEra.key}">${esc(PEOPLE[nextId].name)}</button>`,
          era: esc(nextEra.name),
        })}</div>`;
        else if (next) h += `<div class="next">↓ ${esc(next)}</div>`;
      }
      h += `</li>`;
    });

    h += `</ol></div>
      <div class="side">
        <h3 class="label">${esc(t("Key moments"))}</h3>
        <ul class="moments">${era.moments.map(m => `<li><span>${esc(m.text)} <small>${refsHtml(m.ref || "")}</small></span></li>`).join("")}</ul>
        <h3 class="label">${esc(t("Also in this era"))}</h3>
        <div class="chips">${era.also.map(personChip).join("")}</div>
      </div>
    </section>`;
  });

  root.innerHTML = h;
  root.addEventListener("click", e => {
    const j = e.target.closest("[data-jump]");
    if (j) document.getElementById("era-" + j.dataset.jump)?.scrollIntoView({ behavior: "smooth" });
  });
}
