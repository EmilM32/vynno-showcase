#!/bin/sh
# Serve the published site at /vynno-showcase/, the same subpath as GitHub Pages.
# Files that are not in the Pages build are not on this server, except the
# window-video fixture the layout test opens.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
"$root/scripts/build-site.sh"
preview=$(mktemp -d)
trap 'rm -rf "$preview"' EXIT INT TERM
mkdir -p "$preview/vynno-showcase/tests/fixtures"
cp -R "$root/_site/." "$preview/vynno-showcase/"
cp "$root/tests/fixtures/window-video.html" "$root/tests/fixtures/sample.webm" \
	"$preview/vynno-showcase/tests/fixtures/"
# Python's server does not rewrite index.html. `serve`'s clean URLs drop the
# directory slash (`/vynno-showcase` instead of `/vynno-showcase/`) and break
# the relative links this site uses on GitHub Pages.
exec python3 -m http.server 4173 --bind 127.0.0.1 --directory "$preview" >/dev/null 2>&1
