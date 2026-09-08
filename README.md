# SVU course prerequisite graph

A static web app for browsing courses, specialization tracks, and imported exam progress. It loads all course data and academic rule values from `ite_subjects.json`.

## Run

Serve the repository over HTTP so the browser can fetch the JSON:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or application dependencies are required. Opening `index.html` using `file://` is not supported.

## Data and rules

- `subjects`: names, credits, prerequisites, descriptions, and per-course prerequisite policy. Shared course IDs are merged across specialization groups; their credits and prerequisites must agree.
- `program.specializations[].tracks`: track names and course membership. Each track becomes a separate specialization filter alongside General and Basic. Multiple tracks can be selected; shared courses appear once and stay visible while any matching filter is selected. The same selection controls the available-course list.
- `app_config`: category presentation, default filter selection, localized headings, import patterns and aliases, term ordering, placement thresholds, grading weights and minimums, and eligibility policies. Grading supports assignment/final components; ordinary prerequisite policy can require a prior attempt or a pass. Completion can use any passed attempt or the latest attempt.
- `additional_info`: project credit requirements, term registration limits, promotion thresholds, and registration notes. Project credit requirements are enforced in availability; term limits and promotion thresholds are displayed in the rules panel.

`src/data/catalog.js` fetches and validates the catalog; it contains no course catalog or academic rule values. The domain modules evaluate these rules independently of the UI. Changing catalog values does not require editing JavaScript. Existing raw imports are re-evaluated on reload, and manual completions are retained.

The source metadata distinguishes PDF-derived information from inherited information. Project credit thresholds, placement rules, grading, and legacy semester schedules were not verified by the diagram. The inherited practical-part grading minimum is descriptive: the catalog does not identify which courses or imported components it applies to. It is not assumed to be an assignment minimum.

General and Basic are selected by default, as configured in `app_config.defaultFilters`. New filter selections are saved; preferences from the former broad-specialization filters and track dropdown are ignored.

Progress and preferences stay in browser local storage. Clearing progress also clears manual completions.

## Project structure

```text
index.html                 Page structure and native module entry
ite_subjects.json          Course catalog and academic configuration
src/
  main.js                  Startup, dependency wiring, and UI refresh callbacks
  data/catalog.js          Catalog loading, validation, and normalization
  domain/                  Curriculum graph, grading, exam parsing, and eligibility
  state/                   Progress/filter state and browser storage adapters
  i18n/                    Translations and locale-aware formatting
  graph/                   Layout calculation, SVG rendering, and zoom/highlighting
  ui/                      Filters, appearance, summary, course details, rules, import dialog
styles/                    Theme, layout, sidebar, summary, graph, modal, and utilities
style.css                  Ordered stylesheet imports
tests/                    Domain and browser regression tests
```

`src/main.js` creates the models and views and connects them through callbacks. Domain modules have no browser dependencies. State stores own persistence and mutations; UI modules render views and report user actions. Import previews use a separate progress model rather than temporarily changing saved progress. Graph layout is calculated once from the catalog and reused when progress or language changes.

The browser loads standard ES modules directly. No bundler, framework, or dependency installation is needed to run the app. `package.json` only declares the module format and optional test commands.

## Tests

With Node.js installed, run the domain tests without browser dependencies:

```sh
npm test
```

For browser regression tests:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 -m unittest discover -s tests -v
```

The browser tests start a temporary local server and cover track membership, shared courses, JSON-only catalog/rule changes, grading, prerequisite exceptions, placement, project credits, saved progress, UI controls, and load failures.
