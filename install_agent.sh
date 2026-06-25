#!/usr/bin/env bash

# Civil Mantra: Employee Agent & Desktop Client Installer
# Sets up the telemetry daemon + Electron desktop client to boot on login

set -e

# Terminate on error formatting
error_exit() {
    echo -e "\033[0;31m[ERROR] $1\033[0m" >&2
    exit 1
}

info_log() {
    echo -e "\033[0;34m[INFO] $1\033[0m"
}

success_log() {
    echo -e "\033[0;32m[SUCCESS] $1\033[0m"
}

# 1. Dependency Verifications
info_log "Checking target system dependencies..."
command -v python3 >/dev/null 2>&1 || error_exit "python3 is required but not installed."
command -v xinput >/dev/null 2>&1 || error_exit "xinput is required but not installed."
command -v xprop >/dev/null 2>&1 || error_exit "xprop is required but not installed."
command -v sqlite3 >/dev/null 2>&1 || error_exit "sqlite3 is required but not installed."
command -v npm >/dev/null 2>&1 || error_exit "Node Package Manager (npm) is required."

PROJECT_ROOT=$(pwd)
DAEMON_PATH="$PROJECT_ROOT/src-daemon/telemetry_daemon.py"

if [ ! -f "$DAEMON_PATH" ]; then
    error_exit "Daemon script not found at $DAEMON_PATH. Make sure you run from the repository root."
fi

# Make daemon script executable
chmod +x "$DAEMON_PATH"

# 2. Setup Background Telemetry Auto-Start
info_log "Configuring background telemetry service to start on login..."
mkdir -p ~/.config/autostart

DAEMON_AUTOSTART_FILE="$HOME/.config/autostart/civil-mantra-daemon.desktop"
cat <<EOF > "$DAEMON_AUTOSTART_FILE"
[Desktop Entry]
Type=Application
Exec=$DAEMON_PATH
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Civil Mantra Telemetry Daemon
Comment=Background workforce activity telemetry tracker
EOF
chmod +x "$DAEMON_AUTOSTART_FILE"
success_log "Registered background telemetry daemon autostart configuration."

# 3. Setup Electron Desktop App Auto-Start
info_log "Configuring Employee Desktop Client to launch on login..."

CLIENT_AUTOSTART_FILE="$HOME/.config/autostart/civil-mantra-client.desktop"
# We trigger the dev/preview client via npm run electron:dev. 
# Once packaged as a deb/binary, this can point directly to the binary file.
cat <<EOF > "$CLIENT_AUTOSTART_FILE"
[Desktop Entry]
Type=Application
Exec=npm --prefix $PROJECT_ROOT run electron:dev
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Civil Mantra Agent Desktop Portal
Comment=Employee self-monitoring and task allocation widget
EOF
chmod +x "$CLIENT_AUTOSTART_FILE"
success_log "Registered Electron client autostart configuration."

# 4. Try launching the daemon service
info_log "Spawning background telemetry daemon process..."
nohup "$DAEMON_PATH" > /dev/null 2>&1 &
success_log "Daemon started successfully."

echo ""
echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m      CIVIL MANTRA AGENT INSTALLATION COMPLETED SUCCESSFULLY  \033[0m"
echo -e "\033[1;32m============================================================\033[0m"
echo "The background telemetry tracker is running and listening on Port 5050."
echo "Both the daemon and the desktop client will auto-start on every system login."
echo "To start the client manually now, run: npm run electron:dev"
echo "============================================================"
echo ""
