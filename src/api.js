// src/api.js — typed-ish client for the ChronoTrack backend.
// Single source of truth for every server call; replaces localStorage-as-DB and
// the cloud simulator. Token is held in localStorage under `ct_token`.

const BASE = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = 'ct_token';
const USER_KEY = 'ct_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data;
}

// --- Auth ----------------------------------------------------------------
export const auth = {
  async login(email, password) {
    const data = await request('POST', '/api/auth/login', { email, password });
    setSession(data.token, data.user);
    return data.user;
  },
  me() {
    return request('GET', '/api/auth/me');
  },
  updateProfile(patch) {
    // { name?, current_password?, new_password? }
    return request('PATCH', '/api/auth/me', patch).then((d) => d.user);
  },
  logout() {
    clearSession();
  },
};

// --- Users / org ---------------------------------------------------------
export const users = {
  list() {
    return request('GET', '/api/users').then((d) => d.users);
  },
  create(payload) {
    // { name, email, role: 'lead'|'employee', password?, hourly_cost?, team_lead_id? }
    return request('POST', '/api/users', payload).then((d) => d.user);
  },
  update(id, patch) {
    return request('PATCH', `/api/users/${id}`, patch).then((d) => d.user);
  },
  remove(id) {
    return request('DELETE', `/api/users/${id}?hard=1`);
  },
  disable(id) {
    return request('DELETE', `/api/users/${id}`);
  },
};

// --- Projects ------------------------------------------------------------
export const projects = {
  list() {
    return request('GET', '/api/projects').then((d) => d.projects);
  },
  create(payload) {
    return request('POST', '/api/projects', payload).then((d) => d.project);
  },
  update(id, patch) {
    return request('PATCH', `/api/projects/${id}`, patch).then((d) => d.project);
  },
  archive(id) {
    return request('DELETE', `/api/projects/${id}`);
  },
  // Multi-project assignment management.
  assignments(id) {
    return request('GET', `/api/projects/${id}?action=assignments`).then((d) => d.assignments);
  },
  assign(id, userId) {
    return request('POST', `/api/projects/${id}?action=assign`, { user_id: userId });
  },
  unassign(id, userId) {
    return request('DELETE', `/api/projects/${id}?action=unassign&user_id=${userId}`);
  },
};

// --- Activation (provisioning console) -----------------------------------
export const activation = {
  // Admin/lead mints an 8-digit code for an employee. Code shown ONCE.
  generate(userId) {
    return request('POST', '/api/activation?action=generate', { user_id: userId });
  },
  // Desktop activation (used by the agent, not the dashboard) — here for completeness.
  verify(payload) {
    return request('POST', '/api/activation?action=verify', payload);
  },
};

// --- Time entries (ROI attribution) --------------------------------------
export const timeEntries = {
  list() {
    return request('GET', '/api/time-entries').then((d) => d.entries);
  },
  create(payload) {
    return request('POST', '/api/time-entries', payload).then((d) => d.entry);
  },
};

// --- Analytics (real telemetry + time entries) ---------------------------
export const analytics = {
  overview(days = 7) {
    return request('GET', `/api/analytics?scope=overview&days=${days}`);
  },
  team(days = 7) {
    return request('GET', `/api/analytics?scope=team&days=${days}`);
  },
  employee(userId, days = 7) {
    const q = userId ? `&user_id=${userId}` : '';
    return request('GET', `/api/analytics?scope=employee&days=${days}${q}`);
  },
  // Day's tracked active blocks + already-allocated entries + assigned projects.
  timeline(day, userId) {
    const q = new URLSearchParams({ scope: 'timeline' });
    if (day) q.set('day', day);
    if (userId) q.set('user_id', userId);
    return request('GET', `/api/analytics?${q.toString()}`);
  },
};

// --- Productivity rules --------------------------------------------------
export const rules = {
  list() {
    return request('GET', '/api/reports?kind=rules').then((d) => d.rules);
  },
  add(keyword, category) {
    return request('POST', '/api/reports?kind=rules', { keyword, category }).then((d) => d.rule);
  },
  remove(id) {
    return request('DELETE', `/api/reports?kind=rules&id=${id}`);
  },
};

// --- Audit log + telemetry feed ------------------------------------------
export const auditLogs = {
  list() {
    return request('GET', '/api/reports?kind=audit').then((d) => d.logs);
  },
};
export const telemetryFeed = {
  list(limit = 50) {
    return request('GET', `/api/reports?kind=telemetry&limit=${limit}`).then((d) => d.feed);
  },
};
export const dataRights = {
  export(userId) {
    const q = userId ? `&user_id=${userId}` : '';
    return request('GET', `/api/reports?kind=export${q}`);
  },
  purge(userId) {
    return request('DELETE', `/api/reports?kind=purge&user_id=${userId}`);
  },
};

// --- Consent (DPDP) ------------------------------------------------------
export const consent = {
  status() {
    return request('GET', '/api/consent').then((d) => d.consent);
  },
  withdraw() {
    return request('DELETE', '/api/consent');
  },
};

export default { auth, users, projects, activation, timeEntries, consent, analytics, rules, auditLogs, telemetryFeed, dataRights, getUser, getToken, clearSession };
