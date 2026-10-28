# vynno-showcase

Static GitHub Pages site for **Vynno** — a focus timer built with AI agents as a learning exercise. The page covers the product, the frontend/API architecture, the local MCP an agent uses to read one account’s history, and the write-first process (PRD, ADRs, contract, plans).

Product: [EmilM32/vynno](https://github.com/EmilM32/vynno) · API: [EmilM32/vynno-api](https://github.com/EmilM32/vynno-api)

Living docs stay in those repos (`docs/`, `docs/adr/`, [working agreement](https://github.com/EmilM32/vynno-api/blob/main/docs/working-agreement.md)). This site is a snapshot with diagrams, not a copy of the markdown. Screenshots are English/dark captures of the playground seed on vynno v1.3.0.

## Diagrams

`diagrams/*.html` are standalone interactive pages rendered with [archify](https://github.com/tt-a1i/archify) from the JSON in `diagrams/src/`. The skill lives in `.agents/skills/archify` (local, gitignored). After editing a source, run from that directory:

```sh
node bin/archify.mjs deliver <type> ../../../diagrams/src/<name>.<type>.json ../../../diagrams/<name>.html --quality showcase
```

Pages publishes `diagrams/*.html` only; the sources stay in the repo. Thumbnails are in `assets/diagrams/`.

## Local preview

```sh
npx --yes serve .
```

Also check the GitHub Pages subpath: styles, scripts, and screenshots use relative URLs, so the same files work at `https://<user>.github.io/vynno-showcase/`. The landing page is `index.html`; architecture and lab are `architecture/` and `lab/`.

## Tests

```sh
npm ci && npx playwright install chromium webkit && npm test
```

`npm test` runs `scripts/size.mjs`, then Playwright in Chromium and WebKit. The size script sums `gzip -9` of `js/**/*.js` excluding `js/vendor/**` and fails above 9 KB (9216 bytes).

The test server builds `_site` with `scripts/build-site.sh` (the same copy `pages.yml` publishes) and serves it at `http://127.0.0.1:4173/vynno-showcase/`. A request to an origin-absolute path such as `/js/hero.js` is not the published file.

GitHub Actions (`.github/workflows/test.yml`) runs that on pull requests to `main` and on pushes to `main`. The check name is `playwright`. Pages deploy runs the same workflow and publishes only after it passes.

Pixel snapshots are generated and compared only inside the Playwright image that matches the pinned `@playwright/test` version. Do not commit snapshots taken on macOS or on the host. Update them with:

```sh
docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test --update-snapshots
```

Two later gates are not checked yet. A cap of two live WebGL contexts, and ascii-fx loading only after `load` and only in the full tier, need the heatmap from PR2. Zero external requests is already the test `no external requests on the three pages`. The JS size budget is `scripts/size.mjs`.

## Deploy

Push `main`. `.github/workflows/pages.yml` runs the test workflow, builds `_site` with `scripts/build-site.sh`, then publishes only after that job passes. After deploy, `scripts/smoke-pages.sh` requests the Pages URL plus the main CSS and JS files and fails unless each returns 200.
The workflow enables GitHub Pages automatically if it has not been configured yet.
