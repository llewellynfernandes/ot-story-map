/* Small helpers shared by the views. */
import { PEOPLE, eraColor } from "./site.js";
import { parseRefs, encodePassage, passageLabel } from "./refs.js";
import { t, lang } from "./i18n.js";
import { store } from "./storage.js";
export { store, t };

/* Escape text for use inside HTML. */
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* A person's name as a button that opens their details. Plain text if the id is unknown. */
export function personLink(id, label, cls = "pname") {
  const p = PEOPLE[id];
  return p ? `<button class="${cls}" data-p="${id}">${esc(label || p.name)}</button>` : esc(label || id);
}

/* A rounded chip for a person id, or plain text for a name that isn't in people.json. */
export function personChip(name) {
  const p = PEOPLE[name];
  return p
    ? `<button class="chip" style="--c:${eraColor(p.era)}" data-p="${name}">${esc(p.name)}</button>`
    : `<span class="chip">${esc(name)}</span>`;
}

/* Text with every scripture reference turned into a link that opens the Bible panel.
   In English the reference keeps its original wording ("Gen 15"); in other
   languages it is rewritten with that language's book names. */
export function refsHtml(text) {
  return parseRefs(text).map(part => {
    if (!part.passage) {
      const lead = part.text.match(/^\s*/)[0], trail = part.text.match(/\s*$/)[0];
      const core = part.text.trim();
      return esc(lead + (core ? t(core) : "") + (core ? trail : ""));
    }
    const label = lang === "en" ? part.text : passageLabel(part.passage, lang);
    return `<button class="ref-link" data-ref="${encodePassage(part.passage)}" title="${esc(t("Read {ref}", { ref: label }))}">${esc(label)}</button>`;
  }).join("");
}

/* True when the viewer asked for less motion. */
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* "In Jesus' family line" note for people named in Matthew 1 or Luke 3.
   compact: just the tag and reference (cards); otherwise also the note (person panel). */
export function lineOfJesus(p, { compact = false } = {}) {
  if (!p.lineOfJesus) return "";
  const { ref, note } = p.lineOfJesus;
  return `<div class="jline${compact ? " compact" : ""}">
    <span class="jline-tag"><span class="jline-mark" aria-hidden="true">✦</span>${esc(t("In Jesus' family line"))}</span>
    <span class="jline-ref">${refsHtml(ref)}</span>
    ${compact || !note ? "" : `<p>${esc(note)}</p>`}
  </div>`;
}
