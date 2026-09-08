# SVU course prerequisite graph

A static web app for browsing courses, specialization tracks, and imported exam progress. It loads all course data and academic rule values from `ite_subjects.json`.

## Run

Serve the repository over HTTP so the browser can fetch the JSON:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or application dependencies are required. Opening `index.html` using `file://` is not supported.

## Deploy with Nginx

The server only serves files. There is no Node.js process, API, database, or server-side rendering. Imports and progress remain in the user's browser. Python 3.9+ is only needed to prepare the deployment folder on your development machine.

### Prepare the files

```sh
python3 scripts/build-static.py
# Equivalent, if npm is installed: npm run build
```

This recreates the generated `dist/` folder with only `index.html`, `style.css`, `ite_subjects.json`, JavaScript modules in `src/`, and stylesheets in `styles/`. Do not store custom files in `dist/`. The PDF, tests, deployment configuration, and repository metadata are excluded. There is no compilation or dependency installation.

### Install on the server

The following example uses a dedicated hostname and a standard Debian/Ubuntu Nginx installation. Install Nginx and `envsubst` (the `gettext-base` package) first. Copy `dist/` and `deploy/nginx.conf.template` to the server, then run these commands from their parent directory. Replace the example hostname with your DNS name; point its DNS records at your server.

```sh
sudo install -d -m 755 /var/www/svu
sudo cp -R dist/. /var/www/svu/
sudo find /var/www/svu -type d -exec chmod 755 {} +
sudo find /var/www/svu -type f -exec chmod 644 {} +

export SERVER_NAME='courses.example.com'
export DOCUMENT_ROOT='/var/www/svu'
envsubst '${SERVER_NAME} ${DOCUMENT_ROOT}' < deploy/nginx.conf.template > /tmp/svu-nginx.conf
sudo install -m 644 /tmp/svu-nginx.conf /etc/nginx/conf.d/svu.conf
sudo nginx -t
# Run only after the configuration test succeeds:
sudo systemctl reload nginx
```

Use an absolute document-root path without spaces. Restrict `envsubst` to the two named placeholders as shown: unrestricted substitution would erase Nginx's `$uri` variable. The rendered file is a `server` block and belongs inside the existing `http` context, normally through `/etc/nginx/conf.d/*.conf`. Do not replace the main `nginx.conf`. If your distribution uses `sites-available`/`sites-enabled` instead, install and enable the file there once.

Open `http://courses.example.com/`. The template serves the app at the hostname root. All browser paths remain relative, but the template's route allowlist would need adapting to deploy under a URL prefix.

### Enable HTTPS

For a public deployment, provision a certificate for your hostname using your certificate manager. In the rendered app server block, replace the two `listen` lines with the following, using your actual certificate paths:

```nginx
listen 443 ssl;
listen [::]:443 ssl;
ssl_certificate /etc/letsencrypt/live/courses.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/courses.example.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
```

Add a separate HTTP redirect server:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name courses.example.com;
    return 301 https://courses.example.com$request_uri;
}
```

If your certificate manager uses HTTP-01 challenges, configure its challenge location before the catch-all 404/redirect, or let its Nginx integration manage validation. Test with `sudo nginx -t` before reloading. When TLS terminates at an existing reverse proxy, the original HTTP template can serve as its upstream.

Browser storage is scoped to the origin: moving from localhost to your domain, or from HTTP to HTTPS, requires re-importing your history.

### Updates and verification

Re-run the packaging command after changing the app or catalog and upload the complete `dist/` contents. A static-file update does not require an Nginx reload. For deployments with active users, prepare a complete release directory and switch the configured document-root symlink to it, avoiding partially copied releases.

```sh
curl -I http://courses.example.com/
curl -I http://courses.example.com/src/main.js
curl -I http://courses.example.com/ite_subjects.json
curl -I http://courses.example.com/src/missing.js
curl -I http://courses.example.com/.git/config
```

Expect HTML, JavaScript, and JSON content types for the first three responses and 404 for the last two. The configuration enables gzip, disables directory listings, and restricts serving to runtime files. Missing assets return 404 rather than HTML. All assets use `Cache-Control: no-cache` because filenames are not content-hashed; the browser revalidates them on reload. The catalog additionally uses a `no-store` fetch in the app.

Directive references: [Nginx static-file routing and MIME types](https://nginx.org/en/docs/http/ngx_http_core_module.html), [response headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html).

## Data and rules

- `subjects`: names, credits, prerequisites, descriptions, and per-course prerequisite policy. Shared course IDs are merged across specialization groups; their credits and prerequisites must agree.
- `program.specializations[].tracks`: track names and course membership. Each track becomes a separate specialization filter alongside General and Basic. Multiple tracks can be selected; shared courses appear once and stay visible while any matching filter is selected. The same selection controls the available-course list.
- `app_config`: category presentation, default filter selection, localized headings, import patterns and aliases, term ordering, placement thresholds, grading weights and minimums, and eligibility policies. Grading supports assignment/final components; ordinary prerequisite policy can require a prior attempt or a pass. Completion can use any passed attempt or the latest attempt.
- `additional_info`: project credit requirements, term registration limits, promotion thresholds, and registration notes. Project credit requirements are enforced in availability; term limits and promotion thresholds are displayed in the rules panel.

`src/data/catalog.js` fetches and validates the catalog; it contains no course catalog or academic rule values. The domain modules evaluate these rules independently of the UI. Changing catalog values does not require editing JavaScript. Existing raw imports are re-evaluated on reload, and manual completions are retained.

The source metadata distinguishes PDF-derived information from inherited information. Project credit thresholds, placement rules, grading, and legacy semester schedules were not verified by the diagram. The inherited practical-part grading minimum is descriptive: the catalog does not identify which courses or imported components it applies to. It is not assumed to be an assignment minimum.

General and Basic are selected by default, as configured in `app_config.defaultFilters`. New filter selections are saved; preferences from the former broad-specialization filters and track dropdown are ignored.

Progress and preferences stay in browser local storage. Clearing progress also clears manual completions. The Reset button next to Import/Re-import clears all current and legacy app storage keys, including session drafts, then reloads with fresh progress, filters, language, theme, search, selection, and zoom. It leaves other applications’ storage on the same origin intact.

## Study planning

The sidebar shows remaining course and credit-hour totals for the active filters. Shared courses count once; only passed courses and manual completions reduce the totals. In-progress courses remain unfinished, and English courses use their earned-credit value rather than their registration cost.

Academic year uses all earned credits and the JSON year thresholds, including the first-year baseline at zero. It also shows credit hours needed for the next year. Without imported or manually entered progress, the year remains unknown.

Available-course suggestions prioritize the longest remaining prerequisite chain, then the number of selected future courses, then immediate unlocks. `app_config.recommendations.priority` controls this ordering and `limit` controls how many suggestions appear. Satisfied prerequisites are excluded from the remaining graph. Future-course counts indicate reach through the graph; other prerequisites may still be needed. Immediate unlocks include all eligibility checks after a hypothetical pass and do not change saved progress.

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
deploy/nginx.conf.template Nginx server block with hostname/root placeholders
scripts/build-static.py   Prepare the runtime-only dist/ directory
dist/                     Generated static deployment files (ignored by Git)
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
