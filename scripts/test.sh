#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

node --test tests/music.test.js
test_library=$(mktemp -d)
trap 'rm -rf "$test_library"' EXIT
VIOLIN_DATA="$test_library" .venv/bin/python -m unittest discover -s tests
node tests/workflows.mjs
