#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import threading
import sqlite3
import json
import re
import signal
from http.server import HTTPServer, BaseHTTPRequestHandler

# System checks
IS_LINUX = sys.platform.startswith("linux")
IS_WINDOWS = sys.platform == "win32"
IS_MACOS = sys.platform == "darwin"

# Core imports for encryption and secure keyring
try:
    from cryptography.fernet import Fernet
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False

try:
    import keyring
    HAS_KEYRING = True
except ImportError:
    HAS_KEYRING = False

# Rebrand migration (Civil Mantra -> ChronoTrack): keyring has no rename
# primitive, so reads fall back to the old service name and transparently
# re-store under the new one; writes always use the new name only.
_KEYRING_SERVICE = "ChronoTrack"
_OLD_KEYRING_SERVICE = "CivilMantra"


def _keyring_get(key):
    if not HAS_KEYRING:
        return None
    try:
        val = keyring.get_password(_KEYRING_SERVICE, key)
    except Exception:
        val = None
    if val:
        return val
    try:
        old_val = keyring.get_password(_OLD_KEYRING_SERVICE, key)
    except Exception:
        old_val = None
    if old_val:
        try:
            keyring.set_password(_KEYRING_SERVICE, key, old_val)
            keyring.delete_password(_OLD_KEYRING_SERVICE, key)
        except Exception:
            pass  # migrated value still returned even if the old entry can't be cleared
        return old_val
    return None


def _keyring_set(key, value):
    if not HAS_KEYRING:
        return
    try:
        keyring.set_password(_KEYRING_SERVICE, key, value)
    except Exception as e:
        print(f"[Keyring] Failed writing '{key}': {e}")


# Cross-platform config and database paths
def _config_base_dir():
    if IS_WINDOWS:
        return os.environ.get("APPDATA", os.path.expanduser("~"))
    elif IS_MACOS:
        return os.path.expanduser("~/Library/Application Support")
    else:
        return os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))

_CONFIG_BASE = _config_base_dir()
CONFIG_DIR = os.path.join(_CONFIG_BASE, "chronotrack")
_OLD_CONFIG_DIR = os.path.join(_CONFIG_BASE, "civil-mantra")  # pre-rebrand folder name


def _migrate_rebrand_dir():
    # Rebrand migration (Civil Mantra -> ChronoTrack): move an existing install's
    # whole config dir (telemetry.db, config.json, daemon.log, ...) to the new
    # folder name once, in place, so existing users don't lose history. Runs
    # before anything else touches CONFIG_DIR/DB_DIR.
    if not os.path.exists(CONFIG_DIR) and os.path.exists(_OLD_CONFIG_DIR):
        try:
            os.rename(_OLD_CONFIG_DIR, CONFIG_DIR)
        except Exception:
            pass  # best-effort — worst case this install starts fresh under the new name


_migrate_rebrand_dir()

DB_DIR = os.path.join(CONFIG_DIR, "data")
DB_PATH = os.path.join(DB_DIR, "telemetry.db")
PID_PATH = os.path.join(DB_DIR, "daemon.pid")
PORT = 5050
MAX_LOG_RETENTION = 5000  # Prune logs beyond 5,000 entries to prevent disk bloat

# Stats counters
stats_lock = threading.Lock()
keystroke_count = 0
mouse_count = 0
current_window = "Unknown"
monitored_device_ids = set()
monitored_lock = threading.Lock()

# Ensure directories exist
os.makedirs(DB_DIR, exist_ok=True)

# Redirect stdout/stderr to a log file. This is the real fix for the daemon
# ever showing a console window: `windowsHide` on the Electron spawn() call
# only helps when Electron itself launches the process — the OS autostart
# entry (Run key / systemd / LaunchAgent) launches the exe directly with no
# such option, so a PyInstaller console-subsystem binary still pops a window
# on every login. Building with --noconsole/--windowed removes the console
# subsystem entirely (see build_daemon.sh + release.yml), but a windowed exe
# has no real stdout — bare print() would then throw on a None stream. Doing
# this ourselves (instead of relying on PyInstaller's stdio shim) guarantees
# no crash either way and keeps the logs somewhere useful for debugging.
LOG_PATH = os.path.join(DB_DIR, "daemon.log")
MAX_LOG_BYTES = 5 * 1024 * 1024  # rotate once past 5MB so it never grows unbounded
try:
    if os.path.exists(LOG_PATH) and os.path.getsize(LOG_PATH) > MAX_LOG_BYTES:
        os.replace(LOG_PATH, LOG_PATH + ".1")
    _log_file = open(LOG_PATH, "a", buffering=1, encoding="utf-8")
    sys.stdout = _log_file
    sys.stderr = _log_file
except Exception:
    pass  # fall back to whatever stdio PyInstaller gave us

# Generate or load configuration
def get_or_create_config():
    os.makedirs(CONFIG_DIR, exist_ok=True)
    config_path = os.path.join(CONFIG_DIR, "config.json")
    
    token = None
    enc_key = None
    
    # Try Keyring first (transparently migrates values stored under the old
    # pre-rebrand service name, if any).
    if HAS_KEYRING:
        try:
            token = _keyring_get("api_token")
            enc_key = _keyring_get("db_encryption_key")
        except Exception as e:
            print(f"[Keyring] Note: Keyring query skipped/unavailable ({e})")

    # Fallback to local config file cache
    if not token or not enc_key:
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    data = json.load(f)
                    if not token:
                        token = data.get("api_token")
                    if not enc_key:
                        enc_key = data.get("db_encryption_key")
            except Exception:
                pass
                
    needs_save_keyring = False
    needs_save_file = False
    
    if not token:
        import secrets
        token = secrets.token_hex(16)
        needs_save_keyring = True
        needs_save_file = True
    if not enc_key:
        if HAS_CRYPTOGRAPHY:
            enc_key = Fernet.generate_key().decode()
        else:
            enc_key = "fallback-plaintext"
        needs_save_keyring = True
        needs_save_file = True
        
    # Set to Keyring if supported and new
    if HAS_KEYRING and needs_save_keyring:
        try:
            _keyring_set("api_token", token)
            _keyring_set("db_encryption_key", enc_key)
            print("[Keyring] Config credentials saved securely to OS Keychain/Keyring.")
        except Exception as e:
            print(f"[Keyring] Failed writing to keyring: {e}")
            needs_save_file = True
            
    # Always write config.json with the resolved token so the Electron preload
    # reads the SAME api_token the daemon enforces (else local /api/* -> 401 and
    # the live panel falls back to placeholder data).
    try:
        with open(config_path, "w") as f:
            json.dump({
                "api_token": token,
                "db_encryption_key": enc_key
            }, f, indent=2)
    except Exception as e:
        print(f"[Config] Error writing config: {e}")

    return token, enc_key

# Load config values
API_TOKEN, DB_ENCRYPTION_KEY = get_or_create_config()

# Initialize Cipher
cipher = None
if HAS_CRYPTOGRAPHY and DB_ENCRYPTION_KEY != "fallback-plaintext":
    try:
        cipher = Fernet(DB_ENCRYPTION_KEY.encode())
        print("[Security] Fernet data encryption active.")
    except Exception as e:
        print(f"[Security] Failed to initialize cipher: {e}")
else:
    print("[WARNING] Cryptography not active. Telemetry data will be stored in plaintext.")

# Encryption / Decryption Helpers
def encrypt_val(val):
    if not cipher:
        return str(val)
    try:
        return cipher.encrypt(str(val).encode()).decode()
    except Exception as e:
        print(f"[Security] Encryption error: {e}")
        return str(val)

def decrypt_val(val, default=""):
    if not cipher:
        return val
    try:
        return cipher.decrypt(val.encode()).decode()
    except Exception:
        # Fallback to returning raw string if it is not encrypted
        return val

# Single Instance Lock
#
# The old check (read PID file -> check if that PID is alive -> write our own
# PID) is a classic TOCTOU race: two processes launched within the same
# instant (e.g. Electron's spawn() and the OS autostart Run-key both firing
# at login) can both pass the "is it alive" check before either has written
# its own PID, so both proceed — confirmed in the wild as two
# ChronoTrackDaemon.exe processes with start times one second apart.
#
# Fix: hold the PID file open with an OS-level exclusive lock for the whole
# process lifetime. The OS enforces this atomically, and releases it
# automatically even on a hard crash (unlike the old explicit release_lock()).
_lock_file = None

def acquire_lock():
    global _lock_file
    try:
        _lock_file = open(PID_PATH, "a+")
        if IS_WINDOWS:
            import msvcrt
            try:
                msvcrt.locking(_lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                print("[FATAL] Another instance of ChronoTrack Telemetry Daemon is already running. Exiting.")
                sys.exit(1)
        else:
            import fcntl
            try:
                fcntl.flock(_lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                print("[FATAL] Another instance of ChronoTrack Telemetry Daemon is already running. Exiting.")
                sys.exit(1)
        _lock_file.seek(0)
        _lock_file.truncate()
        _lock_file.write(str(os.getpid()))
        _lock_file.flush()
    except PermissionError:
        print("[FATAL] Permission denied acquiring PID lock. Exiting.")
        sys.exit(1)

def release_lock():
    global _lock_file
    if _lock_file:
        try:
            _lock_file.close()
        except Exception:
            pass
        _lock_file = None
    if os.path.exists(PID_PATH):
        try:
            os.remove(PID_PATH)
        except Exception:
            pass

# Initialize SQLite database with ML columns
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            active_window TEXT,
            keystrokes TEXT,
            mouse_movements TEXT,
            is_active INTEGER,
            classified_sector TEXT DEFAULT 'General Operations',
            is_anomalous INTEGER DEFAULT 0
        )
    """)
    try:
        cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN classified_sector TEXT DEFAULT 'General Operations'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN is_anomalous INTEGER DEFAULT 0")
    except Exception:
        pass
    # Cloud sync bookkeeping: 0 = not yet uploaded to central backend.
    try:
        cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN synced INTEGER DEFAULT 0")
    except Exception:
        pass
    conn.commit()
    conn.close()

# Prune old database records to save space
def prune_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs")
        count = cursor.fetchone()[0]
        if count > MAX_LOG_RETENTION:
            excess = count - MAX_LOG_RETENTION
            # Only ever prune rows already confirmed synced to the cloud —
            # never discard data that hasn't been uploaded yet, or a slow/down
            # cloud sync silently loses real telemetry.
            cursor.execute(
                "DELETE FROM telemetry_logs WHERE id IN ("
                "SELECT id FROM telemetry_logs WHERE synced = 1 "
                "ORDER BY id ASC LIMIT ?)", (excess,)
            )
            deleted = cursor.rowcount
            conn.commit()
            if deleted:
                print(f"[Database] Retention policy: Pruned {deleted} oldest synced records.")
            if deleted < excess:
                print(f"[Database] Retention policy: {excess - deleted} unsynced records over the "
                      f"{MAX_LOG_RETENTION} cap are being kept until cloud sync catches up.")
        conn.close()
    except Exception as e:
        print(f"[Database] Error pruning table: {e}")

init_db()

# ==================== CLOUD SYNC (central backend) ====================
# The daemon buffers every sample in local SQLite (offline-safe) and pushes
# unsynced rows to the central ingest endpoint. Auth = per-device bearer token
# issued at activation. Uses stdlib urllib (not requests) so the binary
# bundles small; certifi is the one exception (see _build_ssl_context below).
import socket
import ssl
import urllib.request
import urllib.error

# On Windows, ssl.get_default_verify_paths() falls back to a hardcoded
# Unix-style path (C:\Program Files\Common Files\SSL\cert.pem) that usually
# doesn't exist — this made cloud sync fail intermittently (timeouts, DNS
# lookups even, connection resets) depending on whether Python's OpenSSL
# build happened to fall back to the Windows cert store correctly. Building
# an explicit SSLContext from certifi's bundled CA list sidesteps that
# platform ambiguity entirely, at the cost of one small pure-data dependency.
def _build_ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception as e:
        print(f"[Cloud] certifi unavailable ({type(e).__name__}: {e}), falling back to system default SSL context.")
        return ssl.create_default_context()

SSL_CONTEXT = _build_ssl_context()

CLOUD_CONFIG_PATH = os.path.join(CONFIG_DIR, "cloud.json")
SYNC_INTERVAL = 30          # seconds between upload attempts
SYNC_BATCH = 200            # rows per request (server cap is 500)

cloud_lock = threading.Lock()
CLOUD = {"cloud_url": None, "device_token": None, "activated": False, "revoked": False}
# Sync visibility: so the UI can show real status instead of a silent hang.
SYNC_STATE = {"last_attempt_at": None, "last_success_at": None, "last_error": None}

# Productivity rules pushed from the server (admin-defined whitelist/blacklist),
# refreshed on each sync. Used to label samples productive/unproductive.
rules_lock = threading.Lock()
RULES_CACHE = {"whitelist": [], "blacklist": []}


def classify_productivity(window_title):
    if not window_title:
        return "neutral"
    t = window_title.lower()
    with rules_lock:
        wl = list(RULES_CACHE["whitelist"])
        bl = list(RULES_CACHE["blacklist"])
    if any(k in t for k in bl):
        return "unproductive"
    if any(k in t for k in wl):
        return "productive"
    return "neutral"


def load_cloud_config():
    # Device token preferentially from OS keyring; URL + flags from cloud.json.
    token = None
    if HAS_KEYRING:
        try:
            token = _keyring_get("device_token")
        except Exception:
            token = None
    data = {}
    if os.path.exists(CLOUD_CONFIG_PATH):
        try:
            with open(CLOUD_CONFIG_PATH, "r") as f:
                data = json.load(f)
        except Exception:
            data = {}
    with cloud_lock:
        CLOUD["cloud_url"] = data.get("cloud_url")
        CLOUD["device_token"] = token or data.get("device_token")
        CLOUD["revoked"] = bool(data.get("revoked", False))
        CLOUD["activated"] = bool(CLOUD["cloud_url"] and CLOUD["device_token"] and not CLOUD["revoked"])


def save_cloud_config(cloud_url, device_token, revoked=False):
    if HAS_KEYRING and device_token:
        try:
            _keyring_set("device_token", device_token)
        except Exception:
            pass
    try:
        with open(CLOUD_CONFIG_PATH, "w") as f:
            # Mirror to file as fallback when keyring is unavailable.
            json.dump({"cloud_url": cloud_url, "device_token": device_token,
                       "revoked": revoked}, f, indent=2)
    except Exception as e:
        print(f"[Cloud] Error writing cloud config: {e}")
    load_cloud_config()


def _to_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def get_unsynced(limit=SYNC_BATCH):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, timestamp, active_window, keystrokes, mouse_movements, "
        "is_active, classified_sector, is_anomalous FROM telemetry_logs "
        "WHERE synced = 0 ORDER BY id ASC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return rows


def mark_synced(ids):
    if not ids:
        return
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executemany("UPDATE telemetry_logs SET synced = 1 WHERE id = ?", [(i,) for i in ids])
    conn.commit()
    conn.close()


def row_to_sample(row):
    # Map local (encrypted) row -> cloud ingest contract. Window titles were
    # already sanitized at write time; densities decrypted back to ints.
    _id, ts, window, keys, mouse, is_active, sector, anomalous = row
    keys_i = _to_int(decrypt_val(keys, "0"))
    mouse_i = _to_int(decrypt_val(mouse, "0"))
    density = keys_i + mouse_i
    active = bool(is_active)
    return {
        "ts": ts,
        "window_title": decrypt_val(window, "Unknown"),
        "app_category": sector or "General Operations",
        "input_density": density,
        "focus_score": min(100, density) if active else 0,
        "is_idle": not active,
        # Productivity label from admin-defined rules (server-pushed).
        "ai_label": classify_productivity(decrypt_val(window, "")),
        "anomaly_flag": bool(anomalous),
    }


def cloud_post(url, token, payload):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15, context=SSL_CONTEXT) as resp:
        return resp.status, resp.read().decode("utf-8")


def sync_once():
    """Upload one batch. Returns (uploaded_count, status_code). Non-throwing."""
    with cloud_lock:
        url = CLOUD["cloud_url"]
        token = CLOUD["device_token"]
        activated = CLOUD["activated"]
    if not activated:
        return 0, "inactive"

    rows = get_unsynced()
    if not rows:
        return 0, 204
    samples = [row_to_sample(r) for r in rows]
    ingest_url = url.rstrip("/") + "/api/ingest"
    SYNC_STATE["last_attempt_at"] = time.time()
    try:
        status, body = cloud_post(ingest_url, token, {"samples": samples})
        if status == 200:
            mark_synced([r[0] for r in rows])
            SYNC_STATE["last_success_at"] = time.time()
            SYNC_STATE["last_error"] = None
            # Refresh productivity rules pushed back by the server.
            try:
                resp = json.loads(body or "{}")
                if isinstance(resp.get("rules"), dict):
                    with rules_lock:
                        RULES_CACHE["whitelist"] = [k.lower() for k in resp["rules"].get("whitelist", [])]
                        RULES_CACHE["blacklist"] = [k.lower() for k in resp["rules"].get("blacklist", [])]
            except Exception:
                pass
            return len(rows), 200
        SYNC_STATE["last_error"] = f"Server returned status {status}"
        return 0, status
    except urllib.error.HTTPError as e:
        if e.code == 403:
            # Device revoked (e.g. employee withdrew consent) -> stop collecting.
            print("[Cloud] Device revoked by server. Halting telemetry collection.")
            with cloud_lock:
                CLOUD["activated"] = False
                CLOUD["revoked"] = True
            save_cloud_config(url, token, revoked=True)
            SYNC_STATE["last_error"] = "Device revoked by server"
        else:
            SYNC_STATE["last_error"] = f"Server rejected upload (HTTP {e.code})"
        return 0, e.code
    except (urllib.error.URLError, OSError) as e:
        # Offline / unreachable: keep rows buffered, retry next cycle.
        # Unwrap URLError to see what actually failed (DNS/socket/SSL) rather
        # than only ever logging "URLError" — this is what let the 2026-07-04
        # investigation tell a genuine SSL cert-bundling issue apart from
        # plain network flakiness instead of guessing.
        reason = getattr(e, "reason", e)
        reason_type = type(reason).__name__
        if isinstance(reason, ssl.SSLError):
            category = "TLS/certificate error"
        elif isinstance(reason, socket.gaierror):
            category = "DNS lookup failed"
        elif isinstance(reason, TimeoutError):
            category = "connection timed out"
        else:
            category = "network unreachable"
        print(f"[Cloud] Sync deferred ({category}, {reason_type}): {e}")
        SYNC_STATE["last_error"] = f"Cannot reach cloud server ({category})"
        return 0, "offline"


def cloud_sync_loop():
    print("Starting cloud sync thread (interval %ss)..." % SYNC_INTERVAL)
    while True:
        try:
            n, status = sync_once()
            if n:
                print(f"[Cloud] Uploaded {n} samples (status {status}).")
        except Exception as e:
            print(f"[Cloud] Sync loop error: {e}")
        time.sleep(SYNC_INTERVAL)


load_cloud_config()

# ==================== LINUX TELEMETRY METHODS ====================
# Auto-detect device IDs from xinput
def get_device_ids():
    try:
        output = subprocess.check_output(["xinput", "list"]).decode("utf-8")
    except Exception as e:
        print(f"Error listing xinput devices: {e}")
        return [], []
    
    keyboards = []
    pointers = []

    # Classify by the authoritative "[slave  pointer]" / "[slave  keyboard]" tag
    # (works for any device name e.g. "Gaming Mouse"); skip master/virtual cores.
    for line in output.split("\n"):
        match = re.search(r"id=(\d+)", line)
        if not match:
            continue
        dev_id = int(match.group(1))
        if "master" in line.lower() or "Virtual core" in line or "XTEST" in line:
            continue
        if "slave  pointer" in line or re.search(r"slave\s+pointer", line):
            pointers.append(dev_id)
        elif "slave  keyboard" in line or re.search(r"slave\s+keyboard", line):
            keyboards.append(dev_id)
        # Fallback to name keywords if tag missing.
        elif "keyboard" in line.lower():
            keyboards.append(dev_id)
        elif "mouse" in line.lower() or "pointer" in line.lower():
            pointers.append(dev_id)

    return list(set(keyboards)), list(set(pointers))

# Track xinput child procs so we can kill them on exit (else they orphan and
# leak X11 client connections -> "Maximum number of clients reached").
monitor_procs = []
monitor_procs_lock = threading.Lock()

# Reader thread for xinput device events
def monitor_device(device_id, dev_type):
    global keystroke_count, mouse_count
    print(f"Starting telemetry listener for device ID {device_id} ({dev_type})")

    try:
        proc = subprocess.Popen(
            ["xinput", "test", str(device_id)],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
            start_new_session=True,  # own process group for clean teardown
        )
    except Exception as e:
        print(f"Failed to start xinput test for device {device_id}: {e}")
        with monitored_lock:
            monitored_device_ids.discard(device_id)
        return

    with monitor_procs_lock:
        monitor_procs.append(proc)

    for line in proc.stdout:
        with stats_lock:
            if "key press" in line.lower():
                keystroke_count += 1
            elif "motion" in line.lower() or "button press" in line.lower():
                mouse_count += 1

    proc.wait()
    # Subprocess ended (device unplugged / X gone) -> allow rediscovery + cleanup.
    with monitor_procs_lock:
        if proc in monitor_procs:
            monitor_procs.remove(proc)
    with monitored_lock:
        monitored_device_ids.discard(device_id)


def stop_all_monitors():
    with monitor_procs_lock:
        for proc in monitor_procs:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                try:
                    proc.terminate()
                except Exception:
                    pass
        monitor_procs.clear()

# Hotplug discovery thread
def device_discovery_loop():
    global monitored_device_ids
    while True:
        keyboards, pointers = get_device_ids()
        all_devices = keyboards + pointers
        
        for dev_id in all_devices:
            with monitored_lock:
                if dev_id in monitored_device_ids:
                    continue
                monitored_device_ids.add(dev_id)
            dev_type = "keyboard" if dev_id in keyboards else "pointer"
            t = threading.Thread(target=monitor_device, args=(dev_id, dev_type), daemon=True)
            t.start()

        time.sleep(60)

# ==================== WINDOWS TELEMETRY METHODS ====================
kb_hook_ref = None
ms_hook_ref = None

def run_windows_hooks():
    try:
        import ctypes
        from ctypes import wintypes
        
        user32 = ctypes.windll.user32
        
        LRESULT = ctypes.c_longlong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_long
        HOOKPROC = ctypes.WINFUNCTYPE(LRESULT, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)

        # Without explicit argtypes/restype, ctypes marshals CallNextHookEx's
        # args as plain 32-bit C int by default. lParam is a pointer to a
        # KBDLLHOOKSTRUCT/MSLLHOOKSTRUCT and routinely exceeds the 32-bit
        # range on 64-bit Windows, raising
        # "ArgumentError: argument 4: OverflowError: int too long to convert"
        # on every single keystroke/mouse event (silently swallowed by ctypes
        # as "Exception ignored", but it means CallNextHookEx never actually
        # runs, so the hook chain breaks for every other listener).
        user32.CallNextHookEx.argtypes = [wintypes.HHOOK, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM]
        user32.CallNextHookEx.restype = LRESULT
        user32.SetWindowsHookExW.argtypes = [ctypes.c_int, HOOKPROC, wintypes.HINSTANCE, wintypes.DWORD]
        user32.SetWindowsHookExW.restype = wintypes.HHOOK

        WH_KEYBOARD_LL = 13
        WH_MOUSE_LL = 14
        WM_KEYDOWN = 0x0100
        WM_SYSKEYDOWN = 0x0104
        WM_LBUTTONDOWN = 0x0201
        WM_RBUTTONDOWN = 0x0204
        WM_MBUTTONDOWN = 0x0207
        WM_MOUSEMOVE = 0x0200
        
        def keyboard_proc(nCode, wParam, lParam):
            global keystroke_count
            if nCode >= 0:
                if wParam in (WM_KEYDOWN, WM_SYSKEYDOWN):
                    with stats_lock:
                        keystroke_count += 1
            return user32.CallNextHookEx(None, nCode, wParam, lParam)
            
        def mouse_proc(nCode, wParam, lParam):
            global mouse_count
            if nCode >= 0:
                if wParam in (WM_LBUTTONDOWN, WM_RBUTTONDOWN, WM_MBUTTONDOWN):
                    with stats_lock:
                        mouse_count += 1
                elif wParam == WM_MOUSEMOVE:
                    with stats_lock:
                        mouse_count += 1
            return user32.CallNextHookEx(None, nCode, wParam, lParam)
            
        global kb_hook_ref, ms_hook_ref
        kb_hook_ref = HOOKPROC(keyboard_proc)
        ms_hook_ref = HOOKPROC(mouse_proc)
        
        k_hook = user32.SetWindowsHookExW(WH_KEYBOARD_LL, kb_hook_ref, None, 0)
        m_hook = user32.SetWindowsHookExW(WH_MOUSE_LL, ms_hook_ref, None, 0)
        
        if not k_hook or not m_hook:
            print("[Windows Hooks] Failed to install low-level hooks.")
            return
            
        print("[Windows Hooks] Successfully installed keyboard and mouse low-level hooks.")
        
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
            
    except Exception as e:
        print(f"[Windows Hooks] Error running hooks: {e}")

# ==================== MAC OS TELEMETRY METHODS ====================
def macos_idle_loop():
    global keystroke_count, mouse_count
    print("[macOS Monitor] Starting macOS passive idle monitoring thread...")
    last_idle_time = 0.0
    
    while True:
        try:
            output = subprocess.check_output("ioreg -c IOHIDSystem | grep -i HIDIdleTime", shell=True).decode("utf-8")
            match = re.search(r'="?(\d+)"?', output.replace(" ", ""))
            if match:
                idle_ns = int(match.group(1))
                idle_sec = idle_ns / 1_000_000_000.0
                
                # Active state change detected
                if idle_sec < last_idle_time or idle_sec < 1.0:
                    with stats_lock:
                        keystroke_count += 1
                        mouse_count += 2
                last_idle_time = idle_sec
        except Exception as e:
            print(f"[macOS Monitor] Error polling ioreg: {e}")
        time.sleep(1)

# ==================== GENERAL ACTIVE WINDOW FETCH ====================
def get_active_window():
    global current_window
    if IS_WINDOWS:
        try:
            import ctypes
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if hwnd:
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                buf = ctypes.create_unicode_buffer(length + 1)
                ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                return buf.value
            return "System Idle"
        except Exception:
            return "Windows Application"
            
    elif IS_MACOS:
        try:
            script = 'tell application "System Events" to get name of first process whose frontmost is true'
            output = subprocess.check_output(["osascript", "-e", script], stderr=subprocess.DEVNULL).decode("utf-8").strip()
            if output:
                return output
            return "System Desktop"
        except Exception:
            return "macOS Application"
            
    else: # Linux X11 fallback
        try:
            if os.environ.get('XDG_SESSION_TYPE') == 'wayland':
                return "Wayland Window"
                
            id_output = subprocess.check_output(["xprop", "-root", "_NET_ACTIVE_WINDOW"], stderr=subprocess.DEVNULL).decode("utf-8")
            match = re.search(r"window id # (0x[0-9a-fA-F]+)", id_output)
            if not match:
                return "System Idle"
                
            win_id = match.group(1)
            name_output = subprocess.check_output(["xprop", "-id", win_id, "WM_NAME", "_NET_WM_NAME"], stderr=subprocess.DEVNULL).decode("utf-8")
            titles = re.findall(r'= "(.*?)"', name_output)
            if titles:
                for t in titles:
                    if t.strip():
                        return t.strip()
            return "Unknown Application"
        except Exception:
            return "System Desktop"

# Sensitive window title patterns for privacy compliance (Phase 4 Data Minimization)
SENSITIVE_PATTERNS = [
    r"(?:icici|hdfc|sbi|paypal|stripe|venmo|chase|bank|card|checkout|payment|billing|credit-card|banking|investment|demat)",
    r"(?:whatsapp|telegram|signal|discord|messenger|skype|imessage|hangouts|chat|messages)",
    r"(?:gmail|outlook|yahoo|protonmail|inbox|email|mail)",
    r"(?:facebook|instagram|twitter|reddit|tiktok|snapchat|pinterest|youtube)"
]

def sanitize_window_title(title):
    if not title:
        return "Unknown"
    lower_title = title.lower()
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, lower_title):
            if any(x in lower_title for x in ["whatsapp", "telegram", "signal", "discord", "messenger", "chat"]):
                return "Private Messenger (Masked)"
            elif any(x in lower_title for x in ["bank", "paypal", "card", "payment", "checkout", "billing", "icici", "hdfc", "sbi"]):
                return "Sensitive Banking Portal (Masked)"
            elif any(x in lower_title for x in ["gmail", "mail", "inbox", "outlook", "protonmail"]):
                return "Private Mailbox (Masked)"
            elif any(x in lower_title for x in ["youtube", "facebook", "instagram", "reddit", "twitter"]):
                return "Personal Social Portal (Masked)"
            return "Sensitive Content (Masked)"
    return title

# AI/ML Classification & Anomaly Detection Helpers (Phase 4 Models)
def classify_activity(window_title):
    if not window_title:
        return "General Operations"
    title = window_title.lower()
    if any(k in title for k in ["vscode", "vs code", "pycharm", "eclipse", "sublime", "git", "github", "gitlab", "terminal", "bash", "command prompt", "powershell"]):
        return "Software Development"
    elif any(k in title for k in ["revit", "autocad", "cad", "solidworks", "sketchup", "archicad", "photoshop", "illustrator", "indesign"]):
        return "Engineering / Design"
    elif any(k in title for k in ["slack", "zoom", "teams", "skype", "whatsapp", "discord", "outlook", "mail"]):
        return "Communication"
    elif any(k in title for k in ["excel", "sheets", "accounting", "quickbooks", "calc", "ledger"]):
        return "Finance / Analysis"
    elif any(k in title for k in ["youtube", "facebook", "instagram", "netflix", "social", "twitter", "reddit"]):
        return "Personal / Entertainment"
    return "General Operations"

def detect_anomaly(keystrokes, mouse_movements):
    from datetime import datetime
    current_hour = datetime.now().hour
    # Working at irregular times (late night/early morning) is flagged as anomalous
    if current_hour >= 23 or current_hour <= 5:
        return 1
    # Bot-like automation inputs are flagged
    if mouse_movements > 1000 or keystrokes > 500:
        return 1
    return 0

# Periodic aggregator and database logger
def db_logger_loop():
    global keystroke_count, mouse_count, current_window
    print("Starting background database logging thread (10s intervals)...")
    
    while True:
        time.sleep(10)

        # DPDP: if the device was revoked (consent withdrawn), stop collecting.
        with cloud_lock:
            if CLOUD["revoked"]:
                with stats_lock:
                    keystroke_count = 0
                    mouse_count = 0
                continue

        raw_window = get_active_window()
        window = sanitize_window_title(raw_window)
        
        with stats_lock:
            keys = keystroke_count
            mouse = mouse_count
            keystroke_count = 0
            mouse_count = 0
            current_window = window
            
        is_active = 1 if (keys > 2 or mouse > 5) else 0
        
        # Encrypt logs before committing to database
        enc_window = encrypt_val(window)
        enc_keys = encrypt_val(keys)
        enc_mouse = encrypt_val(mouse)
        
        sector = classify_activity(window)
        anomalous = detect_anomaly(keys, mouse)
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO telemetry_logs (active_window, keystrokes, mouse_movements, is_active, classified_sector, is_anomalous) VALUES (?, ?, ?, ?, ?, ?)",
                (enc_window, enc_keys, enc_mouse, is_active, sector, anomalous)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Database write error: {e}")
            
        prune_db()

# Local Loopback REST API Handler (Security Hardened)
class TelemetryAPIHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _json(self, status, obj):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode("utf-8"))

    def do_POST(self):
        # Activation handoff from the Electron app after the user activates in
        # the cloud: stores cloud_url + device_token so the sync thread starts.
        if not self.is_authenticated():
            return self._json(401, {"error": "Unauthorized"})
        if self.path != "/api/activate":
            return self._json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or "{}")
        except Exception:
            return self._json(400, {"error": "Invalid JSON"})

        cloud_url = body.get("cloud_url")
        device_token = body.get("device_token")
        if not cloud_url or not device_token:
            return self._json(400, {"error": "Missing cloud_url or device_token"})
        save_cloud_config(cloud_url, device_token, revoked=False)
        return self._json(200, {"activated": True})
        
    def is_authenticated(self):
        if not API_TOKEN:
            return True
            
        auth_header = self.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            if token == API_TOKEN:
                return True
        return False
        
    def do_GET(self):
        global current_window, keystroke_count, mouse_count
        
        # Security Auth Check
        if not self.is_authenticated():
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode("utf-8"))
            return
            
        if self.path == "/api/telemetry":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            with stats_lock:
                data = {
                    "active_window": current_window,
                    "keystrokes_interval": keystroke_count,
                    "mouse_movements_interval": mouse_count,
                    "status": "active" if (keystroke_count > 0 or mouse_count > 0) else "idle",
                    "classified_sector": classify_activity(current_window),
                    "is_anomalous": bool(detect_anomaly(keystroke_count, mouse_count))
                }
            self.wfile.write(json.dumps(data).encode("utf-8"))
            
        elif self.path == "/api/history":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT timestamp, active_window, keystrokes, mouse_movements, is_active, classified_sector, is_anomalous FROM telemetry_logs ORDER BY id DESC LIMIT 50")
                rows = cursor.fetchall()
                conn.close()
                
                history = []
                for r in rows:
                    raw_window = decrypt_val(r[1], "Unknown Application")
                    raw_keys = decrypt_val(r[2], "0")
                    raw_mouse = decrypt_val(r[3], "0")
                    
                    try:
                        int_keys = int(raw_keys)
                    except ValueError:
                        int_keys = 0
                        
                    try:
                        int_mouse = int(raw_mouse)
                    except ValueError:
                        int_mouse = 0
                        
                    history.append({
                        "timestamp": r[0],
                        "active_window": raw_window,
                        "keystrokes": int_keys,
                        "mouse_movements": int_mouse,
                        "is_active": bool(r[4]),
                        "classified_sector": r[5] if len(r) > 5 else "General Operations",
                        "is_anomalous": bool(r[6]) if len(r) > 6 else False
                    })
            except Exception as e:
                history = {"error": str(e)}
                
            self.wfile.write(json.dumps(history).encode("utf-8"))
            
        elif self.path == "/api/status":
            try:
                conn = sqlite3.connect(DB_PATH)
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM telemetry_logs WHERE synced = 0")
                pending = cur.fetchone()[0]
                conn.close()
            except Exception:
                pending = None
            with cloud_lock:
                cloud_state = {
                    "activated": CLOUD["activated"],
                    "revoked": CLOUD["revoked"],
                    "cloud_url": CLOUD["cloud_url"],
                }
            cloud_state["last_attempt_at"] = SYNC_STATE["last_attempt_at"]
            cloud_state["last_success_at"] = SYNC_STATE["last_success_at"]
            cloud_state["last_error"] = SYNC_STATE["last_error"]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "online": True, "db_path": DB_PATH,
                "pending_sync": pending, "cloud": cloud_state,
            }).encode("utf-8"))
            
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server = HTTPServer(("127.0.0.1", PORT), TelemetryAPIHandler)
    print(f"Secure Telemetry API Server running locally on http://127.0.0.1:{PORT}")
    server.serve_forever()

def _graceful_exit(signum, frame):
    # Kill child xinput monitors so they don't orphan + leak X11 clients.
    try:
        stop_all_monitors()
    except Exception:
        pass
    release_lock()
    sys.exit(0)


if __name__ == "__main__":
    print(f"Initializing ChronoTrack: Local Telemetry Daemon (Platform: {sys.platform})...")
    acquire_lock()
    signal.signal(signal.SIGTERM, _graceful_exit)
    signal.signal(signal.SIGINT, _graceful_exit)
    
    # Platform-specific input listener routing
    if IS_WINDOWS:
        t = threading.Thread(target=run_windows_hooks, daemon=True)
        t.start()
    elif IS_MACOS:
        t = threading.Thread(target=macos_idle_loop, daemon=True)
        t.start()
    else:
        discovery_thread = threading.Thread(target=device_discovery_loop, daemon=True)
        discovery_thread.start()
    
    # Start Database logging thread
    log_thread = threading.Thread(target=db_logger_loop, daemon=True)
    log_thread.start()

    # Start cloud sync thread (uploads buffered telemetry to central backend)
    sync_thread = threading.Thread(target=cloud_sync_loop, daemon=True)
    sync_thread.start()

    # Start REST API server in main thread
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nStopping Local Telemetry Daemon.")
    finally:
        stop_all_monitors()
        release_lock()
        sys.exit(0)
