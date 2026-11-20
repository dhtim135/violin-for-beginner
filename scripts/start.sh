#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
exec .venv/bin/python -m uvicorn studio.server:app --host 127.0.0.1 --port "${PORT:-8427}"
