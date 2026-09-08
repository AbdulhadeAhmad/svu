import { TRANSLATIONS } from "./translations.js";
import { STORAGE_KEYS } from "../state/storage.js";

export function createI18n({ storage, importConfig }) {
  let language = storage.readText(STORAGE_KEYS.language) === "ar" ? "ar" : "en";
  function t(key) { return TRANSLATIONS[language][key] || key; }
  function localized(value) { return typeof value === "string" ? value : value?.[language] || value?.en || ""; }
  function setLanguage(value) {
    language = value === "ar" ? "ar" : "en";
    storage.writeText(STORAGE_KEYS.language, language);
  }
  function termName(code) {
    const match = code.match(new RegExp(importConfig.termPattern));
    return match ? `${localized(importConfig.terms[match[1]].label)} ${importConfig.yearBase + Number(match[2])}` : code;
  }

  return { t, localized, setLanguage, termName, get language() { return language; } };
}
