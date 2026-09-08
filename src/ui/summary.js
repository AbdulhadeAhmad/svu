export function createSummary({ catalog, curriculum, progress, filters, i18n, onNavigate, isSelectionActive }) {
  const currentFaculty = catalog;
  const { subjectsById } = curriculum;
  const { t } = i18n;
  const { hasProgress, hasPassed, isInProgress, isFailed } = progress;
  function renderImportSummary() {
    const emptyEl = document.getElementById("infoEmpty");
    const summaryEl = document.getElementById("summarySection");
    const summaryBody = document.getElementById("summaryBody");

    if (!hasProgress()) {
      if (emptyEl) emptyEl.hidden = isSelectionActive();
      if (summaryEl) summaryEl.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (summaryEl) summaryEl.hidden = false;

    let passed = 0, failed = 0, inProgress = 0;
    let passedCredits = 0, inProgressCredits = 0;
    Object.values(subjectsById).forEach(sub => {
      if (hasPassed(sub.id)) { passed++; passedCredits += sub.credits; }
      else if (isInProgress(sub.id)) { inProgress++; inProgressCredits += sub.registration_credits ?? sub.credits; }
      else if (isFailed(sub.id)) failed++;
    });
    const totalCourses = passed + failed + inProgress;
    const availableList = Array.from(progress.availableNext()).sort();

    const availableChips = availableList.length
      ? availableList.map(id => {
          const sub = subjectsById[id];
          const cat = sub ? currentFaculty.categories[sub.category] : null;
          const catKey = sub ? sub.category : "";
          const credits = sub ? (sub.registration_credits ?? sub.credits) : 0;
          const style = cat ? ` style="--chip-color:${cat.color};"` : "";
          const creditsLabel = credits ? `<span class="chip-credits">${credits}${i18n.language === "ar" ? "س" : "cr"}</span>` : "";
          return `<span class="chip cat-chip-inline" data-id="${id}" data-cat="${catKey}"${style}><span class="available-arrow" aria-hidden="true">→</span>${id}${creditsLabel}</span>`;
        }).join("")
      : `<span class="chip empty">No new subjects available yet</span>`;

    summaryBody.innerHTML = `
      <div class="import-summary">
        <div class="import-stats">
          <div class="import-stat passed"><span>${t("passed")}</span><span class="stat-value">${passed}</span><span class="stat-sub">${passedCredits} cr</span></div>
          <div class="import-stat failed"><span>${t("failed")}</span><span class="stat-value">${failed}</span></div>
          <div class="import-stat progress"><span>${t("inProgress")}</span><span class="stat-value">${inProgress}</span><span class="stat-sub">${inProgressCredits} cr</span></div>
          <div class="import-stat total"><span>${t("courses")}</span><span class="stat-value">${totalCourses}</span></div>
        </div>

        <h3 class="subsection-h3">${t("availableNext")} <span class="h3-count" id="availableCount">${availableList.length}</span></h3>
        <div class="available-list" id="availableList">${availableChips}</div>
      </div>
    `;

    summaryBody.querySelectorAll(".chip[data-id]").forEach(chip => {
      chip.addEventListener("click", () => {
        const targetId = chip.getAttribute("data-id");
        onNavigate(targetId);
      });
    });
    updateAvailableCount();
  }
  function updateAvailableCount() {
    const listEl = document.getElementById("availableList");
    if (!listEl) return;
    let count = 0;
    listEl.querySelectorAll(".chip[data-id]").forEach(chip => {
      const visible = filters.isVisible(subjectsById[chip.dataset.id]);
      chip.hidden = !visible;
      if (visible) count++;
    });
    document.getElementById("availableCount").textContent = count;
  }

  document.getElementById("summaryToggle").addEventListener("click", () => {
    const button = document.getElementById("summaryToggle");
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    document.getElementById("summaryBody").hidden = expanded;
  });

  return { render: renderImportSummary, updateAvailableCount };
}
