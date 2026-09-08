// Load and normalize the catalog. All course data and academic policy live in JSON.
export async function loadCatalog(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return normalizeCatalog(await response.json());
}

export function normalizeCatalog(data) {
  const config = data.app_config;
  if (!data.program || !data.subjects || !config?.categories || !config.import ||
      !config.grading || !config.eligibility || !data.additional_info) {
    throw new Error("Catalog is missing program data or application rules.");
  }
  const grading = config.grading;
  for (const key of ["assignmentWeight", "finalWeight", "passThreshold"]) {
    if (!Number.isFinite(grading[key])) throw new Error(`Missing grading rule: ${key}`);
  }
  if (grading.assignmentWeight < 0 || grading.finalWeight < 0 ||
      Math.abs(grading.assignmentWeight + grading.finalWeight - 1) > Number.EPSILON) {
    throw new Error("Grading weights must be nonnegative and sum to one.");
  }
  if (!Array.isArray(grading.requiredComponents) || !grading.requiredComponents.length ||
      grading.requiredComponents.some(key => !["assignment", "final"].includes(key)) ||
      !Number.isFinite(grading.gradeRange?.minimum) || !Number.isFinite(grading.gradeRange?.maximum) ||
      grading.gradeRange.minimum >= grading.gradeRange.maximum ||
      [grading.minimumAssignment, grading.minimumFinal].some(value => value != null && !Number.isFinite(value))) {
    throw new Error("Invalid grading components or grade limits.");
  }
  // Validate import expressions at startup instead of failing after the user pastes data.
  new RegExp(config.import.coursePattern);
  new RegExp(config.import.termPattern);
  if (!["attempted", "passed"].includes(config.eligibility.defaultPrerequisitePolicy) ||
      !["any_passed", "latest_passed"].includes(config.eligibility.completionPolicy) ||
      typeof config.eligibility.excludeInProgress !== "boolean" ||
      !["highest", "latest"].includes(config.import.repeatedComponent)) {
    throw new Error("Unsupported catalog policy.");
  }
  const byId = new Map();
  for (const group of Object.values(data.subjects)) {
    if (!Array.isArray(group)) throw new Error("Invalid subject group.");
    for (const record of group) {
      const specialization = record.specialization ? [record.specialization].flat() : [];
      const categories = specialization.length ? specialization : [record.category];
      if (!record.id || !record.name || !Number.isFinite(record.credits) ||
          !Array.isArray(record.prerequisites) || categories.some(c => !config.categories[c])) {
        throw new Error(`Invalid subject: ${record.id || "unknown"}`);
      }
      const existing = byId.get(record.id);
      if (existing) {
        if (existing.credits !== record.credits ||
            JSON.stringify([...existing.prerequisites].sort()) !== JSON.stringify([...record.prerequisites].sort())) {
          throw new Error(`Conflicting shared subject: ${record.id}`);
        }
        existing.specialization = [...new Set([...existing.specialization, ...specialization])];
        existing.categories = [...new Set([...existing.categories, ...categories])];
      } else {
        byId.set(record.id, { ...record, specialization, categories, category: categories[0], tracks: [] });
      }
    }
  }
  if (!byId.size) throw new Error("The catalog has no subjects.");
  const tracks = [];
  for (const spec of data.program.specializations) {
    for (const track of spec.tracks || []) {
      const key = `${spec.code}/${track.code}`;
      tracks.push({ ...track, key, specialization: spec.code });
      for (const id of track.subjects) {
        if (!byId.has(id)) throw new Error(`Unknown track subject: ${id}`);
        byId.get(id).tracks.push(key);
      }
    }
  }
  for (const subject of byId.values()) {
    if (subject.prerequisite_policy && !["attempted", "passed"].includes(subject.prerequisite_policy)) {
      throw new Error(`Unsupported prerequisite policy: ${subject.id}`);
    }
    for (const prerequisite of subject.prerequisites) {
      if (!byId.has(prerequisite)) throw new Error(`Unknown prerequisite: ${prerequisite}`);
    }
  }
  for (const id of Object.values(config.import.aliases)) {
    if (!byId.has(id)) throw new Error(`Unknown import alias target: ${id}`);
  }
  const placement = config.import.placement;
  if (placement.enabled && (placement.orderedLevels.some(id => !byId.has(id)) ||
      placement.thresholds.some(t => !Number.isFinite(t.minGrade) || !Number.isInteger(t.levelsPassed) ||
        t.levelsPassed < 0 || t.levelsPassed > placement.orderedLevels.length))) {
    throw new Error("Invalid placement rules.");
  }
  for (const rule of Object.values(data.additional_info.project_conditions || {})) {
    if (!byId.has(rule.course) || !Number.isFinite(rule.credits_earned_required)) {
      throw new Error("Invalid project requirement.");
    }
    byId.get(rule.course).minimum_earned_credits = rule.credits_earned_required;
  }
  // Each specialization track is an independent category in the interface.
  const categories = {};
  for (const subject of byId.values()) {
    if (!subject.specialization.length) {
      for (const key of subject.categories) categories[key] = config.categories[key];
    }
  }
  for (const track of tracks) {
    categories[track.key] = {
      ...config.categories[track.specialization],
      label: { en: `${track.specialization} ${track.name}`, ar: `${track.specialization} ${track.nameAr}` }
    };
  }
  for (const subject of byId.values()) {
    if (subject.specialization.length) {
      if (!subject.tracks.length) throw new Error(`Subject has no specialization track: ${subject.id}`);
      subject.categories = subject.tracks;
      subject.category = subject.categories[0];
    }
  }
  if (!Array.isArray(config.defaultFilters) || config.defaultFilters.some(key => !categories[key])) {
    throw new Error("Invalid default filters.");
  }
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Prerequisite cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    byId.get(id).prerequisites.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  byId.forEach(s => visit(s.id));
  return { program: data.program, subjects: [...byId.values()], categories,
    tracks, config, additionalInfo: data.additional_info };
}
