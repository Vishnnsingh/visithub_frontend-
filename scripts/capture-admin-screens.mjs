/**
 * Captures real org-admin dashboard screens for the landing carousel.
 * Run: node scripts/capture-admin-screens.mjs
 * Needs: frontend on :5173, backend on :5000, playwright chromium installed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/landing/admin');
const base = process.env.LANDING_BASE || 'http://localhost:5173';
const api = process.env.LANDING_API || 'http://localhost:5000/api/v1';

const PAGES = [
  { file: 'dashboard.png', path: '/dashboard', title: 'Dashboard' },
  { file: 'staff.png', path: '/staff', title: 'Add Staff' },
  { file: 'organisation.png', path: '/organisation', title: 'Organisation' },
  { file: 'qr-codes.png', path: '/qr-codes', title: 'QR Codes' },
  { file: 'visitor-details.png', path: '/visitor-details', title: 'Visitor details' },
  { file: 'tickets.png', path: '/tickets', title: 'Tickets' },
  { file: 'notifications.png', path: '/notifications', title: 'Notifications' },
  { file: 'home-element.png', path: '/home-element', title: 'Home Element' },
  { file: 'active-fields.png', path: '/active-fields', title: 'Active Fields' },
];

fs.mkdirSync(outDir, { recursive: true });

const loginRes = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'vs703252@gmail.com', password: '12345678' }),
});
const loginJson = await loginRes.json();
if (!loginJson?.success) {
  console.error('Login failed', loginJson);
  process.exit(1);
}

const { token, user } = loginJson.data;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(
  ({ token, user }) => {
    localStorage.setItem('kavion-auth', JSON.stringify({ state: { token, user }, version: 0 }));
  },
  { token, user }
);

for (const item of PAGES) {
  const url = `${base}${item.path}`;
  console.log('Capturing', item.title, url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const target = path.join(outDir, item.file);
  await page.screenshot({ path: target, fullPage: false });
  console.log('Saved', target);
}

await browser.close();
console.log('Done');
