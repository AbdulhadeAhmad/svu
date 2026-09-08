import { STORAGE_KEYS } from "./storage.js";

export function createProgressStore({ storage, subjectsById, parseExamHistory, rules }) {
  const userProgress = {
    // courseId -> [ { term, assignment, final, weighted, passed, inProgress, status, date }, ... ]
    // Sorted ascending by term; the LAST entry is the most recent attempt.
    attempts: {},
    parsed: false,
    rawText: "",
    // courseId -> true   (manually marked as passed, e.g. transferred credits)
    manualPass: {}
  };
  function save() { storage.write(STORAGE_KEYS.progress, userProgress); }
  function load() {
    const data = storage.read(STORAGE_KEYS.progress);
    if (!data || typeof data !== "object") return;
    userProgress.parsed = !!data.parsed;
    userProgress.rawText = typeof data.rawText === "string" ? data.rawText : "";
    userProgress.manualPass = Object.fromEntries(Object.entries(data.manualPass || {}).filter(([id]) => subjectsById[id]));
    if (userProgress.rawText) userProgress.attempts = parseExamHistory(userProgress.rawText).byCourse;
    else userProgress.attempts = Object.fromEntries(Object.entries(data.attempts || {})
      .filter(([id, attempts]) => subjectsById[id] && Array.isArray(attempts))
      .map(([id, attempts]) => [id, attempts.map(rules.evaluateAttempt)
        .sort((a, b) => rules.termOrder(a.term) - rules.termOrder(b.term))]));
  }
  function applyImport(parsed, rawText) {
    userProgress.attempts = parsed.byCourse;
    userProgress.parsed = true;
    userProgress.rawText = rawText;
    save();
  }
  function clear() {
    Object.assign(userProgress, { attempts: {}, parsed: false, rawText: "", manualPass: {} });
    save();
  }
  function toggleManual(id) {
    if (!subjectsById[id]) return;
    if (userProgress.manualPass[id]) delete userProgress.manualPass[id];
    else userProgress.manualPass[id] = true;
    save();
  }

  return { state: userProgress, load, applyImport, clear, toggleManual };
}
