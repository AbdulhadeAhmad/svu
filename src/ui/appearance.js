import { STORAGE_KEYS } from "../state/storage.js";

export function createAppearance({ catalog, i18n, storage, onChange }) {
  const config = catalog.config;
  const { t, localized } = i18n;
  function applyLang(lang) {
    i18n.setLanguage(lang);
    const html = document.documentElement;
    html.lang = i18n.language;
    // Keep layout LTR — only translate the text, don't flip the layout
    html.dir = "ltr";
    document.body.classList.remove("rtl");

    // Update static UI strings
    document.querySelector("header h1").textContent = localized(config.title);
    document.querySelector("header p").textContent = localized(config.subtitle);
    const search = document.getElementById("search");
    if (search) search.placeholder = t("searchPlaceholder");
    const emptyEl = document.getElementById("infoEmpty");
    if (emptyEl) {
      const emptyText = emptyEl.querySelector(".empty-text");
      const emptyBtn = emptyEl.querySelector("#emptyImportBtn");
      if (emptyText) emptyText.textContent = t("emptyText");
      if (emptyBtn) emptyBtn.textContent = t("emptyImport");
    }
    const importTitle = document.getElementById("importTitle");
    if (importTitle) importTitle.textContent = t("importTitle");
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (t(key)) el.textContent = t(key);
    });

    // Update the language toggle button label
    const langBtn = document.getElementById("langToggle");
    if (langBtn) langBtn.textContent = i18n.language === "ar" ? "EN" : "ع";

    onChange();
  }
  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("dark", t === "dark");
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = t === "dark" ? "☀" : "🌙";
    storage.writeText(STORAGE_KEYS.theme, t);
  }

  function loadTheme() {
    try {
      const saved = storage.readText(STORAGE_KEYS.theme);
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) { /* ignore */ }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.getElementById("themeToggle").addEventListener("click", () => {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });
  document.getElementById("langToggle").addEventListener("click", () => {
    applyLang(i18n.language === "ar" ? "en" : "ar");
  });
  function initialize() { applyTheme(loadTheme()); applyLang(i18n.language); }

  return { initialize };
}
