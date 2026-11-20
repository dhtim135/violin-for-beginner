#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$(uname -sm)" != "Darwin arm64" ]; then
  echo "The verified dependency lock targets macOS on Apple Silicon. See INSTRUCTIONS.md." >&2
  exit 1
fi
for tool in uv npm ffmpeg ffprobe curl; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. See INSTRUCTIONS.md." >&2; exit 1; }
done
test -x "${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" || { echo "Set CHROME_BIN to a Chromium executable for PDF export." >&2; exit 1; }
npm ci
uv venv --allow-existing --python 3.10.20 .venv
uv pip install --python .venv/bin/python --no-deps -r requirements-macos-arm64.txt
if [ ! -x "${AUDIVERIS:-.runtime/Audiveris.app/Contents/MacOS/Audiveris}" ]; then
  mkdir -p .runtime
  tmp=$(mktemp -d "$PWD/.runtime/installer.XXXXXX")
  mount="$tmp/mount"
  mkdir "$mount"
  trap 'hdiutil detach "$mount" >/dev/null 2>&1 || true' EXIT
  curl -fL --retry 2 https://github.com/Audiveris/audiveris/releases/download/5.11.0/Audiveris-5.11.0-macosx-arm64.dmg -o "$tmp/Audiveris.dmg"
  echo "17491af8b6d40153b031dd1f0815e37213f0999ef23f10586af46706e59b2eb6  $tmp/Audiveris.dmg" | shasum -a 256 -c -
  hdiutil attach -readonly -nobrowse -mountpoint "$mount" "$tmp/Audiveris.dmg"
  ditto "$mount/Audiveris.app" .runtime/Audiveris.app
  hdiutil detach "$mount"
  trap - EXIT
  rm -f "$tmp/Audiveris.dmg"
  rmdir "$mount" "$tmp" 2>/dev/null || true
fi
echo "Ready. Run ./scripts/start.sh"
