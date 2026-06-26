#!/usr/bin/env bash
# Build a self-contained telemetry daemon binary so target machines need no
# Python/pip. Output: dist-daemon/CivilMantraDaemon (single executable).
#
# Requires a venv with: pyinstaller cryptography keyring
#   python3 -m venv .build-venv
#   .build-venv/bin/pip install pyinstaller cryptography keyring
#   PYINSTALLER=.build-venv/bin/pyinstaller src-daemon/build_daemon.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PYINSTALLER="${PYINSTALLER:-pyinstaller}"
OUT="dist-daemon"
NAME="CivilMantraDaemon"

rm -rf build "$OUT"
"$PYINSTALLER" \
  --onefile \
  --name "$NAME" \
  --distpath "$OUT" \
  --workpath build/pyi \
  --specpath build \
  --hidden-import keyring.backends.SecretService \
  --hidden-import keyring.backends.Windows \
  --hidden-import keyring.backends.macOS \
  --hidden-import cryptography.fernet \
  src-daemon/telemetry_daemon.py

echo "Built $OUT/$NAME"
