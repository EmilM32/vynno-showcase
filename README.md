# vynno-showcase

Static GitHub Pages site for **Vynno** — a focus timer built with AI agents as a learning exercise. The page covers the product, the frontend/API architecture, and the write-first process (PRD, ADRs, contract, plans).

Product: [EmilM32/vynno](https://github.com/EmilM32/vynno) · API: [EmilM32/vynno-api](https://github.com/EmilM32/vynno-api)

Living docs stay in those repos (`docs/`, `docs/adr/`, [working agreement](https://github.com/EmilM32/vynno-api/blob/main/docs/working-agreement.md)). This site is a snapshot with diagrams, not a copy of the markdown. Screenshots are English/dark captures of the playground seed on current `main`.

## Local preview

```sh
npx --yes serve .
```

Also check the GitHub Pages subpath: assets use relative URLs (`./styles.css`), so the same files work at `https://<user>.github.io/vynno-showcase/`.

## Deploy

Push `main`. GitHub Actions publishes via `.github/workflows/pages.yml`.
The workflow enables GitHub Pages automatically if it has not been configured yet.
