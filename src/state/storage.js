export const STORAGE_KEYS = {
  progress: "svu_ite_progress_v2",
  filters: "svu_ite_filters_v2",
  theme: "svu_ite_theme_v1",
  language: "svu_ite_lang_v1"
};

// Storage failures must not prevent a session from working.
export function createStorage() {
  return {
    read(key, fallback = null) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { /* Keep working in memory if storage is unavailable. */ }
    },
    readText(key) {
      try { return localStorage.getItem(key); }
      catch { return null; }
    },
    writeText(key, value) {
      try { localStorage.setItem(key, value); }
      catch { /* Ignore storage errors. */ }
    },
    reset() {
      // Include old versions of progress, filters, and the retired track selector.
      // Other apps can share this origin, so only remove this app's keys.
      for (const storage of [localStorage, sessionStorage]) {
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
        for (const key of keys) {
          if (key?.startsWith("svu_")) storage.removeItem(key);
        }
      }
    }
  };
}
