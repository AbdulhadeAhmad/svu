export function createExamParser({ config, subjectsById, rules }) {
  const importConfig = config.import;
  const grading = config.grading;
  const { evaluateAttempt, termOrder, passedAttempt } = rules;
  function parseExamHistory(text) {
    const lines = text.split(/\r?\n/);

    const placement = importConfig.placement;
    const engOrderedLevels = placement.orderedLevels;
    const engThresholds = placement.thresholds;

    function getPlacementPassCount(grade) {
      let count = 0;
      for (const t of engThresholds) {
        if (grade >= t.minGrade) count = Math.max(count, t.levelsPassed);
      }
      return count;
    }

    // key: "mappedId|term" -> { mappedId, term, assignment?, final?, statuses[], date, source }
    const map = new Map();
    const placementRows = []; // { term, grade, date, status }
    const seenIds = [];

    const courseRegex = new RegExp(importConfig.coursePattern);
    lines.forEach(line => {
      const courseMatch = line.match(courseRegex);
      const alias = Object.keys(importConfig.aliases).find(token => line.includes(token + "_"));
      const isPT = placement.enabled && line.includes(placement.token + "_");
      let mappedId = courseMatch?.[1] || (alias ? importConfig.aliases[alias] : null);
      const kind = isPT ? "placement" : "course";
      if (!mappedId && !isPT) return;
      if (mappedId && !seenIds.includes(mappedId)) seenIds.push(mappedId);
      if (mappedId && !subjectsById[mappedId]) return;

      // Find the LAST term code in the line — this is the term the
      // exam was actually taken in; earlier markers can refer to carry-over terms.
      // NOTE: JS \b doesn't match at underscore (since _ is a word char),
      // so we use negative lookarounds against uppercase letters/digits.
      const termMatches = [...line.matchAll(new RegExp(importConfig.termPattern, "g"))];
      if (!termMatches.length) return;
      const tm = termMatches[termMatches.length - 1];
      const term = tm[1] + tm[2];

      let rowStatus = "archive";
      if (/\bChecking\b/i.test(line)) rowStatus = "checking";
      else if (/Publishing\b/i.test(line)) rowStatus = "publishing";

      const dateMatch = line.match(/_(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : null;

      let type = null;
      if (/assignment/i.test(line)) type = "assignment";
      else if (/final/i.test(line)) type = "final";
      if (!type) return;

      // Last standalone number on the line is the grade
      const gradeMatch = line.match(/(-?\d+(?:\.\d+)?)\s*$/);
      const parsedGrade = gradeMatch ? Number(gradeMatch[1]) : null;
      const grade = parsedGrade != null && parsedGrade >= grading.gradeRange.minimum && parsedGrade <= grading.gradeRange.maximum ? parsedGrade : null;

      if (kind === "placement") {
        placementRows.push({ term, grade, date, status: rowStatus });
        return;
      }

      const key = mappedId + "|" + term;
      if (!map.has(key)) map.set(key, { courseId: mappedId, term, statuses: [], source: "course" });
      const a = map.get(key);
      // Repeated component grades use the catalog policy.
      if (grade !== null && !Number.isNaN(grade)) {
        if (importConfig.repeatedComponent === "latest" || a[type] === undefined || grade > a[type]) a[type] = grade;
      }
      a.statuses.push(rowStatus);
      if (date && (!a.date || date > a.date)) a.date = date;
    });

    // Apply placement test results to the ordered English levels
    placementRows.forEach(pt => {
      if (pt.grade === null || pt.status !== "archive") return;
      const passCount = getPlacementPassCount(pt.grade);
      for (let i = 0; i < passCount && i < engOrderedLevels.length; i++) {
        const genId = engOrderedLevels[i];
        const key = genId + "|" + pt.term + "|placement";
        if (!map.has(key)) {
          map.set(key, { courseId: genId, term: pt.term, statuses: [], source: "placement" });
        }
        const a = map.get(key);
        // Placement test acts like a "final" — there's no assignment
        if (importConfig.repeatedComponent === "latest" || a.final == null || pt.grade > a.final) a.final = pt.grade;
        a.statuses.push(pt.status);
        if (pt.date && (!a.date || pt.date > a.date)) a.date = pt.date;
      }
    });

    const attempts = Array.from(map.values()).map(a => evaluateAttempt({
      courseId: a.courseId, term: a.term,
      assignment: a.assignment ?? null, final: a.final ?? null,
      status: a.statuses.includes("checking") ? "checking" : a.statuses.includes("publishing") ? "publishing" : "archive",
      source: a.source, date: a.date
    }));

    // Group by course and sort attempts within by term
    const byCourse = {};
    attempts.forEach(a => {
      if (!byCourse[a.courseId]) byCourse[a.courseId] = [];
      byCourse[a.courseId].push(a);
    });
    Object.values(byCourse).forEach(arr => arr.sort((x, y) => termOrder(x.term) - termOrder(y.term)));

    // Summary stats — count UNIQUE courses (latest attempt per course),
    // not total attempts. A subject retaken 3 times should be 1 course.
    let passedCount = 0, failedCount = 0, inProgressCount = 0;
    Object.values(byCourse).forEach(list => {
      const latest = list[list.length - 1];
      if (passedAttempt(list)) passedCount++;
      else if (latest.inProgress || latest.status !== "archive") inProgressCount++;
      else failedCount++;
    });

    const matchedIds = Object.keys(byCourse);
    const knownIds = new Set(Object.keys(subjectsById));
    const unmatched = seenIds.filter(id => !knownIds.has(id));

    return {
      byCourse,
      matchedIds,
      unmatched,
      passed: passedCount,
      failed: failedCount,
      inProgress: inProgressCount,
      totalAttempts: attempts.length
    };
  }

  return parseExamHistory;
}
