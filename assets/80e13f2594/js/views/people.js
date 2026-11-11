/* People: searchable cards for everyone in content/people.json. */
import { PEOPLE, SITE, ERAS, ERA_KEYS, eraColor } from "../site.js";
import { N } from "../i18n.js";
import { esc, refsHtml, lineOfJesus, t } from "../util.js";

export const title = N("People");
const filter = { q: "", eras: null, line: false };   // kept while the page is open

export function render(root) {
  filter.eras ||= new Set(ERA_KEYS);
  root.innerHTML = `<h2>${esc(t("People"))}</h2>
    <p class="lede">${esc(t("{n} people in story order. Search by name, deed or book, or narrow by era. Tap a card for details, or a reference to read it.", { n: Object.keys(PEOPLE).length }))}</p>
    <div class="filters">
      <input id="q" type="search" placeholder="${esc(t("Search people, deeds or books"))}" value="${esc(filter.q)}" aria-label="${esc(t("Search people"))}">
      ${SITE.eras.map(e => `<button class="chip" data-era="${e.key}" style="--c:${eraColor(e.key)}" aria-pressed="${filter.eras.has(e.key)}">${esc(e.name)}</button>`).join("")}
      <button class="chip" data-line style="--c:var(--gold)" aria-pressed="${filter.line}">✦ ${esc(t("Jesus' family line"))}</button>
    </div>
    <div class="cards" id="cards"></div>`;

  const cards = root.querySelector("#cards");
  const draw = () => {
    const q = filter.q.trim().toLowerCase();
    const ids = Object.keys(PEOPLE).filter(id => {
      const p = PEOPLE[id];
      if (!filter.eras.has(p.era)) return false;
      if (filter.line && !p.lineOfJesus) return false;
      return !q || `${p.name} ${p.role} ${p.did.join(" ")} ${p.ref}`.toLowerCase().includes(q);
    });
    cards.innerHTML = ids.length ? ids.map(id => {
      const p = PEOPLE[id];
      return `<article class="card" data-p="${id}" style="--c:${eraColor(p.era)}">
        <span class="era-tag"><span class="dot"></span><span class="label">${esc(ERAS[p.era].name)}</span></span>
        <h3><button class="card-name" data-p="${id}">${esc(p.name)}</button></h3>
        <p class="role">${esc(p.role)}</p>
        ${lineOfJesus(p, { compact: true })}
        <ul>${p.did.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <span class="ref">${refsHtml(p.ref)}</span>
      </article>`;
    }).join("") : `<p class="empty">${esc(t("No one matches that search. Try a shorter word, or turn more eras back on."))}</p>`;
  };

  root.querySelector("#q").addEventListener("input", e => { filter.q = e.target.value; draw(); });
  root.addEventListener("click", e => {
    const ln = e.target.closest("[data-line]");
    if (ln) { filter.line = !filter.line; ln.setAttribute("aria-pressed", filter.line); draw(); return; }
    const b = e.target.closest("[data-era]");
    if (!b) return;
    const k = b.dataset.era;
    if (filter.eras.size === ERA_KEYS.length) filter.eras = new Set([k]);        // first tap: only this era
    else if (filter.eras.has(k)) { filter.eras.delete(k); if (!filter.eras.size) filter.eras = new Set(ERA_KEYS); }
    else filter.eras.add(k);
    root.querySelectorAll("[data-era]").forEach(x => x.setAttribute("aria-pressed", filter.eras.has(x.dataset.era)));
    draw();
  });
  draw();
}
