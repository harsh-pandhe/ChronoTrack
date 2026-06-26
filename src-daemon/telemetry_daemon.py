#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import threading
import sqlite3
import json
import re
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

# Cross-platform config and database paths
def get_config_dir():
    if IS_WINDOWS:
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif IS_MACOS:
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    return os.path.join(base, "civil-mantra")

CONFIG_DIR = get_config_dir()
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

# Ensure directories exist
os.makedirs(DB_DIR, exist_ok=True)

# Generate or load configuration
def get_or_create_config():
    os.makedirs(CONFIG_DIR, exist_ok=True)
    config_path = os.path.join(CONFIG_DIR, "config.json")
    
    token = None
    enc_key = None
    
    # Try Keyring first
    if HAS_KEYRING:
        try:
            token = keyring.get_password("CivilMantra", "api_token")
            enc_key = keyring.get_password("CivilMantra", "db_encryption_key")
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
            keyring.set_password("CivilMantra", "api_token", token)
            keyring.set_password("CivilMantra", "db_encryption_key", enc_key)
            print("[Keyring] Config credentials saved securely to OS Keychain/Keyring.")
        except Exception as e:
            print(f"[Keyring] Failed writing to keyring: {e}")
            needs_save_file = True
            
    # Save cache fallback file if needed
    if needs_save_file:
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
def acquire_lock():
    if os.path.exists(PID_PATH):
        try:
            with open(PID_PATH, "r") as f:
                old_pid = int(f.read().strip())
            # Check if process is still active
            if IS_WINDOWS:
                import ctypes
                PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
                h_proc = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, old_pid)
                if h_proc:
                    ctypes.windll.kernel32.CloseHandle(h_proc)
                    print(f"[FATAL] Another instance of Civil Mantra Telemetry Daemon is already running (PID: {old_pid}). Exiting.")
                    sys.exit(1)
            else:
                os.kill(old_pid, 0)
                print(f"[FATAL] Another instance of Civil Mantra Telemetry Daemon is already running (PID: {old_pid}). Exiting.")
                sys.exit(1)
        except (ProcessLookupError, ValueError, OSError):
            # Process is dead, stale PID file
            pass
        except PermissionError:
            print("[FATAL] Permission denied reading PID lock. Exiting.")
            sys.exit(1)
            
    with open(PID_PATH, "w") as f:
        f.write(str(os.getpid()))

def release_lock():
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
            cursor.execute(f"DELETE FROM telemetry_logs WHERE id IN (SELECT id FROM telemetry_logs ORDER BY id ASC LIMIT {excess})")
            conn.commit()
            print(f"[Database] Retention policy: Pruned {excess} oldest records.")
        conn.close()
    except Exception as e:
        print(f"[Database] Error pruning table: {e}")

init_db()

# ==================== CLOUD SYNC (central backend) ====================
# The daemon buffers every sample in local SQLite (offline-safe) and pushes
# unsynced rows to the central ingest endpoint. Auth = per-device bearer token
# issued at activation. Uses only stdlib urllib so the binary bundles cleanly.
import urllib.request
import urllib.error

CLOUD_CONFIG_PATH = os.path.join(CONFIG_DIR, "cloud.json")
SYNC_INTERVAL = 30          # seconds between upload attempts
SYNC_BATCH = 200            # rows per request (server cap is 500)

cloud_lock = threading.Lock()
CLOUD = {"cloud_url": None, "device_token": None, "activated": False, "revoked": False}


def load_cloud_config():
    # Device token preferentially from OS keyring; URL + flags from cloud.json.
    token = None
    if HAS_KEYRING:
        try:
            token = keyring.get_password("CivilMantra", "device_token")
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
            keyring.set_password("CivilMantra", "device_token", device_token)
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
        "ai_label": "anomaly" if anomalous else "normal",
        "anomaly_flag": bool(anomalous),
    }


def cloud_post(url, token, payload):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as resp:
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
    try:
        status, _ = cloud_post(ingest_url, token, {"samples": samples})
        if status == 200:
            mark_synced([r[0] for r in rows])
            return len(rows), 200
        return 0, status
    except urllib.error.HTTPError as e:
        if e.code == 403:
            # Device revoked (e.g. employee withdrew consent) -> stop collecting.
            print("[Cloud] Device revoked by server. Halting telemetry collection.")
            with cloud_lock:
                CLOUD["activated"] = False
                CLOUD["revoked"] = True
            save_cloud_config(url, token, revoked=True)
        return 0, e.code
    except (urllib.error.URLError, OSError) as e:
        # Offline / unreachable: keep rows buffered, retry next cycle.
        print(f"[Cloud] Sync deferred (offline): {e}")
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
    
    for line in output.split("\n"):
        match = re.search(r"id=(\d+)", line)
        if match:
            dev_id = int(match.group(1))
            if "Virtual core" in line:
                continue
            if "keyboard" in line.lower():
                keyboards.append(dev_id)
            elif "mouse" in line.lower() or "pointer" in line.lower() or "pointer" in line:
                pointers.append(dev_id)
                
    return list(set(keyboards)), list(set(pointers))

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
            bufsize=1
        )
    except Exception as e:
        print(f"Failed to start xinput test for device {device_id}: {e}")
        return
        
    for line in proc.stdout:
        with stats_lock:
            if "key press" in line.lower():
                keystroke_count += 1
            elif "motion" in line.lower() or "button press" in line.lower():
                mouse_count += 1
                
    proc.wait()

# Hotplug discovery thread
def device_discovery_loop():
    global monitored_device_ids
    while True:
        keyboards, pointers = get_device_ids()
        all_devices = keyboards + pointers
        
        for dev_id in all_devices:
            if dev_id not in monitored_device_ids:
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

if __name__ == "__main__":
    print(f"Initializing Civil Mantra: Local Telemetry Daemon (Platform: {sys.platform})...")
    acquire_lock()
    
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
        release_lock()
        sys.exit(0)
