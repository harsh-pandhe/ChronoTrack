// scripts/dev-api.js — local dev API server mounting all api/* handlers (no Vercel).
// Mirrors the file-based routing so the SPA can hit /api/* in development.
import http from 'http';

import login from '../api/auth/login.js';
import me from '../api/auth/me.js';
import usersIndex from '../api/users/index.js';
import userById from '../api/users/[id].js';
import projectsIndex from '../api/projects/index.js';
import projectById from '../api/projects/[id].js';
import activationGenerate from '../api/activation/generate.js';
import activationVerify from '../api/activation/verify.js';
import ingest from '../api/ingest.js';
import timeEntries from '../api/time-entries.js';
import consent from '../api/consent.js';

const routes = [
  [/^\/api\/auth\/login$/, login],
  [/^\/api\/auth\/me$/, me],
  [/^\/api\/users$/, usersIndex],
  [/^\/api\/users\/([^/]+)$/, userById, 'id'],
  [/^\/api\/projects$/, projectsIndex],
  [/^\/api\/projects\/([^/]+)$/, projectById, 'id'],
  [/^\/api\/activation\/generate$/, activationGenerate],
  [/^\/api\/activation\/verify$/, activationVerify],
  [/^\/api\/ingest$/, ingest],
  [/^\/api\/time-entries$/, timeEntries],
  [/^\/api\/consent$/, consent],
];

const port = Number(process.env.API_PORT || 3001);
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    for (const [re, fn, param] of routes) {
      const m = url.pathname.match(re);
      if (m) {
        req.query = {};
        if (param) req.query[param] = m[1];
        return fn(req, res);
      }
    }
    res.statusCode = 404;
    res.end('{"error":"not found"}');
  })
  .listen(port, () => console.log(`dev-api on http://localhost:${port}`));
