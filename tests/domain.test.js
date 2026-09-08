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

test("remaining totals count shared courses once and use earned English credits", async () => {
  const { createStudyProgress } = await import('../src/domain/study-progress.js');
  const { catalog, curriculum, progress, store, parseExamHistory } = setup();
  const stats = createStudyProgress({ subjectsById: curriculum.subjectsById, progress,
    yearThresholds: catalog.additionalInfo.year_promotion_minimum_credits });
  const selected = subject => subject.tracks.includes('SE/DS') || subject.tracks.includes('AI/IS');
  assert.equal(stats.selectedTotals(selected).remainingCourses, 17);
  store.toggleManual('SIR601');
  assert.equal(stats.selectedTotals(selected).remainingCourses, 16);
  assert.equal(stats.selectedTotals(selected).completedCredits, 6);
  const raw = history('ENG_L1', 80) + '\n' + history('ITE_BMA401', 20) + '\nITE_BPG401_S25_assignment_1_2025-01-01\tChecking\t80';
  store.applyImport(parseExamHistory(raw), raw);
  const common = stats.selectedTotals(subject => !subject.specialization.length);
  assert.equal(common.remainingCourses, 49);
  assert.equal(common.completedCredits, 3);
  assert.deepEqual(stats.selectedTotals(() => false), {
    totalCourses: 0, completedCourses: 0, remainingCourses: 0,
    totalCredits: 0, completedCredits: 0, remainingCredits: 0
  });
});

test("academic year follows catalog thresholds and counts all completed courses", async () => {
  const { createStudyProgress } = await import('../src/domain/study-progress.js');
  const { catalog, curriculum, progress, store } = setup();
  const stats = createStudyProgress({ subjectsById: curriculum.subjectsById, progress,
    yearThresholds: catalog.additionalInfo.year_promotion_minimum_credits });
  assert.equal(stats.academicStanding(), null);
  ['BPH401','BMA401','BAS401','BMA402','BLA401','BNA401','BEC401','BLC401'].forEach(store.toggleManual);
  assert.equal(stats.academicStanding().year, 2);
  assert.equal(stats.academicStanding().earnedCredits, 40);
  assert.equal(stats.academicStanding().creditsToNextYear, 60);
  stats.selectedTotals(() => false);
  assert.equal(stats.academicStanding().year, 2);
  let earned = 0;
  const boundaries = createStudyProgress({ subjectsById: {},
    progress: { hasProgress: () => true, earnedCredits: () => earned },
    yearThresholds: { 1: 0, 2: 13, 3: 29 } });
  for (const [credits, year, next] of [[0,1,13],[12,1,1],[13,2,16],[28,2,1],[29,3,0],[100,3,0]]) {
    earned = credits;
    assert.equal(boundaries.academicStanding().year, year);
    assert.equal(boundaries.academicStanding().creditsToNextYear, next);
  }
});

test("recommendations favor long chains, count unique descendants, and respect remaining prerequisites", async () => {
  const { createCourseRecommendations } = await import('../src/domain/recommendations.js');
  const config = structuredClone(source.app_config);
  const rules = createGrading(config);
  const edges = { ROOT: [], A: ['ROOT'], B: ['A'], C: ['B'], WIDE: [], D: ['WIDE'], E: ['WIDE'], F: ['WIDE'], G: ['WIDE'], JOIN: ['ROOT','WIDE'] };
  const subjectsById = Object.fromEntries(Object.entries(edges).map(([id, prereq]) => [id, { id, prereq, credits: 1 }]));
  const state = { parsed: true, attempts: {}, manualPass: {} };
  const progress = createProgressModel({ config, subjectsById, state, passedAttempt: rules.passedAttempt });
  const recommendations = createCourseRecommendations({ subjectsById, progress, settings: config.recommendations });
  const ranked = recommendations.rank(() => true);
  assert.equal(ranked[0].id, 'ROOT');
  assert.equal(ranked[0].depth, 3);
  assert.equal(ranked[0].downstreamCount, 4);
  assert.equal(ranked[0].immediateUnlocks, 1); // JOIN still requires WIDE.
  config.recommendations.priority = ['downstreamCount', 'depth'];
  assert.equal(recommendations.rank(() => true)[0].id, 'WIDE');
  state.attempts.ROOT = [{ passed: false, inProgress: false }];
  assert.equal(recommendations.rank(() => true).find(item => item.id === 'ROOT').depth, 0);
  subjectsById.A.prerequisite_policy = 'passed';
  assert.equal(recommendations.rank(() => true).find(item => item.id === 'ROOT').depth, 3);
});

test("recommendations count only selected future courses and do not mutate progress", async () => {
  const { createCourseRecommendations } = await import('../src/domain/recommendations.js');
  const config = structuredClone(source.app_config);
  const rules = createGrading(config);
  const edges = { ROOT: [], HIDDEN: ['ROOT'], A: ['HIDDEN'], B: ['ROOT'], SHARED: ['A','B'] };
  const subjectsById = Object.fromEntries(Object.entries(edges).map(([id, prereq]) => [id, { id, prereq, credits: 1 }]));
  const state = { parsed: true, attempts: {}, manualPass: {} };
  const snapshot = structuredClone(state);
  const progress = createProgressModel({ config, subjectsById, state, passedAttempt: rules.passedAttempt });
  const recommendations = createCourseRecommendations({ subjectsById, progress, settings: config.recommendations });
  const selected = subject => ['ROOT','A','B','SHARED'].includes(subject.id);
  assert.deepEqual(recommendations.rank(selected)[0], { id: 'ROOT', depth: 3, downstreamCount: 3, immediateUnlocks: 1 });
  assert.deepEqual(state, snapshot);
  assert.deepEqual(recommendations.rank(() => false), []);
});
