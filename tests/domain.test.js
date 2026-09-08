import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeCatalog } from "../src/data/catalog.js";
import { createCurriculum } from "../src/domain/curriculum.js";
import { createGrading } from "../src/domain/grading.js";
import { createExamParser } from "../src/domain/exam-parser.js";
import { createProgressModel } from "../src/domain/progress.js";
import { createProgressStore } from "../src/state/progress-store.js";
import { createFilterStore } from "../src/state/filters.js";
import { createGraphLayout } from "../src/graph/layout.js";
import { NODE_H } from "../src/graph/dimensions.js";

const source = JSON.parse(readFileSync(new URL("../ite_subjects.json", import.meta.url), "utf8"));
function setup(data = structuredClone(source)) {
  const catalog = normalizeCatalog(data);
  const curriculum = createCurriculum(catalog.subjects);
  const { subjectsById } = curriculum;
  const rules = createGrading(catalog.config);
  const parseExamHistory = createExamParser({ config: catalog.config, subjectsById, rules });
  const memory = new Map();
  const storage = {
    read(key) { return structuredClone(memory.get(key) ?? null); },
    write(key, value) { memory.set(key, structuredClone(value)); }
  };
  const store = createProgressStore({ storage, subjectsById, parseExamHistory, rules });
  const progress = createProgressModel({ config: catalog.config, subjectsById, state: store.state, passedAttempt: rules.passedAttempt });
  return { catalog, curriculum, rules, parseExamHistory, storage, store, progress };
}
const history = (code, grade) => ["assignment", "final"].map(component =>
  `${code}_S25_${component}_1_2025-01-01\tArchive\t${grade}`).join("\n");

test("academic modules parse and evaluate prerequisites without browser globals", () => {
  const { store, progress, parseExamHistory } = setup();
  const raw = history("ITE_BMA401", 20) + "\n" + history("ENG_L1", 20);
  store.applyImport(parseExamHistory(raw), raw);
  assert.equal(progress.isFailed("BMA401"), true);
  assert.equal(progress.isAvailableNext("BMA402"), true);
  assert.equal(progress.isAvailableNext("GEN401"), false);
});

test("import previews do not mutate committed progress", () => {
  const { store, progress, parseExamHistory } = setup();
  const raw = history("ITE_BMA401", 80);
  store.applyImport(parseExamHistory(raw), raw);
  const committed = structuredClone(store.state);
  const preview = progress.preview(parseExamHistory(history("ENG_L1", 80)).byCourse);
  assert.equal(preview.isPassed("GEN301"), true);
  assert.equal(preview.isPassed("BMA401"), false);
  assert.equal(progress.isPassed("BMA401"), true);
  assert.deepEqual(store.state, committed);
});

test("progress storage restores imports and retains manual completion", () => {
  const { catalog, curriculum, store, storage, parseExamHistory } = setup();
  const raw = history("ITE_BMA401", 70);
  store.applyImport(parseExamHistory(raw), raw);
  store.toggleManual("BPH401");
  const revised = structuredClone(catalog.config);
  revised.grading.passThreshold = 80;
  const rules = createGrading(revised);
  const parser = createExamParser({ config: revised, subjectsById: curriculum.subjectsById, rules });
  const restored = createProgressStore({ storage, subjectsById: curriculum.subjectsById, parseExamHistory: parser, rules });
  restored.load();
  assert.equal(restored.state.attempts.BMA401[0].passed, false);
  assert.equal(restored.state.manualPass.BPH401, true);
});

test("filter storage preserves an intentionally empty selection", () => {
  const { catalog, storage, curriculum } = setup();
  const options = { config: catalog.config, categories: catalog.categories, storage };
  const filters = createFilterStore(options);
  assert.equal(Object.values(curriculum.subjectsById).filter(filters.isVisible).length, 50);
  catalog.config.defaultFilters.forEach(filters.toggle);
  const restored = createFilterStore(options);
  assert.equal(Object.values(curriculum.subjectsById).filter(restored.isVisible).length, 0);
});

test("layout contains every course, forward prerequisite edges, and separated nodes", () => {
  const { curriculum } = setup();
  const { positions, levels, totalWidth, totalHeight } = createGraphLayout(curriculum).buildLayout();
  assert.equal(Object.keys(positions).length, Object.keys(curriculum.subjectsById).length);
  for (const [id, point] of Object.entries(positions)) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x < totalWidth && point.y < totalHeight);
    curriculum.subjectsById[id].prereq.forEach(prereq => assert.ok(positions[prereq].x < point.x));
  }
  for (const ids of Object.values(levels)) {
    const rows = ids.map(id => positions[id].y).sort((a, b) => a - b);
    rows.slice(1).forEach((y, index) => assert.ok(y - rows[index] >= NODE_H));
  }
});
