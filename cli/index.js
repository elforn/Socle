#!/usr/bin/env node
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCAFFOLD_DIR = path.join(ROOT, 'scaffold');
const CORE_DIR = path.join(ROOT, 'core');
const MODULES_DIR = path.join(ROOT, 'modules');

const TEXT_EXTS = new Set(['.js', '.json', '.html', '.md', '.yml', '.yaml', '.css', '.txt', '.template']);

// ── pure helpers (exported for tests) ────────────────────────────────────────

export function replaceTokens(content, map) {
  return Object.entries(map).reduce((s, [k, v]) => s.replaceAll(`%%${k}%%`, v), content);
}

export function replaceBlockTokens(content, map) {
  return Object.entries(map).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), content);
}

function isTextFile(filepath) {
  return TEXT_EXTS.has(path.extname(filepath)) || path.basename(filepath) === '.gitignore';
}

function toTitleCase(str) {
  return str.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function walkText(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkText(full, fn);
    else if (isTextFile(full)) fn(full);
  }
}

function patchAccentColor(tokensPath, color) {
  const content = fs.readFileSync(tokensPath, 'utf8');
  fs.writeFileSync(tokensPath, content.replace(/--color-accent:\s*[^;]+;/, `--color-accent: ${color};`));
}

function readAccentColor(tokensPath) {
  if (!fs.existsSync(tokensPath)) return null;
  const m = fs.readFileSync(tokensPath, 'utf8').match(/--color-accent:\s*([^;]+);/);
  return m ? m[1].trim() : null;
}

// ── scaffoldApp (exported for tests) ─────────────────────────────────────────

export function scaffoldApp(options, destDir) {
  const { appName, appShortName, appDescription, githubUser, includeSync, accentColor, version } = options;

  fs.cpSync(SCAFFOLD_DIR, destDir, {
    recursive: true,
    filter: src => !src.endsWith('.DS_Store'),
  });

  const tokenMap = {
    APP_NAME: appName,
    APP_SHORT_NAME: appShortName,
    APP_DESCRIPTION: appDescription,
    LANG: 'en',
    GITHUB_USER: githubUser,
  };

  walkText(destDir, file => {
    if (file.endsWith('CLAUDE.md.template')) return;
    const content = fs.readFileSync(file, 'utf8');
    const replaced = replaceTokens(content, tokenMap);
    if (replaced !== content) fs.writeFileSync(file, replaced);
  });

  const templatePath = path.join(destDir, 'CLAUDE.md.template');
  const modules = ['core', 'gestures', ...(includeSync ? ['sync'] : [])];
  const blockMap = {
    APP_NAME: appName,
    APP_DESCRIPTION: appDescription,
    LIB_VERSION: version,
    SCAFFOLDED_DATE: new Date().toISOString().split('T')[0],
    MODULES: modules.join(', '),
    ACCENT_COLOR: accentColor,
  };
  fs.writeFileSync(path.join(destDir, 'CLAUDE.md'), replaceBlockTokens(fs.readFileSync(templatePath, 'utf8'), blockMap));
  fs.rmSync(templatePath);

  fs.mkdirSync(path.join(destDir, '_lib', 'modules'), { recursive: true });
  fs.cpSync(CORE_DIR, path.join(destDir, '_lib', 'core'), { recursive: true });
  fs.cpSync(path.join(MODULES_DIR, 'gestures'), path.join(destDir, '_lib', 'modules', 'gestures'), { recursive: true });
  if (includeSync) {
    fs.cpSync(path.join(MODULES_DIR, 'sync'), path.join(destDir, '_lib', 'modules', 'sync'), { recursive: true });
  }

  fs.writeFileSync(
    path.join(destDir, '_lib', 'lib-version.json'),
    JSON.stringify({ version, modules, scaffolded: new Date().toISOString().split('T')[0] }, null, 2) + '\n'
  );

  patchAccentColor(path.join(destDir, '_lib', 'core', 'styles', 'tokens.css'), accentColor);
}

// ── updateLib (exported for tests) ───────────────────────────────────────────

export async function updateLib(projectDir, ask) {
  const libVersionPath = path.join(projectDir, '_lib', 'lib-version.json');
  if (!fs.existsSync(libVersionPath)) {
    throw new Error('No _lib/lib-version.json found. Run this from a Socle project root.');
  }

  const current = JSON.parse(fs.readFileSync(libVersionPath, 'utf8'));
  const { version: latest } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  if (current.version === latest) {
    console.log(`Already up to date (${latest}).`);
    return;
  }

  console.log(`Socle update: ${current.version} → ${latest}`);

  try {
    const modified = execSync('git diff --name-only _lib/', { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
    if (modified) {
      console.log('\nLocally modified _lib/ files:');
      modified.split('\n').forEach(f => console.log(`  ${f}`));
      const answer = await ask('\nThese will be overwritten. Continue? [y/N]: ');
      if (!answer.trim().toLowerCase().startsWith('y')) { console.log('Aborted.'); return; }
    }
  } catch { /* git unavailable or not a repo — skip check */ }

  const tokensPath = path.join(projectDir, '_lib', 'core', 'styles', 'tokens.css');
  const preservedAccent = readAccentColor(tokensPath);

  console.log('\nUpdating _lib/...');
  fs.rmSync(path.join(projectDir, '_lib', 'core'), { recursive: true, force: true });
  fs.cpSync(CORE_DIR, path.join(projectDir, '_lib', 'core'), { recursive: true });
  console.log('  ✔ _lib/core updated');

  for (const mod of current.modules.filter(m => m !== 'core')) {
    const modSrc = path.join(MODULES_DIR, mod);
    if (fs.existsSync(modSrc)) {
      fs.rmSync(path.join(projectDir, '_lib', 'modules', mod), { recursive: true, force: true });
      fs.cpSync(modSrc, path.join(projectDir, '_lib', 'modules', mod), { recursive: true });
      console.log(`  ✔ _lib/modules/${mod} updated`);
    }
  }

  if (preservedAccent) patchAccentColor(tokensPath, preservedAccent);

  fs.writeFileSync(libVersionPath, JSON.stringify({ ...current, version: latest }, null, 2) + '\n');
  console.log(`  ✔ lib-version.json updated to ${latest}`);

  console.log(`\nDone. Review the changelog, then commit:`);
  console.log(`  git add _lib/ && git commit -m "chore: update socle to ${latest}"`);
}

// ── interactive runners ───────────────────────────────────────────────────────

function makeAsk(rl) {
  return q => new Promise(resolve => rl.question(q, resolve));
}

async function runScaffold(dirArg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = makeAsk(rl);

  let dirName = dirArg?.trim();
  if (!dirName) dirName = (await ask('App directory name: ')).trim();
  if (!dirName) { console.error('Directory name is required.'); rl.close(); process.exit(1); }

  const destDir = path.resolve(process.cwd(), dirName);
  if (fs.existsSync(destDir) && fs.readdirSync(destDir).length > 0) {
    console.error(`Error: Directory '${dirName}' already exists and is not empty.`);
    rl.close();
    process.exit(1);
  }

  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  console.log(`\nWelcome to Socle ${version}`);
  console.log(`Creating a new app in ./${dirName}\n`);

  const defaultName = toTitleCase(dirName);
  const appName        = (await ask(`App name [${defaultName}]: `)).trim() || defaultName;
  const appShortName   = (await ask(`App short name [${appName}]: `)).trim() || appName;
  const appDescription = (await ask('App description [A PWA built with Socle]: ')).trim() || 'A PWA built with Socle';
  const githubUser     = (await ask('GitHub username [your-username]: ')).trim() || 'your-username';
  const syncAnswer     = (await ask('Include sync module? [y/N]: ')).trim().toLowerCase();
  const includeSync    = syncAnswer === 'y' || syncAnswer === 'yes';
  const accentColor    = (await ask('Accent color (hex) [#E8824A]: ')).trim() || '#E8824A';

  rl.close();

  console.log('\nScaffolding...');
  scaffoldApp({ appName, appShortName, appDescription, githubUser, includeSync, accentColor, version }, destDir);

  console.log('  ✔ app/ structure created');
  console.log('  ✔ tests/ and utils/ copied');
  console.log('  ✔ index.html, manifest.json generated');
  console.log('  ✔ _lib/core copied');
  console.log('  ✔ _lib/modules/gestures copied');
  if (includeSync) console.log('  ✔ _lib/modules/sync copied');
  console.log('  ✔ _lib/lib-version.json written');
  console.log(`  ✔ Accent colour set to ${accentColor}`);
  console.log('  ✔ CLAUDE.md generated');

  console.log(`\nYour app is ready in ./${dirName}\n`);
  console.log('Next steps:');
  console.log(`  cd ${dirName}`);
  console.log('  npm install');
  console.log(`  git init && git add . && git commit -m "chore: scaffold from socle ${version}"`);
  console.log('  npm run build');
  console.log('  npm run serve');
}

async function runUpdate() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await updateLib(process.cwd(), makeAsk(rl));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    rl.close();
    process.exit(1);
  }
  rl.close();
}

// ── entry ─────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [,, cmd] = process.argv;
  (cmd === 'update' ? runUpdate() : runScaffold(cmd))
    .catch(e => { console.error(e.message); process.exit(1); });
}
