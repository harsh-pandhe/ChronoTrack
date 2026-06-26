#!/usr/bin/env python3
"""End-to-end test: real telemetry daemon cloud-sync -> real Node ingest -> Postgres.

Reads creds from $CREDS_FILE (written by serve-test-ingest.js), seeds the daemon's
local SQLite with unsynced rows, runs sync_once(), and asserts rows land in PG and
are marked synced. Also checks offline buffering and consent-withdrawal revoke.

Run via scripts/test-daemon-e2e.sh (which wires up Postgres + the Node server).
"""
import json
import os
import sqlite3
import sys
import tempfile
import urllib.request

# Isolate the daemon's config/db into a temp dir BEFORE importing the module.
_tmp = tempfile.mkdtemp(prefix="ct-daemon-")
os.environ["XDG_CONFIG_HOME"] = _tmp
os.environ["APPDATA"] = _tmp

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src-daemon"))
import telemetry_daemon as d  # noqa: E402

CREDS = json.load(open(os.environ["CREDS_FILE"]))

passed = 0
failed = 0


def ok(cond, label):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {label}")
    else:
        failed += 1
        print(f"  ✗ {label}")


def seed_local_rows(n, anomalous=0):
    conn = sqlite3.connect(d.DB_PATH)
    cur = conn.cursor()
    for i in range(n):
        cur.execute(
            "INSERT INTO telemetry_logs (active_window, keystrokes, mouse_movements, "
            "is_active, classified_sector, is_anomalous, synced) VALUES (?,?,?,?,?,?,0)",
            (d.encrypt_val("AutoCAD - Bridge.dwg"), d.encrypt_val(120),
             d.encrypt_val(45), 1, "Engineering / Design", anomalous))
    conn.commit()
    conn.close()


def pending_count():
    conn = sqlite3.connect(d.DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM telemetry_logs WHERE synced = 0")
    c = cur.fetchone()[0]
    conn.close()
    return c


print("Daemon cloud-sync E2E\n")

# 1. Activate the daemon with real cloud creds (mimics Electron handoff).
d.save_cloud_config(CREDS["base"], CREDS["device_token"], revoked=False)
ok(d.CLOUD["activated"] is True, "daemon activates with device token")

# 2. Seed 5 local samples, run one sync pass.
seed_local_rows(5)
ok(pending_count() == 5, "5 samples buffered locally before sync")
n, status = d.sync_once()
ok(status == 200 and n == 5, "sync uploads 5 samples (HTTP 200)")
ok(pending_count() == 0, "uploaded rows marked synced locally")

# 3. Offline buffering: point at a dead URL, ensure rows stay buffered.
seed_local_rows(3)
d.save_cloud_config("http://127.0.0.1:1/", CREDS["device_token"], revoked=False)
n, status = d.sync_once()
ok(status == "offline" and n == 0, "offline sync defers (no upload)")
ok(pending_count() == 3, "rows remain buffered when offline")

# Restore good URL, drain.
d.save_cloud_config(CREDS["base"], CREDS["device_token"], revoked=False)
n, status = d.sync_once()
ok(n == 3 and status == 200, "buffered rows drain after reconnect")

# 4. Consent withdrawal -> server revokes device -> sync gets 403 -> daemon halts.
# Log in as the employee to withdraw consent through the real endpoint.
login_body = json.dumps({"email": "emp@cm.com", "password": "emp-strong-pass"}).encode()
lr = urllib.request.Request(CREDS["base"] + "/api/auth/login", data=login_body,
                            headers={"Content-Type": "application/json"}, method="POST")
user_token = json.load(urllib.request.urlopen(lr))["token"]
wr = urllib.request.Request(CREDS["base"] + "/api/consent", method="DELETE",
                            headers={"Authorization": "Bearer " + user_token})
urllib.request.urlopen(wr)

seed_local_rows(2)
n, status = d.sync_once()
ok(status == 403 and n == 0, "sync gets 403 after consent withdrawal")
ok(d.CLOUD["revoked"] is True and d.CLOUD["activated"] is False,
   "daemon marks itself revoked + halts collection")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
