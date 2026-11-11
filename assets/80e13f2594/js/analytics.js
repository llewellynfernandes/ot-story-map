/* Anonymous visit counts with GoatCounter (goatcounter.com): no cookies, and
   nothing that identifies a person. Off unless the build is given a site code
   (the GOATCOUNTER_CODE repository variable), so local previews never count.

   What gets counted, always in English so the numbers stay together:
     pages   /story, /people, /journeys …   a tab opened
             /person/<id>                  a person card opened
             /journeys/<id>                a journey opened
     events  journey-start/<id>, journey-finish/<id>
             tour-start, tour-finish, tour-quit/step-<n>
             bible/<book>                  the Bible panel opened at a book
             language/<id>                 the language switched */

const code = document.querySelector('meta[name="goatcounter"]')?.content.trim();
const queue = [];
let paused = false;

export const enabled = !!code && /^[a-z0-9-]+$/.test(code);

export function init() {
  if (!enabled) return;
  document.getElementById("statsNote")?.removeAttribute("hidden");
  window.goatcounter = { no_onload: true };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  s.onload = () => queue.splice(0).forEach(send);
  document.head.append(s);
}

function send(hit) {
  try { window.goatcounter.count(hit); } catch { /* blocked or offline: nothing to do */ }
}

function count(hit) {
  if (!enabled || paused) return;
  if (window.goatcounter?.count) send(hit);
  else queue.push(hit);
}

/* A page: a tab, a person or a journey. */
export const page = (path, title = "") => count({ path, title });

/* Something someone did, like starting a journey. */
export const event = name => count({ path: name, title: name, event: true });

/* The guided tour opens cards and the Bible by itself; don't count those. */
export const pause = on => { paused = on; };
