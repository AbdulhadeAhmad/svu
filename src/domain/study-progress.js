// Selected-track totals count shared courses once. Academic standing always
// uses all earned credits, independently of the active graph filters.
export function createStudyProgress({ subjectsById, progress, yearThresholds }) {
  const years = Object.entries(yearThresholds)
    .map(([year, credits]) => ({ year: Number(year), credits }))
    .sort((a, b) => a.year - b.year);

  function selectedTotals(isSelected) {
    const selected = Object.values(subjectsById).filter(isSelected);
    const completed = selected.filter(subject => progress.hasPassed(subject.id));
    const totalCredits = selected.reduce((sum, subject) => sum + subject.credits, 0);
    const completedCredits = completed.reduce((sum, subject) => sum + subject.credits, 0);
    return {
      totalCourses: selected.length,
      completedCourses: completed.length,
      remainingCourses: selected.length - completed.length,
      totalCredits,
      completedCredits,
      remainingCredits: totalCredits - completedCredits
    };
  }

  function academicStanding() {
    if (!progress.hasProgress()) return null;
    const earnedCredits = progress.earnedCredits();
    const current = years.filter(entry => earnedCredits >= entry.credits).at(-1);
    const next = years.find(entry => entry.credits > earnedCredits);
    return {
      year: current.year,
      earnedCredits,
      nextYear: next?.year ?? null,
      creditsToNextYear: next ? next.credits - earnedCredits : 0
    };
  }

  return { selectedTotals, academicStanding };
}
