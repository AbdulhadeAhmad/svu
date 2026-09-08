export function createFilterControls({ catalog, filters, i18n, onChange, onSearch }) {
  function render() {
    const container = document.getElementById("catFilters");
    container.replaceChildren();
    for (const [key, category] of Object.entries(catalog.categories)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cat-chip" + (filters.isActive(key) ? " active" : "");
      button.dataset.cat = key;
      button.setAttribute("aria-pressed", String(filters.isActive(key)));
      button.style.setProperty("--chip-color", category.color);
      button.innerHTML = `<span class="cat-dot"></span><span class="cat-label"></span><span class="cat-check">✓</span>`;
      button.querySelector(".cat-label").textContent = i18n.localized(category.label);
      button.addEventListener("click", () => {
        filters.toggle(key);
        button.classList.toggle("active", filters.isActive(key));
        button.setAttribute("aria-pressed", String(filters.isActive(key)));
        onChange();
      });
      container.appendChild(button);
    }
  }
  document.getElementById("search").addEventListener("input", event => {
    filters.setQuery(event.target.value);
    onSearch();
  });

  return { render };
}
