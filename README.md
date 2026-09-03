# vynno-showcase

Static GitHub Pages site for **Vynno** — a focus timer built with AI agents as a learning exercise.

Product: [EmilM32/vynno](https://github.com/EmilM32/vynno) · API: [EmilM32/vynno-api](https://github.com/EmilM32/vynno-api)

## Local preview

```sh
npx --yes serve .
```

Also check the GitHub Pages subpath: assets use relative URLs (`./styles.css`), so the same files work at `https://<user>.github.io/vynno-showcase/`.

## Deploy

Push `main`. GitHub Actions publishes via `.github/workflows/pages.yml`.
The workflow enables GitHub Pages automatically if it has not been configured yet.
