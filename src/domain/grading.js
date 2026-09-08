export function createGrading(config) {
  const grading = config.grading;
  const importConfig = config.import;
  function termOrder(code) {
    const match = code.match(new RegExp(importConfig.termPattern));
    return match ? Number(match[2]) * Object.keys(importConfig.terms).length + importConfig.terms[match[1]].order : 0;
  }
  function evaluateAttempt(attempt) {
    const a = { ...attempt };
    const hasComponents = grading.requiredComponents.every(key => Number.isFinite(a[key]));
    const placement = importConfig.placement;
    const placementIndex = placement.orderedLevels.indexOf(a.courseId);
    const placed = placement.enabled && a.source === "placement" && placementIndex >= 0 &&
      Number.isFinite(a.final) && placement.thresholds.some(t => a.final >= t.minGrade && placementIndex < t.levelsPassed);
    a.weighted = placed ? a.final : hasComponents ? +((a.assignment ?? 0) * grading.assignmentWeight + (a.final ?? 0) * grading.finalWeight).toFixed(2) : null;
    a.inProgress = a.status !== "archive" || (!placed && !hasComponents);
    a.passed = !a.inProgress && (placed || (hasComponents && a.weighted >= grading.passThreshold &&
      (grading.minimumFinal == null || a.final >= grading.minimumFinal) &&
      (grading.minimumAssignment == null || a.assignment >= grading.minimumAssignment)));
    return a;
  }
  function passedAttempt(attempts) {
    const eligible = config.eligibility.completionPolicy === "any_passed" ? attempts : attempts.slice(-1);
    return eligible.slice().reverse().find(a => a.passed && !a.inProgress);
  }

  return { evaluateAttempt, termOrder, passedAttempt };
}
