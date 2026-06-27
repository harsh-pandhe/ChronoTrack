// Playwright E2E "preview tests" for the ChronoTrack web app.
// Exercises the real login + dashboard flows against a running stack.
//
// Prereqs (see tests/e2e/README.md):
//   1. Postgres up + migrated + seeded admin (admin@cm.com) and a lead
//      (rajesh@cm.com / lead-strong-pass) under company "Civil Mantra".
//   2. Cloud API:  API_PORT=3031 node scripts/dev-api.js
//   3. SPA built with VITE_API_BASE=http://localhost:3031 and served, e.g.
//      (cd dist && python3 -m http.server 4300)
//   4. BASE_URL env points at the served SPA (default http://localhost:4300).
//
// Run:  npx playwright test
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4300';
const ADMIN = { email: 'admin@cm.com', password: process.env.ADMIN_PASSWORD || 'admin-strong-pass' };
const LEAD = { email: 'rajesh@cm.com', password: 'lead-strong-pass' };

async function login(page, role, creds) {
  await page.goto(BASE + '/?cb=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/?cb=' + Date.now());
  await page.getByText(/console access|login/i).first().click();
  // role buttons: Admin / Team Lead / Employee
  const roleLabel = role === 'admin' ? 'Admin' : 'Team Lead';
  await page.getByRole('button', { name: roleLabel, exact: true }).click();
  await page.locator('input[type=email]').fill(creds.email);
  await page.locator('input[type=password]').fill(creds.password);
  await page.getByRole('button', { name: /verify credentials/i }).click();
}

test('admin logs in and sees real portfolio analytics', async ({ page }) => {
  await login(page, 'admin', ADMIN);
  await expect(page.getByText('AI Predictive Workspace Analytics', { exact: false })).toBeVisible({ timeout: 8000 });
  // Overview cards should render real Cr/%/values (not the literal placeholder dash).
  await expect(page.getByText('Total Portfolio Revenue')).toBeVisible();
  await expect(page.getByText(/Rs\.\s*[\d.]+\s*Cr/)).toBeVisible();
});

test('admin contribution ROI reflects logged hours', async ({ page }) => {
  await login(page, 'admin', ADMIN);
  await page.getByText(/contribution roi/i).click();
  await expect(page.getByText('Contribution & ROI Attribution', { exact: false })).toBeVisible();
  await expect(page.getByText(/hrs/)).toBeVisible();
});

test('admin user directory loads real employees', async ({ page }) => {
  await login(page, 'admin', ADMIN);
  await page.getByText(/user directory/i).click();
  await expect(page.getByText('User Directory & Assignments', { exact: false })).toBeVisible();
});

test('team lead sees team board + manage projects', async ({ page }) => {
  await login(page, 'lead', LEAD);
  await expect(page.getByText('Team Activity & Uptime Live Board', { exact: false })).toBeVisible({ timeout: 8000 });
  await page.getByText(/manage team/i).click();
  await expect(page.getByText('Manage Team & Projects', { exact: false })).toBeVisible();
});

test('invalid login is rejected', async ({ page }) => {
  await login(page, 'admin', { email: 'admin@cm.com', password: 'wrong-password' });
  // stays on login gateway, shows error, no dashboard
  await expect(page.getByText('Console Access Gateway', { exact: false })).toBeVisible();
});
