export function createCurriculum(subjects) {
  let subjectsById = {};
  let dependents = {};
  let levelOf = {};

  function buildDataStructures() {
    subjectsById = {};
    dependents = {};
    levelOf = {};

    subjects.forEach(subject => {
      subjectsById[subject.id] = { ...subject, prereq: subject.prerequisites, lvl: subject.level,
        extra: subject.minimum_earned_credits == null ? subject.additional_requirements : null };
    });

    // Reverse graph: who depends on this subject?
    Object.values(subjectsById).forEach(s => {
      s.prereq.forEach(p => {
        if (!dependents[p]) dependents[p] = [];
        if (!dependents[p].includes(s.id)) dependents[p].push(s.id);
      });
    });

    // Calculate level (longest path from a root)
    function calcLevel(id, visited) {
      if (id in levelOf) return levelOf[id];
      if (visited.has(id)) return 0; // cycle
      visited.add(id);
      const s = subjectsById[id];
      if (!s || s.prereq.length === 0) {
        levelOf[id] = 0;
      } else {
        const prereqLevels = s.prereq
          .filter(p => subjectsById[p])
          .map(p => calcLevel(p, new Set(visited)));
        levelOf[id] = (prereqLevels.length ? Math.max(...prereqLevels) : -1) + 1;
      }
      return levelOf[id];
    }
    Object.keys(subjectsById).forEach(id => calcLevel(id, new Set()));
  }
  buildDataStructures();
  function getUpstream(id) {
    const s = subjectsById[id];
    if (!s) return new Set();
    const result = new Set();
    function walk(x) {
      if (result.has(x)) return;
      result.add(x);
      const sub = subjectsById[x];
      if (sub) sub.prereq.forEach(p => { if (subjectsById[p]) walk(p); });
    }
    s.prereq.forEach(p => { if (subjectsById[p]) walk(p); });
    return result;
  }

  function getDownstream(id) {
    const result = new Set();
    function walk(x) {
      if (result.has(x)) return;
      result.add(x);
      (dependents[x] || []).forEach(d => walk(d));
    }
    walk(id);
    return result;
  }

  return { subjectsById, dependents, levelOf, getUpstream, getDownstream };
}
