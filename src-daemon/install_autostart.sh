#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DAEMON_PATH="$SCRIPT_DIR/telemetry_daemon.py"
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/chronotrack-telemetry.desktop"

echo "=== ChronoTrack: Telemetry Daemon Installer ==="

# Make daemon executable
chmod +x "$DAEMON_PATH"
echo "✓ Set executable permissions for telemetry daemon."

# Create autostart directory if missing
mkdir -p "$AUTOSTART_DIR"

# Create .desktop file
cat <<EOF > "$AUTOSTART_FILE"
[Desktop Entry]
Type=Application
Exec=python3 $DAEMON_PATH
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=ChronoTrack Telemetry Daemon
Comment=Tracks background inputs and active window telemetry.
EOF

chmod +x "$AUTOSTART_FILE"
echo "✓ Created autostart shortcut at: $AUTOSTART_FILE"
echo "✓ Background telemetry service registered to run automatically on login."
echo "============================================="
