#!/bin/sh
# Fail unless the published Pages URL serves the HTML entry points and the
# CSS/JS the landing page loads. Retries cover the short wait after deploy.
set -eu
base=${1:?page url}
base=${base%/}
fail=0
for path in \
	/ \
	/architecture/ \
	/lab/ \
	/css/tokens.css \
	/css/base.css \
	/css/components.css \
	/css/pages.css \
	/js/redirect.js \
	/js/details.js \
	/js/hero.js \
	/js/clock.js \
	/js/week.js \
	/js/week-data.js
do
	url=$base$path
	code=$(curl -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 --retry-all-errors "$url" || true)
	echo "$code $url"
	if [ "$code" != "200" ]; then
		fail=1
	fi
done
test "$fail" -eq 0
