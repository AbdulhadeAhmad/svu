import { loadCatalog } from "./data/catalog.js";
import { createCurriculum } from "./domain/curriculum.js";
import { createGrading } from "./domain/grading.js";
import { createExamParser } from "./domain/exam-parser.js";
import { createProgressModel } from "./domain/progress.js";
import { createStorage } from "./state/storage.js";
import { createProgressStore } from "./state/progress-store.js";
import { createFilterStore } from "./state/filters.js";
import { createI18n } from "./i18n/index.js";
import { createGraphView } from "./graph/view.js";
import { createSummary } from "./ui/summary.js";
import { createSubjectDetails } from "./ui/subject-details.js";
import { createRulesPanel } from "./ui/rules-panel.js";
import { createImportDialog } from "./ui/import-dialog.js";
import { createFilterControls } from "./ui/filters.js";
import { createAppearance } from "./ui/appearance.js";

// Compose the data model and views here. Feature modules communicate through
// explicit callbacks; academic rules and storage never depend on the DOM.
async function startApp() {
  const catalog = await loadCatalog(document.body.dataset.catalog);
  const { config, categories } = catalog;
  const curriculum = createCurriculum(catalog.subjects);
  const { subjectsById } = curriculum;
  const storage = createStorage();
  const rules = createGrading(config);
  const parseExamHistory = createExamParser({ config, subjectsById, rules });
  const store = createProgressStore({ storage, subjectsById, parseExamHistory, rules });
  store.load();
  const state = store.state;
  const progress = createProgressModel({ config, subjectsById, state, passedAttempt: rules.passedAttempt });
  const filters = createFilterStore({ config, categories, storage });
  const i18n = createI18n({ storage, importConfig: config.import });

  const graph = createGraphView({ catalog, curriculum, progress, state, filters, i18n,
    onSelect: id => details.select(id) });
  const summary = createSummary({ catalog, curriculum, progress, filters, i18n,
    onNavigate: navigate, isSelectionActive: () => !!details.selectedId });
  const details = createSubjectDetails({ catalog, curriculum, progress, state, i18n,
    onNavigate: navigate,
    onToggleManual(id) {
      store.toggleManual(id);
      refresh();
    }
  });
  const rulesPanel = createRulesPanel({ catalog, progress, i18n });
  const importDialog = createImportDialog({ state, i18n, parseExamHistory,
    passedAttempt: rules.passedAttempt, hasProgress: progress.hasProgress,
    computeAvailableFor(byCourse) {
      const preview = progress.preview(byCourse);
      return Object.values(subjectsById).filter(subject =>
        preview.isAvailableNext(subject.id) && filters.isVisible(subject)).length;
    },
    onApply(parsed, rawText) {
      store.applyImport(parsed, rawText);
      refresh();
    },
    onClear() {
      store.clear();
      refresh();
    }
  });
  const filterControls = createFilterControls({ catalog, filters, i18n,
    onChange: updateVisibility,
    onSearch() {
      graph.clearHighlight();
      updateVisibility();
    }
  });
  const appearance = createAppearance({ catalog, i18n, storage,
    onChange() {
      filterControls.render();
      refresh();
    }
  });

  function navigate(id) {
    graph.focusSubject(id);
    details.select(id);
  }
  function updateVisibility() {
    graph.applyFilters();
    summary.updateAvailableCount();
  }
  function refresh() {
    graph.render();
    summary.render();
    rulesPanel.render();
    details.refresh();
    importDialog.refresh();
  }

  appearance.initialize();
  setControlsDisabled(false);
  document.body.dataset.ready = "true";
}

function setControlsDisabled(disabled) {
  document.querySelectorAll(".controls button, .controls input, #emptyImportBtn")
    .forEach(element => { element.disabled = disabled; });
}

startApp().catch(error => {
  console.error("Unable to initialize catalog", error);
  setControlsDisabled(true);
  document.querySelector("#infoEmpty .empty-text").textContent =
    `Unable to load course data: ${error.message} Serve this folder over HTTP and reload the page.`;
  document.getElementById("infoEmpty").hidden = false;
  document.body.dataset.ready = "error";
});
