// Rank available courses by the remaining prerequisite work they lead into.
// Traversal can cross hidden courses, but only selected courses count as goals.
export function createCourseRecommendations({ subjectsById, progress, settings }) {
  function rank(isSelected) {
    const subjects = Object.values(subjectsById);
    const dependents = new Map(subjects.map(subject => [subject.id, []]));
    for (const subject of subjects) {
      if (progress.hasPassed(subject.id)) continue;
      for (const prerequisite of subject.prereq) {
        if (!progress.isPrerequisiteSatisfied(prerequisite, subject)) {
          dependents.get(prerequisite).push(subject.id);
        }
      }
    }

    const candidates = subjects.filter(subject => isSelected(subject) && progress.isAvailableNext(subject.id));
    const ranked = candidates.map(subject => {
      const downstream = new Set();
      const distances = new Map([[subject.id, 0]]);
      let depth = 0;
      function walk(id, distance) {
        for (const child of dependents.get(id)) {
          const nextDistance = distance + 1;
          if (isSelected(subjectsById[child])) {
            downstream.add(child);
            depth = Math.max(depth, nextDistance);
          }
          if ((distances.get(child) ?? -1) < nextDistance) {
            distances.set(child, nextDistance);
            walk(child, nextDistance);
          }
        }
      }
      walk(subject.id, 0);
      const completed = progress.previewCompletion(subject.id);
      const immediateUnlocks = subjects.filter(target => target.id !== subject.id && isSelected(target) &&
        !progress.isAvailableNext(target.id) && completed.isAvailableNext(target.id)).length;
      return { id: subject.id, depth, downstreamCount: downstream.size, immediateUnlocks };
    });

    return ranked.sort((a, b) => {
      for (const metric of settings.priority) {
        if (a[metric] !== b[metric]) return b[metric] - a[metric];
      }
      return a.id.localeCompare(b.id);
    });
  }

  return { rank };
}
