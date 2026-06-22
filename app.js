// =====================================================================
// ITE Subjects Prerequisite Graph — application logic
// Depends on: data.js (subjectsData, creditsMap, levelMap, COLORS, CATEGORY_LABELS)
// =====================================================================

// ===== User progress (from imported exam history) =====
//
// A course can be attempted many times across different terms. Each
// (courseId, term) pair is one attempt, made of two components:
//   - assignment (counts 30% toward the final grade)
//   - final       (counts 70%)
//
// A pass requires BOTH components to exist in the same term and
// (assignment * 0.3 + final * 0.7) >= 60.
// If only one component is present the attempt is "in progress".
//
// "Fulfilled" (i.e. satisfies a downstream prerequisite) just means
// the student has signed up at least once for that course in any term —
// the per-component grade doesn't matter for unlocking.
const STORAGE_KEY = "svu_ite_progress_v2";
const FILTERS_STORAGE_KEY = "svu_ite_filters_v1";
const THEME_STORAGE_KEY = "svu_ite_theme_v1";
const LANG_STORAGE_KEY = "svu_ite_lang_v1";

const TRANSLATIONS = {
  en: {
    headerTitle: "ITE Subjects Prerequisite Graph",
    headerSub: "Syrian Virtual University · Bachelor in Information Technology Engineering",
    searchPlaceholder: "Search by code or name…",
    importBtn: "Import",
    reimportBtn: "Re-import",
    yourProgress: "Your Progress",
    passed: "Passed",
    failed: "Failed",
    inProgress: "In progress",
    courses: "Courses",
    availableNext: "Available next term",
    availableHint: "All prerequisites met — you can register for this.",
    yourStatus: "Your Status",
    allAttempts: "All Attempts",
    prerequisites: "Prerequisites",
    concurrent: "Concurrent With",
    unlocks: "Unlocks",
    additionalReq: "Additional Requirement",
    manualOverride: "Manual Override",
    manuallyMarked: "Manually marked as passed",
    manualRemove: "Remove",
    manualAdd: "Mark as passed",
    manualHintOn: "Treated as passed even without an attempt — useful for transferred credits.",
    manualHintOff: "Use this if you completed the subject elsewhere (e.g. transferred credit) and it doesn't appear in your import.",
    notManuallyMarked: "Not manually marked",
    statusPassed: "✓ Passed",
    statusFailed: "✗ Failed",
    statusInProgress: "⏳ In progress",
    statusAttempted: "Attempted",
    emptyText: "Click on a subject to see its details, prerequisites, and what it unlocks.",
    emptyImport: "↓ Import Exam History",
    credits: "Credits",
    level: "Level",
    allSpecializations: "All specializations",
    specialRule: "⚠️ Special rule",
    concurrent2: "🔄 Concurrent",
    yourProgressTitle: "Your Progress",
    noPrereq: "No prerequisites",
    noDownstream: "No downstream courses",
    importTitle: "Import Exam History",
    modalParse: "Parse",
    modalApply: "Apply",
    modalCancel: "Cancel",
    clear: "Clear",
    failedToLoad: "Failed to load subjects.",
    hardRefreshHint: "Check the browser console (F12) for details. Try a hard refresh (Ctrl+Shift+R)."
  },
  ar: {
    headerTitle: "مخطط متطلبات مواد هندسة المعلوماتية",
    headerSub: "الجامعة الافتراضية السورية · إجازة في الهندسة المعلوماتية",
    searchPlaceholder: "ابحث برمز أو اسم المادة…",
    importBtn: "استيراد",
    reimportBtn: "إعادة الاستيراد",
    yourProgress: "تقدّمك",
    passed: "منجزة",
    failed: "راسبة",
    inProgress: "قيد الدراسة",
    courses: "المواد",
    availableNext: "المتاح الفصل القادم",
    availableHint: "كل المتطلبات محققة — يمكنك التسجيل بها.",
    yourStatus: "حالتك",
    allAttempts: "كل المحاولات",
    prerequisites: "المتطلبات",
    concurrent: "مشترك مع",
    unlocks: "يفتح",
    additionalReq: "شرط إضافي",
    manualOverride: "تجاوز يدوي",
    manuallyMarked: "محدّدة يدوياً كمنجزة",
    manualRemove: "إزالة",
    manualAdd: "تحديد كمنجزة",
    manualHintOn: "تُعتبر منجزة حتى دون محاولة — مفيد للاعتمادات المنقولة.",
    manualHintOff: "استخدم هذا إذا أتممت المادة في مكان آخر (مثلاً نقل اعتماد) ولا تظهر في استيرادك.",
    notManuallyMarked: "غير محددة يدوياً",
    statusPassed: "✓ منجزة",
    statusFailed: "✗ راسبة",
    statusInProgress: "⏳ قيد الدراسة",
    statusAttempted: "تمت المحاولة",
    emptyText: "انقر على مادة لعرض تفاصيلها ومتطلباتها وما تفتحه.",
    emptyImport: "↓ استيراد سجل الامتحانات",
    credits: "ساعات",
    level: "مستوى",
    allSpecializations: "كل الاختصاصات",
    specialRule: "⚠️ قاعدة خاصة",
    concurrent2: "🔄 مشترك",
    yourProgressTitle: "تقدّمك",
    noPrereq: "لا متطلبات",
    noDownstream: "لا تفتح مواد",
    importTitle: "استيراد سجل الامتحانات",
    modalParse: "تحليل",
    modalApply: "تطبيق",
    modalCancel: "إلغاء",
    clear: "مسح",
    failedToLoad: "فشل تحميل المواد.",
    hardRefreshHint: "تحقق من وحدة تحكم المتصفح (F12) للتفاصيل. جرب تحديث قسري (Ctrl+Shift+R)."
  }
};

let currentLang = "en";
function t(key) { return (TRANSLATIONS[currentLang] || TRANSLATIONS.en)[key] || key; }

function applyLang(lang) {
  currentLang = (lang === "ar") ? "ar" : "en";
  const html = document.documentElement;
  html.lang = currentLang;
  // Keep layout LTR — only translate the text, don't flip the layout
  html.dir = "ltr";
  document.body.classList.remove("rtl");

  // Update static UI strings
  document.querySelector("header h1").textContent = t("headerTitle");
  document.querySelector("header p").textContent = t("headerSub");
  const search = document.getElementById("search");
  if (search) search.placeholder = t("searchPlaceholder");
  const importBtn = document.getElementById("importBtn");
  if (importBtn && importBtn.dataset.state !== "applying") {
    const hasData = userProgress && userProgress.parsed;
    importBtn.innerHTML = `<span class="icon">↓</span> ${hasData ? t("reimportBtn") : t("importBtn")}`;
  }
  const emptyEl = document.getElementById("infoEmpty");
  if (emptyEl) {
    const emptyText = emptyEl.querySelector(".empty-text");
    const emptyBtn = emptyEl.querySelector("#emptyImportBtn");
    if (emptyText) emptyText.textContent = t("emptyText");
    if (emptyBtn) emptyBtn.textContent = t("emptyImport");
  }
  const summaryToggleLabel = document.querySelector(".summary-toggle-label");
  if (summaryToggleLabel) summaryToggleLabel.textContent = t("yourProgressTitle");
  const importTitle = document.getElementById("importTitle");
  if (importTitle) importTitle.textContent = t("importTitle");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (TRANSLATIONS[currentLang][key]) el.textContent = TRANSLATIONS[currentLang][key];
  });

  // Update the language toggle button label
  const langBtn = document.getElementById("langToggle");
  if (langBtn) langBtn.textContent = currentLang === "ar" ? "EN" : "ع";

  // Re-render anything that depends on language
  buildCategoryFilters();
  if (typeof render === "function") render();
  renderImportSummary();
  const selected = document.querySelector(".node.selected");
  if (selected) selectSubject(selected.getAttribute("data-id"));

  try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch (e) { /* ignore */ }
}

function loadLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch (e) { /* ignore */ }
  return "en";
}

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("dark", t === "dark");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = t === "dark" ? "☀" : "🌙";
  try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch (e) { /* ignore */ }
}

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch (e) { /* ignore */ }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
const TERM_NAMES = {
  S22: "Spring 2022", F22: "Fall 2022",
  S23: "Spring 2023", F23: "Fall 2023",
  S24: "Spring 2024", F24: "Fall 2024",
  S25: "Spring 2025", F25: "Fall 2025",
  S26: "Spring 2026", F26: "Fall 2026"
};
function termName(code) { return TERM_NAMES[code] || code; }

const userProgress = {
  // courseId -> [ { term, assignment, final, weighted, passed, inProgress, status, date }, ... ]
  // Sorted ascending by term; the LAST entry is the most recent attempt.
  attempts: {},
  parsed: false,
  rawText: "",
  // courseId -> true   (manually marked as passed, e.g. transferred credits)
  manualPass: {}
};
let availableNext = new Set();
let lastParsed = null;

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
  } catch (e) { /* ignore quota errors */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      userProgress.attempts = data.attempts || {};
      userProgress.parsed = !!data.parsed;
      userProgress.rawText = data.rawText || "";
      userProgress.manualPass = data.manualPass || {};
    }
  } catch (e) { /* ignore */ }
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : null;
  } catch (e) { return null; }
}

function saveFilters() {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(Array.from(activeFilters)));
  } catch (e) { /* ignore */ }
}

// ===== Parser =====
//
// Groups rows by (courseId, term). Each group becomes one attempt with
// up to two component grades (assignment, final). An attempt is "passed"
// only when BOTH components exist in the same term and the weighted
// formula >= 60. Otherwise it's "failed" (both present, weighted < 60)
// or "in progress" (one component missing).
//
// Special cases handled here:
//   - ENG_L1..L5 (English levels) — mapped to GEN301..GEN601 via the
//     rules.englishPlacement.levelMap
//   - ENG_PT  (English placement test) — a single grade that, by the
//     rules.englishPlacement.thresholds, may grant credit for several
//     consecutive English levels at once.
function parseExamHistory(text) {
  const lines = text.split(/\r?\n/);

  // Pull rules from the active faculty
  const rules = currentFaculty.passRules || {};
  const def = rules.default || { assignmentWeight: 0.3, finalWeight: 0.7, passThreshold: 60 };
  const placement = rules.englishPlacement || {};
  const engLevelMap = placement.levelMap || {};
  const engOrderedLevels = placement.orderedLevels || [];
  const engThresholds = placement.thresholds || [];

  const assignmentWeight = def.assignmentWeight;
  const finalWeight = def.finalWeight;
  const passThreshold = def.passThreshold;

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

  const iteRegex = /ITE_([A-Z]{2,4}\d{3,4})_/;
  const engLevelRegex = /ENG_(L[1-9])_/;
  const engPTRegex = /ENG_PT_/;

  lines.forEach(line => {
    // Identify the kind of row
    const iteMatch = line.match(iteRegex);
    const engLevelMatch = line.match(engLevelRegex);
    const isPT = engPTRegex.test(line);

    let mappedId = null;
    let kind = null;
    if (iteMatch) { mappedId = iteMatch[1]; kind = "course"; }
    else if (engLevelMatch) {
      const lvl = engLevelMatch[1]; // "L1".."L5"
      mappedId = engLevelMap["ENG_" + lvl] || null;
      kind = "course";
    } else if (isPT) { kind = "placement"; }
    else return;

    if (mappedId && !seenIds.includes(mappedId)) seenIds.push(mappedId);
    if (!seenIds.includes("ENG_PT") && isPT) seenIds.push("ENG_PT");

    // Find the LAST term code in the line — this is the term the
    // exam was actually taken in (a line like "ITE_BLA401_S22C1_..._F22_final"
    // refers to the F22 final; S22 is a carry-over marker).
    // NOTE: JS \b doesn't match at underscore (since _ is a word char),
    // so we use negative lookarounds against uppercase letters/digits.
    const termMatches = [...line.matchAll(/(?<![A-Z0-9])([SF])(\d{2})(?![A-Z0-9])/g)];
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
    const gradeMatch = line.match(/(\d+(?:\.\d+)?)\s*$/);
    const grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;

    if (kind === "placement") {
      placementRows.push({ term, grade, date, status: rowStatus });
      return;
    }

    const key = mappedId + "|" + term;
    if (!map.has(key)) map.set(key, { courseId: mappedId, term, statuses: [], source: "course" });
    const a = map.get(key);
    // Repeated exams in the same term: keep the HIGHEST component grade.
    // (Last row can be 0 when a placeholder row replaces a real attempt.)
    if (grade !== null && !Number.isNaN(grade)) {
      if (a[type] === undefined || grade > a[type]) a[type] = grade;
    }
    a.statuses.push(rowStatus);
    if (date && (!a.date || date > a.date)) a.date = date;
  });

  // Apply placement test results to the ordered English levels
  placementRows.forEach(pt => {
    if (pt.grade === null) return;
    const passCount = getPlacementPassCount(pt.grade);
    for (let i = 0; i < passCount && i < engOrderedLevels.length; i++) {
      const genId = engOrderedLevels[i];
      const key = genId + "|" + pt.term;
      if (!map.has(key)) {
        map.set(key, { courseId: genId, term: pt.term, statuses: [], source: "placement" });
      }
      const a = map.get(key);
      // Placement test acts like a "final" — there's no assignment
      a.final = pt.grade;
      a.statuses.push(pt.status);
      if (pt.date && (!a.date || pt.date > a.date)) a.date = pt.date;
    }
  });

  // Build attempts
  const attempts = Array.from(map.values()).map(a => {
    const assign = a.assignment;
    const fin = a.final;
    const hasBoth = assign !== undefined && fin !== undefined;
    const isPlacement = a.source === "placement";

    let weighted = null;
    let passed = false;
    let inProgress = false;

    if (isPlacement && fin !== undefined && fin !== null) {
      // Placement test bypasses the assignment component — pass
      // already determined by the threshold.
      weighted = +fin.toFixed(2);
      passed = true;
    } else if (hasBoth) {
      weighted = +(assign * assignmentWeight + fin * finalWeight).toFixed(2);
      passed = weighted >= passThreshold;
    } else {
      inProgress = true;
    }

    // Overall attempt status: any row still in checking/publishing -> in progress
    let status = "archive";
    if (a.statuses.some(s => s === "checking")) status = "checking";
    else if (a.statuses.some(s => s === "publishing")) status = "publishing";

    // If the attempt is not yet finalised (checking/publishing) it counts
    // as in-progress REGARDLESS of whether both component grades are
    // present — the grade isn't official yet, so we must not call it
    // passed or failed.
    if (status !== "archive") {
      inProgress = true;
      passed = false;
    }

    return {
      courseId: a.courseId,
      term: a.term,
      assignment: assign !== undefined ? assign : null,
      final: fin !== undefined ? fin : null,
      weighted,
      passed,
      inProgress,
      status,
      source: a.source || "course",
      date: a.date
    };
  });

  // Group by course and sort attempts within by term
  const byCourse = {};
  attempts.forEach(a => {
    if (!byCourse[a.courseId]) byCourse[a.courseId] = [];
    byCourse[a.courseId].push(a);
  });
  Object.values(byCourse).forEach(arr => arr.sort((x, y) => x.term.localeCompare(y.term)));

  // Summary stats — count UNIQUE courses (latest attempt per course),
  // not total attempts. A subject retaken 3 times should be 1 course.
  let passedCount = 0, failedCount = 0, inProgressCount = 0;
  let placementCount = 0;
  Object.values(byCourse).forEach(list => {
    const latest = list[list.length - 1];
    if (latest.source === "placement" && latest.passed) placementCount++;
    if (latest.inProgress || latest.status !== "archive") inProgressCount++;
    else if (latest.passed) passedCount++;
    else failedCount++;
  });
  const totalAttempts = attempts.length;

  const matchedIds = Object.keys(byCourse);
  const knownIds = new Set(Object.keys(subjectsById));
  const unmatched = seenIds.filter(id => !knownIds.has(id) && id !== "ENG_PT");

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

// ===== Status helpers =====
function getAttempts(id) {
  return userProgress.parsed ? (userProgress.attempts[id] || []) : [];
}
function getCurrentAttempt(id) {
  const list = getAttempts(id);
  return list.length ? list[list.length - 1] : null;
}
function isFulfilled(id) {
  if (!userProgress.parsed) return !!userProgress.manualPass[id];
  return !!userProgress.manualPass[id] || getAttempts(id).length > 0;
}
function isPassed(id) {
  if (userProgress.manualPass[id]) return true;
  const a = getCurrentAttempt(id);
  return !!a && !a.inProgress && a.passed;
}
function isFailed(id) {
  if (userProgress.manualPass[id]) return false;
  const a = getCurrentAttempt(id);
  return !!a && !a.inProgress && !a.passed;
}
function isInProgress(id) {
  if (userProgress.manualPass[id]) return false;
  const a = getCurrentAttempt(id);
  if (!a) return false;
  return a.inProgress || a.status === "checking" || a.status === "publishing";
}

// A subject is "available next term" if the student hasn't taken it yet
// AND every prerequisite has been signed up for (fulfilled).
function isAvailableNext(id) {
  const s = subjectsById[id];
  if (!s) return false;
  if (!userProgress.parsed) return false;
  if (isFulfilled(id)) return false;
  return s.prereq.every(p => isFulfilled(p));
}

function recomputeAvailableNext() {
  availableNext = new Set();
  Object.keys(subjectsById).forEach(id => {
    if (isAvailableNext(id)) availableNext.add(id);
  });
}

function getNodeStatus(id) {
  if (!userProgress.parsed) return null;
  if (isInProgress(id)) return "in-progress";
  if (isPassed(id)) return "passed";
  if (isFailed(id)) return "failed";
  if (availableNext.has(id)) return "available-next";
  return null;
}

// =====================================================================
// Original graph code follows
// =====================================================================

// ===== Build lookup structures from active faculty =====
let subjectsById = {};
let dependents = {};
let levelOf = {};

function buildDataStructures() {
  subjectsById = {};
  dependents = {};
  levelOf = {};

  // Pull the subjects list. Prefer currentFaculty (new structure); fall
  // back to the legacy subjectsData export if it isn't available.
  const subjectList = (typeof currentFaculty !== "undefined" && currentFaculty && currentFaculty.subjects)
    ? currentFaculty.subjects
    : (typeof subjectsData !== "undefined" ? subjectsData : []);

  if (!subjectList.length) {
    console.error("[ITE Graph] No subjects found — currentFaculty and subjectsData are both empty.");
  }

  // Build lookup by id. Keep legacy aliases `prereq` and `lvl` so the
  // rest of the file doesn't have to be touched.
  subjectList.forEach(s => {
    // Normalize to the canonical shape regardless of which source we used
    const normalized = {
      id: s.id,
      name: s.name,
      nameAr: s.nameAr,
      category: s.category || s.cat,
      specialization: s.specialization || s.spec || [],
      credits: s.credits != null ? s.credits : (creditsMap[s.id] || 0),
      level: s.level != null ? s.level : (levelMap[s.id] || 3),
      prerequisites: s.prerequisites || s.prereq || [],
      concurrent: s.concurrent || null,
      extra: s.extra || null
    };
    subjectsById[s.id] = {
      ...normalized,
      prereq: normalized.prerequisites,
      lvl: normalized.level
    };
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
try {
  buildDataStructures();
  console.log(`[ITE Graph] Loaded ${Object.keys(subjectsById).length} subjects, ${Object.keys(levelOf).length} levels.`);
} catch (e) {
  console.error("[ITE Graph] buildDataStructures failed:", e);
}

// ===== Layout constants =====
const COL_WIDTH = 280;
const ROW_HEIGHT = 72;
const NODE_W = 150;
const NODE_H = 52;
const PADDING = 40;

// Group ids by level (longest path from a root)
function buildLevels() {
  const levels = {};
  Object.entries(levelOf).forEach(([id, lvl]) => {
    if (!levels[lvl]) levels[lvl] = [];
    levels[lvl].push(id);
  });
  // Stable initial ordering
  Object.values(levels).forEach(arr => arr.sort());
  return levels;
}

// Barycenter heuristic (MEDIAN) — minimizes edge crossings between adjacent
// layers. Median is more robust than mean for crossing reduction.
//
// Strategy:
//   1. Seed initial ordering with the topological level index, then a
//      degree-based tie-breaker so high-fanout prereqs are at the top.
//   2. Alternate forward and backward sweeps using MEDIAN barycenter.
//   3. Stop early if a sweep produces no change (convergence).
function reduceCrossings(levels) {
  const maxLevel = Math.max(...Object.keys(levels).map(Number));
  const MAX_ITERS = 40;

  for (let it = 0; it < MAX_ITERS; it++) {
    let changed = false;

    // Forward pass
    for (let l = 1; l <= maxLevel; l++) {
      const prevPos = {};
      levels[l - 1].forEach((id, i) => prevPos[id] = i);
      if (sortByBarycenter(levels[l], prevPos, "prereq")) changed = true;
    }
    // Backward pass
    for (let l = maxLevel - 1; l >= 0; l--) {
      const nextPos = {};
      levels[l + 1].forEach((id, i) => nextPos[id] = i);
      if (sortByBarycenter(levels[l], nextPos, "dependent")) changed = true;
    }

    if (!changed) break;
  }
}

// Stable sort with a tie-breaker so equal-barycenter nodes keep their
// relative order and isolated nodes fall back to alphabetical.
function sortByBarycenter(arr, neighborPos, kind) {
  const scored = arr.map((id, originalIdx) => {
    const s = subjectsById[id];
    const neighbors = kind === "prereq" ? (s.prereq || []) : (dependents[id] || []);
    const positions = neighbors.map(n => neighborPos[n]).filter(p => p !== undefined);
    const score = positions.length ? median(positions) : Infinity;
    return { id, score, originalIdx };
  });
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.originalIdx - b.originalIdx;
  });
  const before = arr.join(",");
  arr.length = 0;
  scored.forEach(x => arr.push(x.id));
  return arr.join(",") !== before;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Sifting pass: for each layer, try every node at every position and keep
// the assignment with the smallest sum of edge lengths. Helps with the
// long curved edges common in dense graphs.
function siftLayers(levels) {
  const lvlKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
  lvlKeys.forEach(l => {
    const arr = levels[l];
    let best = arr.slice();
    let bestCost = layerCost(best, l, levels);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < arr.length; i++) {
        const id = arr[i];
        // Try moving `id` to every other position
        for (let j = 0; j < arr.length; j++) {
          if (j === i) continue;
          const trial = arr.slice();
          trial.splice(i, 1);
          trial.splice(j, 0, id);
          const cost = layerCost(trial, l, levels);
          if (cost < bestCost) {
            best = trial;
            bestCost = cost;
            arr.length = 0;
            best.forEach(x => arr.push(x));
            i = -1; // restart
            break;
          }
        }
      }
    }
  });
}

// Cost = sum of edge lengths crossing this layer (proxy for total edge
// length, ignoring the layer's own nodes' internal edges).
function layerCost(arr, lvl, levels) {
  const pos = {};
  arr.forEach((id, i) => pos[id] = i);
  let cost = 0;
  const neighborsLayers = [];
  if (levels[lvl - 1]) neighborsLayers.push(levels[lvl - 1]);
  if (levels[lvl + 1]) neighborsLayers.push(levels[lvl + 1]);
  neighborsLayers.forEach(nbrLayer => {
    nbrLayer.forEach(nid => {
      const s = subjectsById[nid];
      if (!s) return;
      // Edges from nid to a node in `arr`:
      (s.prereq || []).forEach(p => {
        if (pos[p] !== undefined) cost += Math.abs(pos[p] - (nbrLayer.indexOf(nid)));
      });
      (dependents[nid] || []).forEach(d => {
        if (pos[d] !== undefined) cost += Math.abs(pos[d] - (nbrLayer.indexOf(nid)));
      });
    });
  });
  return cost;
}

function barycenter(a, b, neighborPos, kind) {
  const sa = subjectsById[a];
  const sb = subjectsById[b];
  const neighbors = kind === "prereq" ? (sa.prereq || []) : (dependents[a] || []);
  const neighborsB = kind === "prereq" ? (sb.prereq || []) : (dependents[b] || []);
  const positionsA = neighbors.map(n => neighborPos[n]).filter(p => p !== undefined);
  const positionsB = neighborsB.map(n => neighborPos[n]).filter(p => p !== undefined);

  if (positionsA.length === 0 && positionsB.length === 0) return 0;
  if (positionsA.length === 0) return 1;
  if (positionsB.length === 0) return -1;

  return median(positionsA) - median(positionsB);
}

function buildLayout() {
  const levels = buildLevels();
  reduceCrossings(levels);
  siftLayers(levels);

  const positions = {};
  let maxRows = 0;
  Object.entries(levels).forEach(([lvl, ids]) => {
    maxRows = Math.max(maxRows, ids.length);
    ids.forEach((id, i) => {
      positions[id] = {
        x: parseInt(lvl) * COL_WIDTH + PADDING,
        y: i * ROW_HEIGHT + PADDING
      };
    });
  });

  // Force-directed relaxation: nodes repel each other, edges pull connected
  // nodes closer. This breaks out of the strict row layout so vertical
  // spacing relaxes and edges feel less crowded.
  relaxPositions(positions, levels);

  const maxLevel = Math.max(...Object.keys(levels).map(Number));
  let totalHeight = 0;
  Object.values(positions).forEach(p => { if (p.y > totalHeight) totalHeight = p.y; });
  totalHeight += ROW_HEIGHT + PADDING * 2;
  const totalWidth = (maxLevel + 1) * COL_WIDTH + PADDING;
  return { positions, levels, totalWidth, totalHeight };
}

// Gentle Y-relaxation: for each layer, move each node toward the
// median Y of its connected nodes in adjacent layers. Then enforce
// a minimum spacing so nodes don't overlap. Avoids the chaos of a
// full force-directed approach while still letting edges breathe.
function relaxPositions(positions, levels) {
  const lvlKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);

  // First pass: collect connected positions
  const targetY = {};
  Object.keys(positions).forEach(id => targetY[id] = null);
  Object.entries(positions).forEach(([id, p]) => {
    const s = subjectsById[id];
    if (!s) return;
    const ys = [];
    (s.prereq || []).forEach(p2 => {
      if (positions[p2]) ys.push(positions[p2].y);
    });
    (dependents[id] || []).forEach(d => {
      if (positions[d]) ys.push(positions[d].y);
    });
    targetY[id] = ys.length ? median(ys) : p.y;
  });

  // Move each layer toward its targets (smoothed, partial step)
  lvlKeys.forEach(l => {
    levels[l].forEach(id => {
      const cur = positions[id].y;
      const tgt = targetY[id];
      if (tgt === null) return;
      // Step 35% of the way toward target each round; do 4 rounds total
      positions[id].y = cur + (tgt - cur) * 0.35;
    });
  });

  // Enforce minimum vertical spacing within each layer (sweep top-down)
  enforceMinSpacing(positions, levels);

  // Second smoothing round
  lvlKeys.forEach(l => {
    levels[l].forEach(id => {
      const s = subjectsById[id];
      if (!s) return;
      const ys = [];
      (s.prereq || []).forEach(p2 => { if (positions[p2]) ys.push(positions[p2].y); });
      (dependents[id] || []).forEach(d => { if (positions[d]) ys.push(positions[d].y); });
      if (ys.length) {
        const tgt = median(ys);
        positions[id].y = positions[id].y + (tgt - positions[id].y) * 0.2;
      }
    });
  });
  enforceMinSpacing(positions, levels);
}

function enforceMinSpacing(positions, levels) {
  const MIN_DY = ROW_HEIGHT - 14;
  Object.keys(levels).forEach(l => {
    const arr = levels[l];
    arr.sort((a, b) => positions[a].y - positions[b].y);
    let lastY = -Infinity;
    arr.forEach(id => {
      const minY = lastY + MIN_DY;
      if (positions[id].y < minY) positions[id].y = minY;
      lastY = positions[id].y;
    });
  });
}

// ===== SVG helpers =====
const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach(c => node.appendChild(c));
  return node;
}

// ===== Render state =====
let currentLayout = null;
let currentHighlight = null;
let currentSearch = "";
const activeFilters = new Set(["general", "basic", "SE", "AI", "SCN"]);

// ===== Render =====
function render() {
  const svg = document.getElementById("graph");
  svg.innerHTML = "";

  const layout = buildLayout();
  currentLayout = layout;
  svg.setAttribute("viewBox", `0 0 ${layout.totalWidth} ${layout.totalHeight}`);
  svg.setAttribute("width", layout.totalWidth);
  svg.setAttribute("height", layout.totalHeight);

  // Arrow markers
  const defs = el("defs");
  defs.appendChild(el("marker", {
    id: "arrow",
    viewBox: "0 0 10 10",
    refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: "auto-start-reverse"
  }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#a0aec0" })]));
  defs.appendChild(el("marker", {
    id: "arrow-active",
    viewBox: "0 0 10 10",
    refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: "auto-start-reverse"
  }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#ed8936" })]));
  svg.appendChild(defs);

  // Edges
  const edgesGroup = el("g", { id: "edges" });
  svg.appendChild(edgesGroup);

  Object.values(subjectsById).forEach(s => {
    s.prereq.forEach(p => {
      if (!layout.positions[p] || !layout.positions[s.id]) return;
      const from = layout.positions[p];
      const to = layout.positions[s.id];
      const x1 = from.x + NODE_W;
      const y1 = from.y + NODE_H / 2;
      const x2 = to.x;
      const y2 = to.y + NODE_H / 2;
      const dx = (x2 - x1) * 0.5;
      const path = el("path", {
        class: "edge",
        d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        "data-from": p,
        "data-to": s.id
      });
      edgesGroup.appendChild(path);
    });
  });

  // Nodes
  const nodesGroup = el("g", { id: "nodes" });
  svg.appendChild(nodesGroup);

  Object.entries(layout.positions).forEach(([id, pos]) => {
    const s = subjectsById[id];
    const cat = currentFaculty.categories[s.category] || currentFaculty.categories.basic;
    const status = getNodeStatus(id);
    const current = getCurrentAttempt(id);
    const g = el("g", {
      class: `node${status ? " " + status : ""}`,
      "data-id": id,
      transform: `translate(${pos.x}, ${pos.y})`
    });

    // Gradient background (slightly darker on bottom for depth)
    const gradId = `grad-${s.category}-${pos.x}-${pos.y}`;
    const grad = el("linearGradient", { id: gradId, x1: "0", y1: "0", x2: "0", y2: "1" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": cat.color }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": cat.stroke }));
    defs.appendChild(grad);

    g.appendChild(el("rect", {
      x: 0, y: 0,
      width: NODE_W, height: NODE_H,
      rx: 7, ry: 7,
      fill: `url(#${gradId})`,
      stroke: cat.stroke
    }));

    // Course code
    g.appendChild(el("text", {
      class: "code",
      x: NODE_W / 2, y: 16,
      "text-anchor": "middle"
    }, [document.createTextNode(s.id)]));

    // Truncated name (Arabic-aware: ~18 chars max because Arabic glyphs are wider)
    let name = currentLang === "ar" && s.nameAr ? s.nameAr : s.name;
    const maxLen = currentLang === "ar" ? 18 : 26;
    if (name.length > maxLen) name = name.slice(0, maxLen - 1) + "…";
    g.appendChild(el("text", {
      class: "name",
      x: NODE_W / 2, y: 30
    }, [document.createTextNode(name)]));

    // Credits / level
    g.appendChild(el("text", {
      class: "meta-text",
      x: NODE_W / 2, y: 44
    }, [document.createTextNode(`${s.credits} ${currentLang === "ar" ? "س" : "CR"} · ${currentLang === "ar" ? "م" : "L"}${s.lvl}`)]));

    // Status badge (top-right)
    const bx = NODE_W - 9, by = 9;
    if (current) {
      let badgeColor = "#94a3b8";
      let iconPath = "";
      if (status === "passed")       { badgeColor = "#16a34a"; iconPath = `M ${bx-3} ${by} L ${bx-0.5} ${by+2.5} L ${bx+3} ${by-2.5}`; }
      else if (status === "failed")  { badgeColor = "#dc2626"; iconPath = `M ${bx-3} ${by-3} L ${bx+3} ${by+3} M ${bx+3} ${by-3} L ${bx-3} ${by+3}`; }
      else if (status === "in-progress") { badgeColor = "#d97706"; iconPath = `M ${bx-3} ${by-2.5} L ${bx+3} ${by-2.5} M ${bx} ${by-2.5} L ${bx} ${by+2.5} M ${bx-3} ${by+2.5} L ${bx+3} ${by+2.5}`; }

      g.appendChild(el("circle", {
        cx: bx, cy: by, r: 6.5,
        fill: badgeColor, stroke: "#fff", "stroke-width": 1.5
      }));
      if (iconPath) {
        g.appendChild(el("path", {
          d: iconPath,
          stroke: "#fff", "stroke-width": 1.6, fill: "none",
          "stroke-linecap": "round", "stroke-linejoin": "round"
        }));
      }
    } else if (status === "available-next") {
      g.appendChild(el("circle", {
        cx: bx, cy: by, r: 5,
        fill: "#16a34a", stroke: "#fff", "stroke-width": 1.5
      }));
      g.appendChild(el("path", {
        d: `M ${bx-2} ${by} L ${bx+2} ${by} M ${bx} ${by-2} L ${bx} ${by+2}`,
        stroke: "#fff", "stroke-width": 1.4, fill: "none",
        "stroke-linecap": "round"
      }));
    }

    // Grade overlay (bottom-right) — uses the LATEST attempt's weighted grade
    if (current) {
      let gradeText = null;
      if (current.weighted !== null) gradeText = current.weighted.toFixed(0);
      else if (current.assignment !== null) gradeText = "A:" + current.assignment.toFixed(0);
      else if (current.final !== null) gradeText = "F:" + current.final.toFixed(0);

      if (gradeText !== null) {
        g.appendChild(el("rect", {
          x: NODE_W - 36, y: NODE_H - 14,
          width: 32, height: 11, rx: 3,
          fill: "rgba(0, 0, 0, 0.22)"
        }));
        g.appendChild(el("text", {
          class: "grade-overlay",
          x: NODE_W - 20, y: NODE_H - 5.5,
          "text-anchor": "middle"
        }, [document.createTextNode(gradeText)]));
      }
    }

    g.addEventListener("click", () => selectSubject(id));
    g.addEventListener("mouseenter", () => highlightPath(id, true));
    g.addEventListener("mouseleave", () => highlightPath(id, false));
    nodesGroup.appendChild(g);
  });

  applyFilters();
}

// ===== Highlight a path =====
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

function highlightPath(id, on) {
  const svg = document.getElementById("graph");
  if (!on) {
    if (currentHighlight) currentHighlight = null;
    applyFilters();
    return;
  }
  currentHighlight = id;
  const upstream = getUpstream(id);
  upstream.add(id);
  const downstream = getDownstream(id);

  svg.querySelectorAll(".node").forEach(n => {
    const nid = n.getAttribute("data-id");
    n.classList.remove("highlighted", "dimmed", "upstream-dim", "downstream-dim");
    if (nid === id) n.classList.add("highlighted");
    else if (upstream.has(nid)) n.classList.add("downstream-dim");
    else if (downstream.has(nid)) n.classList.add("upstream-dim");
    else n.classList.add("dimmed");
  });
  svg.querySelectorAll(".edge").forEach(e => {
    const from = e.getAttribute("data-from");
    const to = e.getAttribute("data-to");
    e.classList.remove("highlighted", "dimmed");
    const inUpstream = upstream.has(from) && upstream.has(to);
    const inDownstream = downstream.has(from) && downstream.has(to);
    const involvesCenter = (from === id || to === id);
    if (inUpstream || inDownstream || involvesCenter) {
      e.classList.add("highlighted");
      e.setAttribute("marker-end", "url(#arrow-active)");
    } else {
      e.setAttribute("marker-end", "url(#arrow)");
    }
  });
}

function clearHighlight() {
  const svg = document.getElementById("graph");
  svg.querySelectorAll(".node").forEach(n => n.classList.remove("highlighted", "dimmed", "upstream-dim", "downstream-dim"));
  svg.querySelectorAll(".edge").forEach(e => {
    e.classList.remove("highlighted", "dimmed");
    e.setAttribute("marker-end", "url(#arrow)");
  });
}

function applyFilters() {
  const svg = document.getElementById("graph");
  svg.querySelectorAll(".node").forEach(n => {
    const id = n.getAttribute("data-id");
    const s = subjectsById[id];
    const cat = s.category || s.cat;
    const visible = activeFilters.has(cat);
    n.style.display = visible ? "" : "none";
  });
  svg.querySelectorAll(".edge").forEach(e => {
    const from = e.getAttribute("data-from");
    const to = e.getAttribute("data-to");
    const fromCat = subjectsById[from].category || subjectsById[from].cat;
    const toCat = subjectsById[to].category || subjectsById[to].cat;
    const visible = activeFilters.has(fromCat) && activeFilters.has(toCat);
    e.style.display = visible ? "" : "none";
  });
  if (currentSearch) applySearch();
}

function applySearch() {
  const svg = document.getElementById("graph");
  const q = currentSearch.toLowerCase().trim();
  if (!q) {
    svg.querySelectorAll(".node").forEach(n => { n.style.opacity = ""; });
    return;
  }
  svg.querySelectorAll(".node").forEach(n => {
    const id = n.getAttribute("data-id");
    const s = subjectsById[id];
    const match = s.id.toLowerCase().includes(q) ||
                  s.name.toLowerCase().includes(q) ||
                  (s.nameAr || "").includes(q);
    n.style.opacity = match ? "1" : "0.15";
  });
}

// ===== Info panel =====
function renderImportSummary() {
  const emptyEl = document.getElementById("infoEmpty");
  const summaryEl = document.getElementById("summarySection");
  const summaryBody = document.getElementById("summaryBody");

  if (!userProgress.parsed) {
    if (emptyEl) emptyEl.hidden = false;
    if (summaryEl) summaryEl.hidden = true;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  if (summaryEl) summaryEl.hidden = false;

  let passed = 0, failed = 0, inProgress = 0;
  let passedCredits = 0, inProgressCredits = 0;
  Object.values(userProgress.attempts).forEach(list => {
    const latest = list[list.length - 1];
    const sub = subjectsById[latest.courseId];
    const cr = sub ? sub.credits : 0;
    if (latest.inProgress || latest.status !== "archive") { inProgress++; inProgressCredits += cr; }
    else if (latest.passed) { passed++; passedCredits += cr; }
    else failed++;
  });
  // Include manually marked courses in the totals
  Object.keys(userProgress.manualPass).forEach(id => {
    if (userProgress.attempts[id]) return;
    const sub = subjectsById[id];
    if (!sub) return;
    passed++;
    passedCredits += sub.credits || 0;
  });
  const totalCourses = Object.keys(userProgress.attempts).length;
  const availableList = Array.from(availableNext).sort();

  const availableChips = availableList.length
    ? availableList.map(id => {
        const sub = subjectsById[id];
        const cat = sub ? (currentFaculty.categories[sub.category] || currentFaculty.categories.basic) : null;
        const catKey = sub ? sub.category : "";
        const credits = sub ? sub.credits : 0;
        const style = cat ? ` style="--chip-color:${cat.color};color:${cat.stroke};border-color:${cat.color};"` : "";
        const creditsLabel = credits ? `<span class="chip-credits">${credits}${currentLang === "ar" ? "س" : "cr"}</span>` : "";
        return `<span class="chip cat-chip-inline" data-id="${id}" data-cat="${catKey}"${style}>${id}${creditsLabel}</span>`;
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
      const node = document.querySelector(`.node[data-id="${targetId}"]`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        selectSubject(targetId);
        highlightPath(targetId, true);
      }
    });
  });
  document.getElementById("reImportBtn").addEventListener("click", openImportModal);
  document.getElementById("clearImportBtn").addEventListener("click", clearImportedData);
}

function selectSubject(id) {
  const s = subjectsById[id];
  if (!s) return;
  const cat = currentFaculty.categories[s.category] || currentFaculty.categories.basic;
  const color = { fill: cat.color, stroke: cat.stroke };
  const catLabel = (cat.label && (cat.label[currentLang] || cat.label.en)) || cat.label || "";
  const specList = s.spec && s.spec.length ? s.spec.join(", ") : t("allSpecializations");

  const upstream = Array.from(getUpstream(id));
  const downstream = Array.from(getDownstream(id)).filter(d => d !== id);

  const status = getNodeStatus(id);
  const attempts = getAttempts(id);

  // Personal status banner
  let personalStatus = "";
  if (attempts.length > 0) {
    const latest = attempts[attempts.length - 1];
    const statusLabel = isPassed(id) ? t("statusPassed") :
                       isFailed(id) ? t("statusFailed") :
                       isInProgress(id) ? t("statusInProgress") : t("statusAttempted");
    const statusColor = isPassed(id) ? "#38a169" :
                        isFailed(id) ? "#e53e3e" :
                        isInProgress(id) ? "#d69e2e" : "#a0aec0";
    const gradeText = latest.weighted !== null
      ? `<strong>${latest.weighted.toFixed(2)}</strong>`
      : (latest.assignment !== null ? `A: ${latest.assignment.toFixed(2)}` :
         latest.final !== null ? `F: ${latest.final.toFixed(2)}` : "—");
    personalStatus = `
      <div class="info-section" style="margin-top:0;">
        <h3>${t("yourStatus")}</h3>
        <div class="status-banner ${isPassed(id) ? "passed" : isFailed(id) ? "failed" : isInProgress(id) ? "progress" : ""}">
          <span class="status-icon">${isPassed(id) ? "✓" : isFailed(id) ? "✗" : isInProgress(id) ? "⏳" : "•"}</span>
          <div style="flex:1;">
            <div class="status-text">${statusLabel}</div>
            <div class="status-detail">${currentLang === "ar" ? "آخر" : "Latest"}: ${termName(latest.term)} · ${gradeText}</div>
          </div>
        </div>
      </div>
    `;

    // All attempts list
    const attemptsHtml = attempts.slice().reverse().map(a => {
      const aClass = a.passed ? "passed" : a.inProgress ? "progress" : "failed";
      const aLabel = a.passed ? t("statusPassed") : a.inProgress ? t("statusInProgress") : t("statusFailed");
      const aColor = a.passed ? "#38a169" : a.inProgress ? "#d69e2e" : "#e53e3e";
      const sourceBadge = a.source === "placement"
        ? `<span class="source-badge placement">${currentLang === "ar" ? "تحديد مستوى" : "Placement"}</span>`
        : `<span class="source-badge course">${currentLang === "ar" ? "مقرر" : "Course"}</span>`;
      // Placement attempts only have a "final" grade; show it accordingly
      const showAssignment = a.source !== "placement";
      const showFinal = true;
      const aAssign = !showAssignment ? "—"
                    : (a.assignment !== null ? a.assignment.toFixed(2) : "—");
      const aFinal = !showFinal ? "—"
                    : (a.final !== null ? a.final.toFixed(2) : "—");
      const aWeighted = a.weighted !== null ? a.weighted.toFixed(2) : "—";
      return `
        <div class="attempt-card ${aClass}">
          <div class="attempt-header">
            <span class="attempt-term">${termName(a.term)}</span>
            <span class="attempt-status" style="color:${aColor};">${aLabel}</span>
          </div>
          <div class="source-row">${sourceBadge}</div>
          <div class="attempt-grades">
            <div class="grade-row"><span class="grade-label">Assignment <span style="opacity:0.6;">(${Math.round((currentFaculty.passRules?.default?.assignmentWeight || 0.3) * 100)}%)</span></span><span class="grade-value ${a.assignment === null ? "missing" : ""}">${aAssign}</span></div>
            <div class="grade-row"><span class="grade-label">Final <span style="opacity:0.6;">(${Math.round((currentFaculty.passRules?.default?.finalWeight || 0.7) * 100)}%)</span></span><span class="grade-value ${a.final === null ? "missing" : ""}">${aFinal}</span></div>
            <div class="grade-row total"><span class="grade-label">Weighted</span><span class="grade-value ${a.weighted === null ? "missing" : ""}">${aWeighted}</span></div>
          </div>
        </div>
      `;
    }).join("");

    personalStatus += `
      <div class="info-section">
        <h3>${t("allAttempts")} (${attempts.length})</h3>
        <div class="attempt-list">${attemptsHtml}</div>
      </div>
    `;
  } else if (status === "available-next") {
    personalStatus = `
      <div class="info-section" style="margin-top:0;">
        <h3>${t("yourStatus")}</h3>
        <div class="status-banner passed" style="background:#f0fff4; color:#22543d;">
          <span class="status-icon">→</span>
          <div style="flex:1;">
            <div class="status-text">${t("availableNext")}</div>
            <div class="status-detail">${t("availableHint")}</div>
          </div>
        </div>
      </div>
    `;
  }

  const prereqChips = s.prereq.length
    ? s.prereq.map(p => {
        const st = getNodeStatus(p);
        const tick = st === "passed" ? ' <span style="color:#38a169">✓</span>'
                   : st === "failed" ? ' <span style="color:#e53e3e">✗</span>'
                   : st === "in-progress" ? ' <span style="color:#d69e2e">⏳</span>'
                   : st === "available-next" ? ' <span style="color:#3182ce">→</span>' : "";
        return `<span class="chip" data-id="${p}">${p}${tick}</span>`;
      }).join("")
    : `<span class="chip empty">${t("noPrereq")}</span>`;

  const downChips = downstream.length
    ? downstream.map(d => {
        const st = getNodeStatus(d);
        const tick = st === "passed" ? ' <span style="color:#38a169">✓</span>'
                   : st === "failed" ? ' <span style="color:#e53e3e">✗</span>'
                   : st === "in-progress" ? ' <span style="color:#d69e2e">⏳</span>'
                   : st === "available-next" ? ' <span style="color:#3182ce">→</span>' : "";
        return `<span class="chip" data-id="${d}">${d}${tick}</span>`;
      }).join("")
    : `<span class="chip empty">${t("noDownstream")}</span>`;

  const concurrent = s.concurrent
    ? `<span class="chip" data-id="${s.concurrent}">${s.concurrent} (concurrent)</span>`
    : "";

  const extra = s.extra
    ? `<div class="info-section"><h3>${t("additionalReq")}</h3><div class="info-desc">${s.extra}</div></div>`
    : "";

  const isManual = !!userProgress.manualPass[id];
  const manualBlock = `
    <div class="info-section manual-section">
      <h3>${t("manualOverride")}</h3>
      <div class="manual-row">
        <div class="manual-info">
          ${isManual
            ? `<div class="manual-state on">✓ ${t("manuallyMarked")}</div>
               <div class="manual-hint">${t("manualHintOn")}</div>`
            : `<div class="manual-state off">${t("notManuallyMarked")}</div>
               <div class="manual-hint">${t("manualHintOff")}</div>`}
        </div>
        <button class="manual-btn ${isManual ? "remove" : "add"}" id="manualPassBtn">
          ${isManual ? `↺ ${t("manualRemove")}` : `✓ ${t("manualAdd")}`}
        </button>
      </div>
    </div>
  `;

  const html = `
    <div class="info-head">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="info-code" style="background:${color.stroke}">${s.id}</span>
        <span class="meta-pill" style="background:${cat.color};color:#fff;">${catLabel}</span>
        <span class="meta-pill">${s.credits} ${t("credits")}</span>
        <span class="meta-pill">${t("level")} ${s.lvl}</span>
      </div>
      <div class="info-title">${currentLang === "ar" && s.nameAr ? s.nameAr : s.name}</div>
      <div class="info-subtitle">${currentLang === "ar" && s.nameAr ? s.name : (s.nameAr || "")}</div>
      <div class="info-meta">
        <span class="meta-pill">📚 ${specList}</span>
        ${s.concurrent ? `<span class="meta-pill">${t("concurrent2")}</span>` : ''}
        ${s.extra ? `<span class="meta-pill">${t("specialRule")}</span>` : ''}
      </div>
    </div>

    ${personalStatus}

    ${manualBlock}

    ${extra}

    <div class="info-section">
      <h3>${t("prerequisites")} (${s.prereq.length})</h3>
      <div class="chip-list">${prereqChips}</div>
    </div>

    ${concurrent ? `<div class="info-section">
      <h3>${t("concurrent")}</h3>
      <div class="chip-list">${concurrent}</div>
    </div>` : ""}

    <div class="info-section">
      <h3>${t("unlocks")} (${downstream.length})</h3>
      <div class="chip-list">${downChips}</div>
    </div>
  `;

  const detailEl = document.getElementById("detailSection");
  detailEl.innerHTML = html;
  detailEl.hidden = false;

  detailEl.querySelectorAll(".chip[data-id]").forEach(chip => {
    chip.addEventListener("click", () => {
      const targetId = chip.getAttribute("data-id");
      const node = document.querySelector(`.node[data-id="${targetId}"]`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        selectSubject(targetId);
        highlightPath(targetId, true);
      }
    });
  });

  const manualBtn = document.getElementById("manualPassBtn");
  if (manualBtn) {
    manualBtn.addEventListener("click", () => {
      if (userProgress.manualPass[id]) {
        delete userProgress.manualPass[id];
      } else {
        userProgress.manualPass[id] = true;
      }
      saveProgress();
      recomputeAvailableNext();
      renderGraph();
      renderImportSummary();
      selectSubject(id);
    });
  }
}

// ===== Build merged category filter (legend + filter in one) =====
// Recount visible chips in the "Available next term" panel — chips are hidden
// via a body class (cat-hidden-<cat>) so we need JS to update the count.
function updateAvailableCount() {
  const countEl = document.getElementById("availableCount");
  const listEl = document.getElementById("availableList");
  if (!countEl || !listEl) return;
  const chips = listEl.querySelectorAll(".chip[data-cat]");
  let visible = 0;
  chips.forEach(c => { if (c.offsetParent !== null) visible++; });
  countEl.textContent = visible;
}

function buildCategoryFilters() {
  const el = document.getElementById("catFilters");
  el.innerHTML = "";
  const saved = loadFilters();

  Object.entries(currentFaculty.categories).forEach(([cat, info]) => {
    // saved === null → never been persisted, default to active
    const isActive = saved === null ? true : saved.has(cat);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "cat-chip" + (isActive ? " active" : "");
    chip.dataset.cat = cat;
    chip.style.setProperty("--chip-color", info.color);
    chip.innerHTML = `
      <span class="cat-dot"></span>
      <span class="cat-label">${(info.label && (info.label[currentLang] || info.label.en)) || info.label || ""}</span>
      <span class="cat-check">✓</span>
    `;
    if (!isActive) {
      activeFilters.delete(cat);
      document.body.classList.add("cat-hidden-" + cat);
    } else {
      activeFilters.add(cat);
    }
    chip.addEventListener("click", () => {
      const nowActive = chip.classList.toggle("active");
      if (nowActive) {
        activeFilters.add(cat);
        document.body.classList.remove("cat-hidden-" + cat);
      } else {
        activeFilters.delete(cat);
        document.body.classList.add("cat-hidden-" + cat);
      }
      applyFilters();
      updateAvailableCount();
      saveFilters();
    });
    el.appendChild(chip);
  });
}

// ===== Search =====
document.getElementById("search").addEventListener("input", e => {
  currentSearch = e.target.value;
  if (currentSearch) {
    clearHighlight();
    applySearch();
  } else {
    applyFilters();
  }
});

// ===== Zoom & pan =====
const graphWrap = document.getElementById("graphWrap");
let zoom = 1;
const ZOOM_STEP = 0.15;
function applyZoom() {
  const svg = document.getElementById("graph");
  svg.style.transformOrigin = "0 0";
  svg.style.transform = `scale(${zoom})`;
}
document.getElementById("zoomIn").addEventListener("click", () => {
  zoom = Math.min(2.5, zoom + ZOOM_STEP);
  applyZoom();
});
document.getElementById("zoomOut").addEventListener("click", () => {
  zoom = Math.max(0.3, zoom - ZOOM_STEP);
  applyZoom();
});
document.getElementById("zoomReset").addEventListener("click", () => {
  zoom = 1;
  applyZoom();
  graphWrap.scrollTo({ top: 0, left: 0, behavior: "smooth" });
});
graphWrap.addEventListener("wheel", e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) zoom = Math.min(2.5, zoom + ZOOM_STEP);
    else zoom = Math.max(0.3, zoom - ZOOM_STEP);
    applyZoom();
  }
}, { passive: false });

// ===== Import modal =====
const importModal = document.getElementById("importModal");
const importBtn = document.getElementById("importBtn");
const examTextarea = document.getElementById("examTextarea");
const parseResult = document.getElementById("parseResult");
const parseSummary = document.getElementById("parseSummary");
const modalParseBtn = document.getElementById("modalParseBtn");
const modalApplyBtn = document.getElementById("modalApplyBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalClearBtn = document.getElementById("modalClearBtn");

function openImportModal() {
  examTextarea.value = userProgress.rawText || "";
  parseResult.hidden = true;
  modalApplyBtn.hidden = true;
  modalClearBtn.hidden = !userProgress.parsed;
  importModal.hidden = false;
  setTimeout(() => examTextarea.focus(), 50);
}
function closeImportModal() {
  importModal.hidden = true;
}

function runParse() {
  const text = examTextarea.value.trim();
  if (!text) {
    parseSummary.innerHTML = `<div class="parse-message error">Please paste the table first.</div>`;
    parseResult.hidden = false;
    modalApplyBtn.hidden = true;
    return;
  }
  lastParsed = parseExamHistory(text);
  const { byCourse, matchedIds, unmatched, passed, failed, inProgress } = lastParsed;
  const total = matchedIds.length;

  if (total === 0) {
    parseSummary.innerHTML = `
      <div class="parse-message error">
        <strong>No course attempts found.</strong>
        Make sure you pasted rows from the SVU table — each should contain
        <code>ITE_XXX###_</code>, <code>ENG_L1..L5_</code>, or <code>ENG_PT_</code>.
      </div>
    `;
    modalApplyBtn.hidden = true;
  } else {
    const availableCount = computeAvailableFor(byCourse);
    // Average weighted across graded attempts
    let graded = 0, totalWeighted = 0;
    Object.values(byCourse).forEach(list => list.forEach(a => {
      if (!a.inProgress && a.weighted !== null) {
        graded++;
        totalWeighted += a.weighted;
      }
    }));
    const avg = graded > 0 ? (totalWeighted / graded).toFixed(2) : "—";

    const unmatchedHtml = unmatched.length
      ? `<div class="unmatched-box">
           <strong>${unmatched.length}</strong> unrecognized code${unmatched.length > 1 ? "s" : ""}:
           <div class="unmatched-list">${unmatched.slice(0, 10).map(u => `<span class="unmatched-chip">${u}</span>`).join("")}${unmatched.length > 10 ? `<span class="unmatched-more">+${unmatched.length - 10} more</span>` : ""}</div>
         </div>`
      : "";

    parseSummary.innerHTML = `
      <div class="parse-summary-grid">
        <div class="stat-row total">
          <div class="stat-icon">📋</div>
          <span class="stat-label">Courses detected</span>
          <span class="stat-value">${total}</span>
        </div>
        <div class="stat-row passed">
          <div class="stat-icon">✓</div>
          <span class="stat-label">Passed</span>
          <span class="stat-value">${passed}</span>
        </div>
        <div class="stat-row failed">
          <div class="stat-icon">✗</div>
          <span class="stat-label">Failed</span>
          <span class="stat-value">${failed}</span>
        </div>
        <div class="stat-row progress">
          <div class="stat-icon">⏳</div>
          <span class="stat-label">In progress</span>
          <span class="stat-value">${inProgress}</span>
        </div>
        <div class="stat-row available">
          <div class="stat-icon">→</div>
          <span class="stat-label">Available next term</span>
          <span class="stat-value">${availableCount}</span>
        </div>
      </div>
      <div class="avg-grade">
        <span class="avg-label">Average weighted grade</span>
        <span class="avg-value">${avg}</span>
        <span class="avg-count">across ${graded} attempt${graded === 1 ? "" : "s"}</span>
      </div>
      ${unmatchedHtml}
    `;
    modalApplyBtn.hidden = false;
  }
  parseResult.hidden = false;
}

// Temporarily compute "available next" using the parsed data
// without mutating userProgress yet.
function computeAvailableFor(byCourse) {
  const savedParsed = userProgress.parsed;
  const savedAttempts = userProgress.attempts;
  userProgress.parsed = true;
  userProgress.attempts = byCourse;
  let count = 0;
  Object.keys(subjectsById).forEach(id => {
    if (isFulfilled(id)) return;
    const s = subjectsById[id];
    if (s.prereq.every(p => isFulfilled(p))) count++;
  });
  userProgress.parsed = savedParsed;
  userProgress.attempts = savedAttempts;
  return count;
}

function applyImport() {
  if (!lastParsed) return;
  userProgress.attempts = lastParsed.byCourse;
  userProgress.parsed = true;
  userProgress.rawText = examTextarea.value;
  recomputeAvailableNext();
  saveProgress();
  render();
  renderImportSummary();
  closeImportModal();
  refreshImportButton();
}

function clearImportedData() {
  if (!confirm("Clear all imported data? This will remove your grades and progress.")) return;
  userProgress.attempts = {};
  userProgress.parsed = false;
  userProgress.rawText = "";
  lastParsed = null;
  recomputeAvailableNext();
  saveProgress();
  render();
  renderImportSummary();
  refreshImportButton();
}

function refreshImportButton() {
  if (userProgress.parsed) {
    importBtn.classList.add("has-data");
    importBtn.innerHTML = `<span class="icon">↻</span> ${t("reimportBtn")}`;
  } else {
    importBtn.classList.remove("has-data");
    importBtn.innerHTML = `<span class="icon">↓</span> ${t("importBtn")}`;
  }
}

importBtn.addEventListener("click", openImportModal);
modalCloseBtn.addEventListener("click", closeImportModal);
modalCancelBtn.addEventListener("click", closeImportModal);
modalParseBtn.addEventListener("click", runParse);
modalApplyBtn.addEventListener("click", applyImport);
modalClearBtn.addEventListener("click", clearImportedData);
importModal.addEventListener("click", e => {
  if (e.target === importModal) closeImportModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !importModal.hidden) closeImportModal();
});

// ===== Init =====
applyLang(loadLang());
applyTheme(loadTheme());
loadProgress();
recomputeAvailableNext();
refreshImportButton();
buildCategoryFilters();

// Theme toggle wiring
const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });
}

// Language toggle wiring
const langToggleBtn = document.getElementById("langToggle");
if (langToggleBtn) {
  langToggleBtn.addEventListener("click", () => {
    applyLang(currentLang === "ar" ? "en" : "ar");
  });
}

// Summary collapse toggle
const summaryToggleBtn = document.getElementById("summaryToggle");
if (summaryToggleBtn) {
  summaryToggleBtn.addEventListener("click", () => {
    const body = document.getElementById("summaryBody");
    const expanded = summaryToggleBtn.getAttribute("aria-expanded") === "true";
    summaryToggleBtn.setAttribute("aria-expanded", expanded ? "false" : "true");
    if (body) body.hidden = expanded;
  });
}
// Show a visible error in the side panel if no subjects loaded
if (Object.keys(subjectsById).length === 0) {
  const aside = document.getElementById("info");
  if (aside) {
    aside.innerHTML = `
      <div class="info-empty">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">
          <strong>Failed to load subjects.</strong><br>
          Check the browser console (F12) for details. Try a hard refresh (Ctrl+Shift+R).
        </div>
      </div>
    `;
  }
} else {
  render();
  renderImportSummary();
}
