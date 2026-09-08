import { STORAGE_KEYS } from "./storage.js";

export function createFilterStore({ config, categories, storage }) {
  const saved = storage.read(STORAGE_KEYS.filters);
  const active = new Set((Array.isArray(saved) ? saved : config.defaultFilters).filter(key => categories[key]));
  let query = "";
  function toggle(key) {
    if (!categories[key]) return;
    if (active.has(key)) active.delete(key);
    else active.add(key);
    storage.write(STORAGE_KEYS.filters, [...active]);
  }
  function isVisible(subject) { return subject.categories.some(key => active.has(key)); }

  return { isActive: key => active.has(key), toggle, isVisible, setQuery(value) { query = value; }, get query() { return query; } };
}
