/* The site's content, read once from the JSON the build puts in the page,
   plus small lookups every view uses. When the language changes, the content
   is swapped for its translated copy and the views draw again. */
import { translateSite } from "./content-i18n.js";
import { t, lang } from "./i18n.js";

const BASE = JSON.parse(document.getElementById("site-data").textContent);
const isPersonId = id => Object.prototype.hasOwnProperty.call(BASE.people, id);

export let SITE, ERAS, ERA_KEYS, PEOPLE, REGIONS, ORDER;

function apply() {
  SITE = lang === "en" ? BASE : translateSite(BASE, s => t(s), isPersonId);
  ERAS = Object.fromEntries(SITE.eras.map(e => [e.key, e]));
  ERA_KEYS = SITE.eras.map(e => e.key);
  PEOPLE = SITE.people;
  REGIONS = Object.fromEntries(SITE.world.regions.map(r => [r.key, r.name]));
  /* Everyone on the Story Flow, in story order. Used for previous/next. */
  ORDER = SITE.eras.flatMap(e => e.flow.map(f => f.id));
}
apply();
// Registered when this module first loads, so it runs before the views redraw.
window.addEventListener("langchange", apply);

/* CSS color for an era or a world region. */
export const eraColor = key => `var(--e-${key})`;
export const regionColor = key => `var(--w-${key})`;
