#!/bin/sh
# Published file set for GitHub Pages. pages.yml and the Playwright server both
# call this so a new top-level folder cannot ship in one place and not the other.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
site=$root/_site
rm -rf "$site"
mkdir -p "$site/diagrams"
cp "$root/index.html" "$root/.nojekyll" "$site/"
cp -R "$root/css" "$root/js" "$root/assets" "$root/architecture" "$root/lab" "$site/"
cp "$root/diagrams/"*.html "$site/diagrams/"
