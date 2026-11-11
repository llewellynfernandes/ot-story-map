/* d3, the drawing library behind the Connections graph and the Journeys maps.
   It is loaded only when one of those tabs opens. */
let d3Promise;
export function loadD3() {
  if (window.d3) return Promise.resolve(window.d3);
  d3Promise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = new URL("../vendor/d3.min.js", import.meta.url).href;
    s.onload = () => resolve(window.d3);
    s.onerror = () => { d3Promise = null; s.remove(); reject(new Error("d3 failed to load")); };
    document.head.append(s);
  });
  return d3Promise;
}
