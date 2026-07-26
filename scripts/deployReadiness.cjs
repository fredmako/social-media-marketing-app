#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const here = 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\social-marketing-app';
const checks = [];

function check(label, fn) {
  try {
    const result = fn();
    checks.push({ label, ok: !!result, detail: result ? 'ok' : 'missing/empty' });
  } catch (e) {
    checks.push({ label, ok: false, detail: String(e) });
  }
}

// 1) Top-level deploy files
check('vercel.json', () => {
  const f = path.join(here, 'vercel.json');
  return fs.existsSync(f);
});
check('client/package.json', () => {
  const f = path.join(here, 'client', 'package.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).name : null;
});
check('server/package.json', () => {
  const f = path.join(here, 'server', 'package.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).name : null;
});

// 2) Client src structure
check('client/src exists', () => fs.existsSync(path.join(here, 'client', 'src')));
check('client/src/main.tsx', () => fs.existsSync(path.join(here, 'client', 'src', 'main.tsx')));
check('client/src/App.tsx', () => fs.existsSync(path.join(here, 'client', 'src', 'App.tsx')));

// 3) Build prerequisites
const vercel = path.join(here, 'vercel.json');
if (fs.existsSync(vercel)) {
  const cfg = JSON.parse(fs.readFileSync(vercel, 'utf8'));
  check('vercel buildCommand', () => cfg.buildCommand || null);
  check('vercel outputDirectory', () => cfg.outputDirectory || null);
  check('vercel nodeVersion', () => cfg.nodeVersion || null);
}

// 4) Common App.tsx runtime/build gotchas
const appPath = path.join(here, 'client', 'src', 'App.tsx');
let badHeader = null;
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  badHeader = content.includes("Authorization: ***") || content.includes("Authorization: `");
}
checks.push({ label: 'App.tsx bad auth header', ok: !badHeader, detail: badHeader ? 'bad syntax found' : 'ok' });

// 5) Server auth route
const serverPath = path.join(here, 'server', 'src', 'server.ts');
let hasVerify = null;
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  hasVerify = serverContent.includes('/auth/verify');
}
checks.push({ label: 'server.auth.verify route', ok: !!hasVerify, detail: hasVerify ? 'ok' : 'missing' });

for (const c of checks) {
  console.log((c.ok ? 'PASS' : 'FAIL') + ' ' + c.label + ': ' + c.detail);
}
process.exit(checks.some((c) => !c.ok) ? 1 : 0);
