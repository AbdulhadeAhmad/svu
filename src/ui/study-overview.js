export function createStudyOverview({ studyProgress, progress, filters, i18n }) {
  const { t } = i18n;

  function render() {
    const totals = studyProgress.selectedTotals(filters.isVisible);
    const standing = studyProgress.academicStanding();
    const selected = totals.totalCourses > 0;
    const nextYearText = standing?.nextYear != null
      ? `${standing.creditsToNextYear} ${t("creditHoursTo")} ${t("year")} ${standing.nextYear}`
      : "";

    document.getElementById("studyOverview").innerHTML = `

      <div class="remaining-stats" title="${t("remainingExplanation")}">
        <div class="remaining-stat">
          <span class="remaining-label">${t("coursesLeft")}</span>
          <strong id="remainingCourses">${totals.remainingCourses}</strong>
          <span class="remaining-detail">${totals.completedCourses} / ${totals.totalCourses} ${t("completed")}</span>
        </div>
        <div class="remaining-stat">
          <span class="remaining-label">${t("creditHoursLeft")}</span>
          <strong id="remainingCredits">${totals.remainingCredits}</strong>
          <span class="remaining-detail">${totals.completedCredits} / ${totals.totalCredits} ${t("earned")}</span>
        </div>
      </div>
      ${selected ? `
        <progress class="study-progress-bar" value="${totals.completedCredits}" max="${totals.totalCredits || 1}" aria-label="${t("selectedCreditProgress")}"></progress>

      ` : `<p class="study-note">${t("selectTracksHint")}</p>`}
      <div class="academic-standing">
        <span class="remaining-label">${t("academicYear")}</span>
        <strong id="academicYear">${standing ? `${t("year")} ${standing.year}` : "—"}</strong>
        <p class="year-detail" id="yearProgress">${standing ? `${standing.earnedCredits} ${t("totalEarnedHours")}${nextYearText ? `<br>${nextYearText}` : ""}` : t("importYearHint")}</p>
      </div>
    `;
  }

  return { render };
}
