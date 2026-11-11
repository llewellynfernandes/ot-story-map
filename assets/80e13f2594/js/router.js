/* Shows one view at a time, chosen by the address hash (#story, #people, ...).
   To add a view: create js/views/<name>.js exporting title and render(root),
   import it here, and add a tab link in index.html. */
import * as story from "./views/story.js";
import * as people from "./views/people.js";
import * as family from "./views/family.js";
import * as journeys from "./views/journeys.js";
import * as kings from "./views/kings.js";
import * as prophets from "./views/prophets.js";
import * as books from "./views/books.js";
import * as world from "./views/world.js";
import * as connections from "./views/graph.js";
import { t } from "./i18n.js";
import * as analytics from "./analytics.js";

const VIEWS = { story, people, family, journeys, kings, prophets, books, world, connections };
const DEFAULT = "story";

let cleanup = null;
let current = null;

export function route({ keepScroll = false } = {}) {
  const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : DEFAULT;
  const root = document.getElementById("view");
  if (typeof cleanup === "function") cleanup();
  // A fresh element each time, so listeners from the old view go away with it.
  const fresh = root.cloneNode(false);
  root.replaceWith(fresh);
  const y = window.scrollY;
  cleanup = VIEWS[key].render(fresh);
  const site = t("Old Testament Story Map");
  document.title = key === DEFAULT ? site : `${t(VIEWS[key].title)} · ${site}`;
  document.querySelectorAll("#tabs a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === `#${key}` ? "page" : "false"));

  // The menu can ask for a section inside the view ("otmap:anchor").
  const anchor = sessionStorage.getItem("otmap:anchor");
  sessionStorage.removeItem("otmap:anchor");
  if (anchor && document.getElementById(anchor)) requestAnimationFrame(() => document.getElementById(anchor).scrollIntoView({ block: "start" }));
  else if (keepScroll) window.scrollTo(0, y);
  else if (current !== null && current !== key) window.scrollTo(0, 0);
  if (!keepScroll) analytics.page(`/${key}`, VIEWS[key].title);
  current = key;
}

export function initRouter() {
  window.addEventListener("hashchange", () => route());
  route();
}
