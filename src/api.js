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
};

// --- Activation (provisioning console) -----------------------------------
export const activation = {
  // Admin/lead mints an 8-digit code for an employee. Code shown ONCE.
  generate(userId) {
    return request('POST', '/api/activation/generate', { user_id: userId });
  },
  // Desktop activation (used by the agent, not the dashboard) — here for completeness.
  verify(payload) {
    return request('POST', '/api/activation/verify', payload);
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

// --- Consent (DPDP) ------------------------------------------------------
export const consent = {
  status() {
    return request('GET', '/api/consent').then((d) => d.consent);
  },
  withdraw() {
    return request('DELETE', '/api/consent');
  },
};

export default { auth, users, projects, activation, timeEntries, consent, getUser, getToken, clearSession };
