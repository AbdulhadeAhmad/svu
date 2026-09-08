import { escapeHtml } from "./dom.js";

export function createRecommendationsView({ catalog, curriculum, recommendations, filters, i18n, onNavigate }) {
  const { t } = i18n;
  const { subjectsById } = curriculum;

  function render() {
    const container = document.getElementById("courseRecommendations");
    if (!container) return;
    const ranked = recommendations.rank(filters.isVisible);
    const suggested = ranked.slice(0, catalog.config.recommendations.limit);
    container.hidden = suggested.length === 0;
    container.innerHTML = suggested.length ? `
      <h4 class="sidebar-caption">${t("recommendedCourses")}<span class="ranking-help" tabindex="0" aria-label="${t("recommendationCriteria")} ${t("recommendationNote")}">ⓘ<span class="ranking-tooltip" role="tooltip">${t("recommendationCriteria")} ${t("recommendationNote")}</span></span></h4>
      <ol class="recommendation-list">
        ${suggested.map((item, index) => {
          const subject = subjectsById[item.id];
          const name = i18n.language === "ar" ? subject.nameAr || subject.name : subject.name;
          return `<li>
            <button type="button" class="recommendation" data-id="${item.id}">
              <span class="recommendation-rank">${index + 1}</span>
              <span class="recommendation-content">
                <strong>${item.id} <span class="recommendation-credits">${subject.registration_credits ?? subject.credits} ${t("credits")}</span></strong>
                <span class="recommendation-name">${escapeHtml(name)}</span>
                <span class="recommendation-metrics">
                  <span>${t("chainDepth")}: ${item.depth}</span>
                  <span>${t("futureCourses")}: ${item.downstreamCount}</span>
                  <span>${t("opensNext")}: ${item.immediateUnlocks}</span>
                </span>
              </span>
            </button>
          </li>`;
        }).join("")}
      </ol>

    ` : "";
    container.querySelectorAll("button[data-id]").forEach(button => {
      button.addEventListener("click", () => onNavigate(button.dataset.id));
    });
  }

  return { render };
}
