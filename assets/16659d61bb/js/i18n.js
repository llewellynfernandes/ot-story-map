/* Languages. All text on the site is written in English; translations live in
   content/translations/<lang>/*.json as { "English text": "translated text" }.
   t("English text") returns the translation for the current language, or the
   English text when there isn't one yet. */
import { store } from "./storage.js";

export const LANGS = [
  { id: "en", name: "English", short: "EN", locale: "en-US" },
  { id: "hi", name: "हिन्दी", short: "हिं", locale: "hi-IN" },
];

const STRINGS = (() => {
  try { return JSON.parse(document.getElementById("site-i18n").textContent); }
  catch { return {}; }
})();

export let lang = LANGS.some(l => l.id === store.get("lang")) ? store.get("lang") : "en";
document.documentElement.lang = lang;

export const locale = () => LANGS.find(l => l.id === lang).locale;

/* Dates and years: "c. 2100–1800 BC" → "लगभग 2100–1800 ई.पू." when no translation exists. */
const AUTO = {
  hi: s => s.replace(/\bc\. ?(?=\d)/g, "लगभग ").replace(/\bBC\b/g, "ई.पू.").replace(/\bAD\b/g, "ई."),
};

/* Translate a piece of text. vars fills {placeholders}: t("{n} people", { n: 5 }). */
export function t(text, vars) {
  if (text == null || text === "") return text;
  let out = text;
  if (lang !== "en") {
    const found = STRINGS[lang]?.[text];
    out = found || (AUTO[lang] ? AUTO[lang](text) : text);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return out;
}

export function setLang(id) {
  if (id === lang || !LANGS.some(l => l.id === id)) return;
  lang = id;
  store.set("lang", id);
  document.documentElement.lang = id;
  window.dispatchEvent(new CustomEvent("langchange", { detail: id }));
}

/* Marks text for translation without translating it yet, for labels that are
   stored first and translated when shown: const LABEL = N("Did right").
   The translations helper (npm run translations) finds both t("…") and N("…"). */
export const N = text => text;
