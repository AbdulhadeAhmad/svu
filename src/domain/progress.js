export function createProgressModel({ config, subjectsById, state, passedAttempt }) {
  const userProgress = state;
  function getAttempts(id) {
    return userProgress.parsed ? (userProgress.attempts[id] || []) : [];
  }
  function getCurrentAttempt(id) {
    const list = getAttempts(id);
    return list.length ? list[list.length - 1] : null;
  }
  function hasPassed(id) {
    return !!userProgress.manualPass[id] || !!passedAttempt(getAttempts(id));
  }
  function isFulfilled(id) {
    return hasPassed(id) || (config.eligibility.excludeInProgress && isInProgress(id));
  }
  function isPassed(id) { return hasPassed(id); }
  function isFailed(id) {
    const a = getCurrentAttempt(id);
    return !hasPassed(id) && !!a && !a.inProgress && !a.passed;
  }
  function isInProgress(id) {
    return !hasPassed(id) && !!getCurrentAttempt(id)?.inProgress;
  }
  function hasProgress() { return userProgress.parsed || Object.keys(userProgress.manualPass).length > 0; }
  function earnedCredits() {
    return Object.values(subjectsById).reduce((sum, s) => sum + (hasPassed(s.id) ? s.credits : 0), 0);
  }
  function prerequisitesMet(subject) {
    const policy = subject.prerequisite_policy || config.eligibility.defaultPrerequisitePolicy;
    return subject.prereq.every(id => policy === "passed" ? hasPassed(id) : hasPassed(id) || getAttempts(id).length > 0);
  }
  function isAvailableNext(id) {
    const subject = subjectsById[id];
    return !!subject && hasProgress() && !isFulfilled(id) && prerequisitesMet(subject) &&
      (subject.minimum_earned_credits == null || earnedCredits() >= subject.minimum_earned_credits);
  }
  function getNodeStatus(id) {
    if (!hasProgress()) return null;
    if (isInProgress(id)) return "in-progress";
    if (isPassed(id)) return "passed";
    if (isFailed(id)) return "failed";
    if (isAvailableNext(id)) return "available-next";
    return null;
  }

  function availableNext() { return new Set(Object.keys(subjectsById).filter(isAvailableNext)); }
  function preview(byCourse) {
    return createProgressModel({ config, subjectsById, passedAttempt,
      state: { ...state, parsed: true, attempts: byCourse } });
  }

  return { getAttempts, getCurrentAttempt, hasPassed, isPassed, isFailed, isInProgress, hasProgress, earnedCredits, isAvailableNext, getNodeStatus, availableNext, preview };
}
