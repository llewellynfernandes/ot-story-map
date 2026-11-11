/* localStorage that never throws (private windows, blocked storage).
   Used only for small per-device conveniences: language, Bible position, panel width. */
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("otmap:" + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("otmap:" + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
