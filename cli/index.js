#!/usr/bin/env node
import readline from 'readline';
import fs, { realpathSync } from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { createServer } from 'http';
import os from 'os';
import { fileURLToPath } from 'url';
import { multiSelect, singleSelect } from './prompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCAFFOLD_DIR = path.join(ROOT, 'scaffold');
const CORE_DIR = path.join(ROOT, 'core');
const MODULES_DIR = path.join(ROOT, 'modules');

const TEXT_EXTS = new Set(['.js', '.json', '.html', '.md', '.yml', '.yaml', '.css', '.txt', '.template']);

const MODULE_OPTIONS = [
  { label: 'Gesture library',      value: 'gestures',     description: 'Tap, swipe, hold-drag' },
  { label: 'Sync (export/import)', value: 'sync',         description: 'Export & import backup files' },
  { label: 'Image handling',       value: 'images',       description: 'Compress and store photos' },
  { type: 'separator', label: 'UI' },
  { label: 'App header',           value: 'app-header',   description: 'Sticky header, safe area' },
  { label: 'Modal dialog',         value: 'modal-dialog', description: 'Sheet and dialog component' },
  { label: 'Toast notifications',  value: 'toast',        description: 'Ephemeral feedback messages' },
  { label: 'Drag-to-reorder',      value: 'reorder',      description: 'Keyed list reorder controller' },
  { label: 'P2P sync',             value: 'p2p', disabled: true, hint: 'coming in V2' },
];

const VALID_MODULES = ['gestures', 'sync', 'images', 'app-header', 'modal-dialog', 'toast', 'reorder', 'ui', 'p2p'];

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

function _semverLt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return true;
    if (pa[i] > pb[i]) return false;
  }
  return false;
}

export function findModuleImports(appDir, moduleName) {
  const pattern = `_lib/modules/${moduleName}/`;
  const results = [];
  if (!fs.existsSync(appDir)) return results;
  for (const entry of fs.readdirSync(appDir, { recursive: true })) {
    if (!entry.endsWith('.js')) continue;
    const full = path.join(appDir, entry);
    if (fs.statSync(full).isFile() && fs.readFileSync(full, 'utf8').includes(pattern)) {
      results.push(entry);
    }
  }
  return results;
}

// ── token value builders ──────────────────────────────────────────────────────

function buildTokenMap(options) {
  const {
    appName, appShortName, appDescription, githubUser, version, port,
    includeGestures, includeSync, includeImages,
    includeAppHeader, includeModal, includeToast,
    storeType = 'event-log',
    exportExt = '.data',
  } = options;

  // HP_* tokens are placed FIRST so that any %%APP_NAME%% they contain
  // gets substituted when APP_NAME is processed in the same pass.
  const HP_TOAST_IMPORT = includeToast
    ? "import { toast } from '../../_lib/modules/toast/toast.js';"
    : '';

  const HP_GESTURE_IMPORT = includeGestures
    ? "import { Gestures } from '../../_lib/modules/gestures/gestures.js';"
    : '';

  const HP_GESTURE_CSS = includeGestures ? [
    '        .bar-wrapper {',
    '          block-size: 52px;',
    '          background: var(--color-border);',
    '          border-radius: var(--radius-md);',
    '          position: relative;',
    '          overflow: hidden;',
    '          cursor: grab;',
    '          user-select: none;',
    '          touch-action: none;',
    '        }',
    '        .bar-wrapper.hold-active { cursor: grabbing; }',
    '        .fill {',
    '          block-size: 100%;',
    '          inline-size: var(--pct, 0%);',
    '          background: var(--color-accent);',
    '          transition: inline-size 0.1s;',
    '          border-radius: var(--radius-md);',
    '        }',
    '        .bar-wrapper.hold-active .fill { transition: none; }',
    '        .pct-label {',
    '          position: absolute;',
    '          inset: 0;',
    '          display: flex;',
    '          align-items: center;',
    '          padding-inline: var(--space-3);',
    '          font-weight: var(--font-weight-bold);',
    '          color: var(--color-text-primary);',
    '          pointer-events: none;',
    '        }',
  ].join('\n') : '';

  const HP_MODAL_BTN = includeModal
    ? "            <button class=\"secondary\" id=\"modal-btn\">Info modal</button>"
    : '';

  const HP_MODAL_ELEMENT = includeModal ? [
    '',
    '        <modal-dialog id="demo-modal">',
    '          <p>Replace this modal with your app\'s content.</p>',
    '          <button slot="footer" class="primary" id="modal-close-btn">Close</button>',
    '        </modal-dialog>',
  ].join('\n') : '';

  const HP_GESTURE_SECTION = includeGestures ? [
    '',
    '        <section class="card">',
    '          <h2>Gesture demo</h2>',
    '          <p>Hold and drag the bar to adjust the value.</p>',
    '          <div class="bar-wrapper" id="gesture-bar">',
    '            <div class="fill" id="gesture-fill"></div>',
    '            <span class="pct-label" id="gesture-pct">0%</span>',
    '          </div>',
    '        </section>',
  ].join('\n') : '';

  const HP_SYNC_SECTION = includeSync ? [
    '',
    '        <section class="card">',
    '          <h2>Data sync</h2>',
    '          <p>Export your data for backup or to transfer to another device.</p>',
    '          <div class="actions">',
    '            <button class="secondary" id="export-btn">Export backup</button>',
    '            <button class="secondary" id="import-btn">Import</button>',
    '          </div>',
    '          <input type="file" accept="%%EXPORT_EXT%%,.json" id="sync-file-input" hidden />',
    '        </section>',
  ].join('\n') : '';

  const HP_TOAST_DISPATCH = includeToast
    ? "      toast('Entry saved', 'success');"
    : '';

  const HP_MODAL_SUBSCRIBE = includeModal ? [
    "    this._onModalOpen  = () => sr.querySelector('#demo-modal').show();",
    "    this._onModalClose = () => sr.querySelector('#demo-modal').close();",
    "    sr.querySelector('#modal-btn').addEventListener('click', this._onModalOpen);",
    "    sr.querySelector('#modal-close-btn').addEventListener('click', this._onModalClose);",
    '',
  ].join('\n') : '';

  const HP_MODAL_UNSUBSCRIBE = includeModal ? [
    "    sr.querySelector('#modal-btn')?.removeEventListener('click', this._onModalOpen);",
    "    sr.querySelector('#modal-close-btn')?.removeEventListener('click', this._onModalClose);",
  ].join('\n') : '';

  const HP_GESTURE_SUBSCRIBE = includeGestures ? [
    "    const _bar  = sr.querySelector('#gesture-bar');",
    "    const _fill = sr.querySelector('#gesture-fill');",
    "    const _lbl  = sr.querySelector('#gesture-pct');",
    "    this._gestureCleanup = Gestures.attach(_bar, {",
    "      onHoldDragStart: () => _bar.classList.add('hold-active'),",
    '      onHoldDrag: e => {',
    '        const rect = _bar.getBoundingClientRect();',
    '        const pct  = Math.round(Math.max(0, Math.min(100, (e.endX - rect.left) / rect.width * 100)));',
    "        _fill.style.setProperty('--pct', pct + '%');",
    "        _lbl.textContent = pct + '%';",
    '      },',
    "      onHoldDragEnd: () => _bar.classList.remove('hold-active'),",
    '      onHoldDragKey: dir => {',
    "        const cur = parseFloat(_fill.style.getPropertyValue('--pct') || '0');",
    "        const pct = Math.round(Math.max(0, Math.min(100, cur + (dir === 'right' ? 5 : -5))));",
    "        _fill.style.setProperty('--pct', pct + '%');",
    "        _lbl.textContent = pct + '%';",
    '      },',
    '    });',
    '',
  ].join('\n') : '';

  const HP_GESTURE_UNSUBSCRIBE = includeGestures
    ? "    this._gestureCleanup?.();"
    : '';

  const toastCall = includeToast ? "\n      toast('Backup ready', 'success');" : '';
  const toastImportCall = includeToast ? "\n      toast('Imported ' + result.eventsAdded + ' event' + (result.eventsAdded === 1 ? '' : 's'), 'success');" : '';
  const HP_SYNC_SUBSCRIBE = includeSync ? [
    '    this._onExport = async () => {',
    "      const { exportData, downloadExport } = await import('../../_lib/modules/sync/sync.js');",
    '      const data = await exportData();',
    "      downloadExport(data, '%%APP_NAME%%-backup%%EXPORT_EXT%%');" + toastCall,
    '    };',
    "    this._onImportClick = () => sr.querySelector('#sync-file-input').click();",
    '    this._onFileChange = async e => {',
    '      const file = e.target.files[0];',
    '      if (!file) return;',
    "      const { readImportFile, importData } = await import('../../_lib/modules/sync/sync.js');",
    '      const payload = await readImportFile(file);',
    '      const result  = await importData(payload);' + toastImportCall,
    "      e.target.value = '';",
    '    };',
    "    sr.querySelector('#export-btn').addEventListener('click', this._onExport);",
    "    sr.querySelector('#import-btn').addEventListener('click', this._onImportClick);",
    "    sr.querySelector('#sync-file-input').addEventListener('change', this._onFileChange);",
    '',
  ].join('\n') : '';

  const HP_SYNC_UNSUBSCRIBE = includeSync ? [
    "    sr.querySelector('#export-btn')?.removeEventListener('click', this._onExport);",
    "    sr.querySelector('#import-btn')?.removeEventListener('click', this._onImportClick);",
    "    sr.querySelector('#sync-file-input')?.removeEventListener('change', this._onFileChange);",
  ].join('\n') : '';

  const HP_IMAGES_IMPORT = includeImages
    ? "import { compressImage } from '../../_lib/modules/images/images.js';"
    : '';

  const HP_IMAGES_CSS = includeImages ? [
    '        .img-preview {',
    '          border-radius: var(--radius-md);',
    '          overflow: hidden;',
    '          background: var(--color-surface-raised);',
    '          min-block-size: 120px;',
    '          display: flex;',
    '          align-items: center;',
    '          justify-content: center;',
    '          color: var(--color-text-secondary);',
    '          font-size: var(--font-size-caption);',
    '        }',
    '        .img-preview img { max-inline-size: 100%; display: block; }',
    '        .img-meta { font-size: var(--font-size-caption); color: var(--color-text-secondary); }',
  ].join('\n') : '';

  const HP_IMAGES_SECTION = includeImages ? [
    '',
    '        <section class="card">',
    '          <h2>Images</h2>',
    '          <p>Pick an image to compress and store it locally.</p>',
    '          <div class="img-preview" id="img-preview">No image yet</div>',
    '          <p class="img-meta" id="img-meta" hidden></p>',
    '          <div class="actions">',
    '            <button class="secondary" id="img-pick-btn">Pick image</button>',
    '          </div>',
    '          <input type="file" accept="image/*" id="img-file-input" hidden />',
    '        </section>',
  ].join('\n') : '';

  const imgToastCall = includeToast ? "\n      toast('Image saved', 'success');" : '';
  const HP_IMAGES_SUBSCRIBE = includeImages ? [
    "    this._onImgPick = () => sr.querySelector('#img-file-input').click();",
    '    this._onImgFile = async e => {',
    '      const file = e.target.files[0];',
    '      if (!file) return;',
    '      const blob = await compressImage(file, { maxWidth: 1200, quality: 0.8 });',
    '      const id   = crypto.randomUUID();',
    '      await Store.attachBlob(id, blob);',
    '      const url     = URL.createObjectURL(blob);',
    "      const preview = sr.querySelector('#img-preview');",
    "      const img = document.createElement('img');",
    "      img.src = url; img.alt = 'Compressed image';",
    "      preview.textContent = '';",
    "      preview.appendChild(img);",
    "      sr.querySelector('#img-meta').hidden = false;",
    "      sr.querySelector('#img-meta').textContent = Math.round(blob.size / 1024) + ' KB';" + imgToastCall,
    "      e.target.value = '';",
    '    };',
    "    sr.querySelector('#img-pick-btn').addEventListener('click', this._onImgPick);",
    "    sr.querySelector('#img-file-input').addEventListener('change', this._onImgFile);",
    '',
  ].join('\n') : '';

  const HP_IMAGES_UNSUBSCRIBE = includeImages ? [
    "    sr.querySelector('#img-pick-btn')?.removeEventListener('click', this._onImgPick);",
    "    sr.querySelector('#img-file-input')?.removeEventListener('change', this._onImgFile);",
  ].join('\n') : '';

  const HP_TOAST_SECTION = includeToast ? [
    '',
    '        <section class="card">',
    '          <h2>Toasts</h2>',
    '          <p>Ephemeral feedback messages with optional actions.</p>',
    '          <div class="actions">',
    '            <button class="primary" id="toast-info-btn">Info</button>',
    '            <button class="secondary" id="toast-action-btn">With action</button>',
    '          </div>',
    '        </section>',
  ].join('\n') : '';

  const HP_TOAST_SUBSCRIBE = includeToast ? [
    "    this._onToastInfo   = () => toast('Info message', 'info');",
    "    this._onToastAction = () => toast('Item deleted', 'info', { action: { label: 'Undo', onClick: () => toast('Restored', 'success') } });",
    "    sr.querySelector('#toast-info-btn').addEventListener('click', this._onToastInfo);",
    "    sr.querySelector('#toast-action-btn').addEventListener('click', this._onToastAction);",
    '',
  ].join('\n') : '';

  const HP_TOAST_UNSUBSCRIBE = includeToast ? [
    "    sr.querySelector('#toast-info-btn')?.removeEventListener('click', this._onToastInfo);",
    "    sr.querySelector('#toast-action-btn')?.removeEventListener('click', this._onToastAction);",
  ].join('\n') : '';

  const APP_HEADER_IMPORT = includeAppHeader
    ? "import '../_lib/modules/app-header/app-header.js';"
    : '';

  const MODAL_IMPORT = includeModal
    ? "import '../_lib/modules/modal-dialog/modal-dialog.js';"
    : '';

  const APP_HEADER_ELEMENT = includeAppHeader
    ? `<app-header label="${appName}"></app-header>`
    : '';

  return {
    // HP_* first so %%APP_NAME%% inside them is substituted by the APP_NAME pass
    HP_TOAST_IMPORT,
    HP_GESTURE_IMPORT,
    HP_GESTURE_CSS,
    HP_MODAL_BTN,
    HP_MODAL_ELEMENT,
    HP_GESTURE_SECTION,
    HP_SYNC_SECTION,
    HP_TOAST_DISPATCH,
    HP_MODAL_SUBSCRIBE,
    HP_MODAL_UNSUBSCRIBE,
    HP_GESTURE_SUBSCRIBE,
    HP_GESTURE_UNSUBSCRIBE,
    HP_SYNC_SUBSCRIBE,
    HP_SYNC_UNSUBSCRIBE,
    HP_IMAGES_IMPORT,
    HP_IMAGES_CSS,
    HP_IMAGES_SECTION,
    HP_IMAGES_SUBSCRIBE,
    HP_IMAGES_UNSUBSCRIBE,
    HP_TOAST_SECTION,
    HP_TOAST_SUBSCRIBE,
    HP_TOAST_UNSUBSCRIBE,
    APP_HEADER_IMPORT,
    MODAL_IMPORT,
    APP_HEADER_ELEMENT,
    APP_ID:          appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    APP_NAME:        appName,
    EXPORT_EXT:      exportExt,
    APP_SHORT_NAME:  appShortName,
    APP_DESCRIPTION: appDescription,
    LANG:            'en',
    GITHUB_USER:     githubUser,
    PORT:            String(port),
    THEME_COLOR_LIGHT: '#F5F2EE',
    THEME_COLOR_DARK:  '#1C1C1E',
    IMAGES_IMPORT:   includeImages ? "import './pages/images-page.js';" : '',
    IMAGES_ROUTE:    includeImages ? "  { path: '/images', component: 'images-page' }," : '',
    STORE_IMPORT:    "import { boot } from '../_lib/core/store/store.js';",
    REDUCER_IMPORT:  storeType === 'simple'
      ? ''
      : "import { reducer } from './store/reducer.js';",
    STORE_BOOT:      storeType === 'simple'
      ? `await boot({ dbName: '${appName}' });`
      : `await boot({ dbName: '${appName}', reducer });`,
  };
}

// ── scaffoldApp (exported for tests) ─────────────────────────────────────────

export function scaffoldApp(options, destDir) {
  const {
    appName, appShortName, appDescription, githubUser,
    includeSync = false, includeGestures = true, includeImages = false,
    includeAppHeader = false, includeModal = false, includeToast = false,
    includeReorder = false,
    storeType = 'event-log',
    exportExt = '.data',
    accentColor, version, port = 3000,
  } = options;

  const resolvedOptions = {
    appName, appShortName, appDescription, githubUser, version, port,
    includeGestures, includeSync, includeImages,
    includeAppHeader, includeModal, includeToast, includeReorder,
    storeType, exportExt,
  };

  // Copy scaffold base, excluding _modules/ (handled separately below)
  fs.cpSync(SCAFFOLD_DIR, destDir, {
    recursive: true,
    filter: src => {
      if (src.endsWith('.DS_Store')) return false;
      const rel = path.relative(SCAFFOLD_DIR, src);
      return !rel.startsWith('_modules');
    },
  });

  const tokenMap = buildTokenMap(resolvedOptions);

  walkText(destDir, file => {
    if (file.endsWith('CLAUDE.md.template')) return;
    const content = fs.readFileSync(file, 'utf8');
    const replaced = replaceTokens(content, tokenMap);
    if (replaced !== content) fs.writeFileSync(file, replaced);
  });

  const templatePath = path.join(destDir, 'CLAUDE.md.template');
  const modules = [
    'core',
    ...(includeGestures  ? ['gestures']     : []),
    ...(includeSync      ? ['sync']          : []),
    ...(includeImages    ? ['images']        : []),
    ...(includeAppHeader ? ['app-header']    : []),
    ...(includeModal     ? ['modal-dialog']  : []),
    ...(includeToast     ? ['toast']         : []),
    ...(includeReorder   ? ['reorder']       : []),
  ];
  const blockMap = {
    APP_NAME:        appName,
    APP_DESCRIPTION: appDescription,
    LIB_VERSION:     version,
    SCAFFOLDED_DATE: new Date().toISOString().split('T')[0],
    MODULES:         modules.join(', '),
    ACCENT_COLOR:    accentColor,
  };
  fs.writeFileSync(
    path.join(destDir, 'CLAUDE.md'),
    replaceBlockTokens(fs.readFileSync(templatePath, 'utf8'), blockMap)
  );
  fs.rmSync(templatePath);

  // Copy optional module scaffold pages (images only; gesture/sync are inline in home-page)
  const modScaffoldImages = path.join(SCAFFOLD_DIR, '_modules', 'images');
  if (includeImages && fs.existsSync(modScaffoldImages)) {
    fs.cpSync(modScaffoldImages, destDir, { recursive: true });
    walkText(destDir, file => {
      const content = fs.readFileSync(file, 'utf8');
      const replaced = replaceTokens(content, tokenMap);
      if (replaced !== content) fs.writeFileSync(file, replaced);
    });
  }

  fs.mkdirSync(path.join(destDir, '_lib', 'modules'), { recursive: true });
  fs.cpSync(CORE_DIR, path.join(destDir, '_lib', 'core'), { recursive: true });

  // Remove the store variant that wasn't selected; for simple, rename store-simple.* → store.*
  // so that other core files (sw-manager, update-banner) keep importing 'store.js' unchanged.
  if (storeType === 'simple') {
    const storeDir = path.join(destDir, '_lib', 'core', 'store');
    for (const [from, to] of [['store-simple.js', 'store.js'], ['store-simple.test.js', 'store.test.js']]) {
      if (fs.existsSync(path.join(storeDir, to))) fs.unlinkSync(path.join(storeDir, to));
      if (fs.existsSync(path.join(storeDir, from))) fs.renameSync(path.join(storeDir, from), path.join(storeDir, to));
    }
    // The renamed store.test.js still imports from './store-simple.js' (source name);
    // patch it to './store.js' so it resolves correctly in the scaffolded app.
    const testPath = path.join(storeDir, 'store.test.js');
    if (fs.existsSync(testPath)) {
      fs.writeFileSync(testPath, fs.readFileSync(testPath, 'utf8').replaceAll('./store-simple.js', './store.js'));
    }
  } else {
    for (const f of ['store-simple.js', 'store-simple.test.js']) {
      const p = path.join(destDir, '_lib', 'core', 'store', f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  // Simple store: remove reducer.js (no event log, no reducer needed)
  if (storeType === 'simple') {
    const reducerPath = path.join(destDir, 'app', 'store', 'reducer.js');
    if (fs.existsSync(reducerPath)) fs.unlinkSync(reducerPath);
  }
  if (includeGestures)  fs.cpSync(path.join(MODULES_DIR, 'gestures'),     path.join(destDir, '_lib', 'modules', 'gestures'),     { recursive: true });
  if (includeSync)      fs.cpSync(path.join(MODULES_DIR, 'sync'),         path.join(destDir, '_lib', 'modules', 'sync'),         { recursive: true });
  if (includeImages)    fs.cpSync(path.join(MODULES_DIR, 'images'),       path.join(destDir, '_lib', 'modules', 'images'),       { recursive: true });
  if (includeAppHeader) fs.cpSync(path.join(MODULES_DIR, 'app-header'),   path.join(destDir, '_lib', 'modules', 'app-header'),   { recursive: true });
  if (includeModal)     fs.cpSync(path.join(MODULES_DIR, 'modal-dialog'), path.join(destDir, '_lib', 'modules', 'modal-dialog'), { recursive: true });
  if (includeToast)     fs.cpSync(path.join(MODULES_DIR, 'toast'),        path.join(destDir, '_lib', 'modules', 'toast'),        { recursive: true });
  if (includeReorder)   fs.cpSync(path.join(MODULES_DIR, 'reorder'),      path.join(destDir, '_lib', 'modules', 'reorder'),      { recursive: true });

  fs.writeFileSync(
    path.join(destDir, '_lib', 'lib-version.json'),
    JSON.stringify({ version, modules, store: storeType, scaffolded: new Date().toISOString().split('T')[0] }, null, 2) + '\n'
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

  if (current.store === 'simple') {
    const storeDir = path.join(projectDir, '_lib', 'core', 'store');
    for (const [from, to] of [['store-simple.js', 'store.js'], ['store-simple.test.js', 'store.test.js']]) {
      if (fs.existsSync(path.join(storeDir, to))) fs.unlinkSync(path.join(storeDir, to));
      if (fs.existsSync(path.join(storeDir, from))) fs.renameSync(path.join(storeDir, from), path.join(storeDir, to));
    }
    const testPath = path.join(storeDir, 'store.test.js');
    if (fs.existsSync(testPath)) {
      fs.writeFileSync(testPath, fs.readFileSync(testPath, 'utf8').replaceAll('./store-simple.js', './store.js'));
    }
  } else if (current.store === 'event-log') {
    for (const f of ['store-simple.js', 'store-simple.test.js']) {
      const p = path.join(projectDir, '_lib', 'core', 'store', f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

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

  // ── utils/build.js ──────────────────────────────────────────────────────────
  const utilsBuildSrc  = path.join(ROOT, 'scaffold', 'utils', 'build.js');
  const utilsBuildDest = path.join(projectDir, 'utils', 'build.js');
  let utilsUpdated = false;
  if (fs.existsSync(utilsBuildDest)) {
    let skipUtils = false;
    try {
      const utilsModified = execSync('git diff --name-only utils/build.js', { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'] })
        .toString().trim();
      if (utilsModified) {
        console.log('\n  utils/build.js has local modifications.');
        const answer = await ask('  Overwrite with library version? [y/N]: ');
        if (!answer.trim().toLowerCase().startsWith('y')) skipUtils = true;
      }
    } catch { /* git unavailable — proceed */ }
    if (!skipUtils) {
      fs.copyFileSync(utilsBuildSrc, utilsBuildDest);
      utilsUpdated = true;
      console.log('  ✔ utils/build.js updated');
    }
  }

  // ── package.json devDependencies ────────────────────────────────────────────
  const scaffoldPkg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'scaffold', 'package.json'), 'utf8'));
  const projectPkgPath = path.join(projectDir, 'package.json');
  const projectPkg   = JSON.parse(fs.readFileSync(projectPkgPath, 'utf8'));
  const projectDeps  = projectPkg.devDependencies ?? {};
  const depsAdded    = [];
  const depsChanged  = [];
  for (const [pkg, ver] of Object.entries(scaffoldPkg.devDependencies)) {
    if (!projectDeps[pkg])              depsAdded.push(`  + ${pkg}: ${ver}`);
    else if (projectDeps[pkg] !== ver)  depsChanged.push(`  ~ ${pkg}: ${projectDeps[pkg]} → ${ver}`);
  }
  let depsUpdated = false;
  if (depsAdded.length || depsChanged.length) {
    console.log('\n  package.json devDependencies:');
    [...depsAdded, ...depsChanged].forEach(l => console.log(l));
    const answer = await ask('  Apply these changes? [y/N]: ');
    if (answer.trim().toLowerCase().startsWith('y')) {
      projectPkg.devDependencies = { ...projectDeps, ...scaffoldPkg.devDependencies };
      fs.writeFileSync(projectPkgPath, JSON.stringify(projectPkg, null, 2) + '\n');
      depsUpdated = true;
      console.log('  ✔ package.json devDependencies updated');
    }
  }

  // ── version migrations ──────────────────────────────────────────────────────
  // v0.9.1 — no app-layer migration required (store rename fix is automated above)
  if (_semverLt(current.version, '0.9.3')) {
    console.log('\n  ── Theme system and build (manual steps required) ──');
    console.log('  1. app/main.js — add at the top:');
    console.log("       import { initTheme } from './_lib/core/theme/theme.js';");
    console.log('     Then call initTheme() as the first statement (before setLocale and boot).');
    console.log('  2. index.html — replace the single <meta name="theme-color"> with:');
    console.log('       <meta name="theme-color" content="#F5F2EE" media="(prefers-color-scheme: light)" />');
    console.log('       <meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)" />');
    console.log('     Then add the anti-FOUC inline script — see CHANGELOG.md for the snippet.');
    if (depsUpdated) console.log('  3. Run: npm install   (adds esbuild for the new build pipeline)');
  }
  // ── end migrations ──────────────────────────────────────────────────────────

  fs.writeFileSync(libVersionPath, JSON.stringify({ ...current, version: latest }, null, 2) + '\n');
  console.log(`  ✔ lib-version.json updated to ${latest}`);

  const stagedFiles = ['_lib/', utilsUpdated && 'utils/build.js', depsUpdated && 'package.json']
    .filter(Boolean).join(' ');
  console.log(`\nDone. Review the changelog, then commit:`);
  console.log(`  git add ${stagedFiles} && git commit -m "chore: update socle to ${latest}"`);
  if (depsUpdated) console.log('  npm install');
}

// ── addModule (exported for tests) ───────────────────────────────────────────

export function addModule(projectDir, moduleName) {
  if (!moduleName) throw new Error('Module name required. Usage: npx socle add <module>');
  if (!VALID_MODULES.includes(moduleName)) {
    throw new Error(`Unknown module: '${moduleName}'. Valid modules: ${VALID_MODULES.join(', ')}`);
  }

  const libVersionPath = path.join(projectDir, '_lib', 'lib-version.json');
  if (!fs.existsSync(libVersionPath)) {
    throw new Error('No _lib/lib-version.json found. Run this from a Socle project root.');
  }

  const meta = JSON.parse(fs.readFileSync(libVersionPath, 'utf8'));
  if (meta.modules.includes(moduleName)) {
    console.log(`Module '${moduleName}' is already installed.`);
    return;
  }

  const src = path.join(MODULES_DIR, moduleName);
  if (!fs.existsSync(src)) {
    throw new Error(`Module '${moduleName}' is not available in this version of Socle.`);
  }

  fs.mkdirSync(path.join(projectDir, '_lib', 'modules'), { recursive: true });
  fs.cpSync(src, path.join(projectDir, '_lib', 'modules', moduleName), { recursive: true });

  meta.modules.push(moduleName);
  fs.writeFileSync(libVersionPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`  ✔ Added: ${moduleName}`);
}

// ── removeModule (exported for tests) ────────────────────────────────────────

export async function removeModule(projectDir, moduleName, ask) {
  if (!moduleName) throw new Error('Module name required. Usage: npx socle remove <module>');
  if (moduleName === 'core') throw new Error("Cannot remove 'core' — it is always required.");
  if (!VALID_MODULES.includes(moduleName)) {
    throw new Error(`Unknown module: '${moduleName}'. Valid modules: ${VALID_MODULES.join(', ')}`);
  }

  const libVersionPath = path.join(projectDir, '_lib', 'lib-version.json');
  if (!fs.existsSync(libVersionPath)) {
    throw new Error('No _lib/lib-version.json found. Run this from a Socle project root.');
  }

  const meta = JSON.parse(fs.readFileSync(libVersionPath, 'utf8'));
  if (!meta.modules.includes(moduleName)) {
    console.log(`Module '${moduleName}' is not installed.`);
    return;
  }

  const usages = findModuleImports(path.join(projectDir, 'app'), moduleName);
  if (usages.length > 0) {
    console.log(`\nWarning: ${usages.length} file(s) in app/ import from '${moduleName}':`);
    usages.forEach(f => console.log(`  ${f}`));
    const answer = await ask('\nRemove anyway? [y/N]: ');
    if (!answer.trim().toLowerCase().startsWith('y')) { console.log('Aborted.'); return; }
  }

  fs.rmSync(path.join(projectDir, '_lib', 'modules', moduleName), { recursive: true, force: true });
  meta.modules = meta.modules.filter(m => m !== moduleName);
  fs.writeFileSync(libVersionPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`  ✔ Removed: ${moduleName}`);
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

  const defaultName    = toTitleCase(path.basename(destDir));
  const appName        = (await ask(`App name [${defaultName}]: `)).trim() || defaultName;
  const appShortName   = (await ask(`App short name [${appName}]: `)).trim() || appName;
  const appDescription = (await ask('App description [A PWA built with Socle]: ')).trim() || 'A PWA built with Socle';
  const githubUser     = (await ask('GitHub username [your-username]: ')).trim() || 'your-username';
  const accentColor    = (await ask('Accent color (hex) [#E8824A]: ')).trim() || '#E8824A';
  const portInput      = (await ask('Dev server port [3000]: ')).trim();
  const port           = portInput && /^\d+$/.test(portInput) ? parseInt(portInput, 10) : 3000;

  rl.close();

  const storeType = await singleSelect('Data store', [
    { label: 'Event log',    value: 'event-log', description: 'Offline-first, auditable, P2P-ready' },
    { label: 'Simple state', value: 'simple',    description: 'IDB snapshot, no event log' },
  ]);

  const selectedModules = await multiSelect('Which modules do you need?', MODULE_OPTIONS, ['gestures', 'app-header', 'modal-dialog', 'toast']);

  let exportExt = `.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  if (selectedModules.includes('sync')) {
    // rl was closed before singleSelect/multiSelect — open a fresh interface for this prompt
    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask2 = makeAsk(rl2);
    const extInput = (await ask2(`Export file extension [${exportExt}]: `)).trim();
    rl2.close();
    if (extInput) exportExt = extInput.startsWith('.') ? extInput : `.${extInput}`;
  }

  console.log('\nScaffolding...');
  scaffoldApp({
    appName, appShortName, appDescription, githubUser, accentColor, version, port,
    storeType, exportExt,
    includeGestures:  selectedModules.includes('gestures'),
    includeSync:      selectedModules.includes('sync'),
    includeImages:    selectedModules.includes('images'),
    includeAppHeader: selectedModules.includes('app-header'),
    includeModal:     selectedModules.includes('modal-dialog'),
    includeToast:     selectedModules.includes('toast'),
    includeReorder:   selectedModules.includes('reorder'),
  }, destDir);

  console.log('  ✔ app/ structure created');
  console.log('  ✔ tests/ and utils/ copied');
  console.log('  ✔ index.html, manifest.json generated');
  console.log('  ✔ _lib/core copied');
  for (const mod of ['gestures', 'sync', 'images', 'app-header', 'modal-dialog', 'toast']) {
    if (selectedModules.includes(mod)) console.log(`  ✔ _lib/modules/${mod} copied`);
  }
  console.log('  ✔ _lib/lib-version.json written');
  console.log(`  ✔ Accent colour set to ${accentColor}`);
  console.log('  ✔ CLAUDE.md generated');

  console.log(`\nYour app is ready in ./${dirName}\n`);
  console.log('Next steps:');
  console.log(`  cd ${dirName}`);
  console.log('  npm install');
  console.log(`  git init && git add . && git commit -m "chore: scaffold from socle ${version}"`);
  console.log('  npx socle cert        # set up HTTPS  (optional, needed for mobile)');
  console.log('  npm run dev:https     # or npm run dev (if HTTPS not configured)');
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

async function runAdd(moduleName) {
  try {
    addModule(process.cwd(), moduleName);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

async function runRemove(moduleName) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await removeModule(process.cwd(), moduleName, makeAsk(rl));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    rl.close();
    process.exit(1);
  }
  rl.close();
}

async function runManage() {
  const libVersionPath = path.join(process.cwd(), '_lib', 'lib-version.json');
  if (!fs.existsSync(libVersionPath)) {
    console.error('Error: No _lib/lib-version.json found. Run this from a Socle project root.');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(libVersionPath, 'utf8'));
  const installed = new Set(meta.modules.filter(m => m !== 'core'));

  const before = [...installed];
  const after  = await multiSelect('Manage modules', MODULE_OPTIONS, before);

  const toAdd    = after.filter(m => !installed.has(m));
  const toRemove = before.filter(m => !after.includes(m));

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log('No changes.');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for (const m of toAdd) {
    try { addModule(process.cwd(), m); } catch (e) { console.error(`Error: ${e.message}`); }
  }
  for (const m of toRemove) {
    try { await removeModule(process.cwd(), m, makeAsk(rl)); } catch (e) { console.error(`Error: ${e.message}`); }
  }
  rl.close();
}

// ── cert ──────────────────────────────────────────────────────────────────────

function getLanIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

function serveCa(caFilePath) {
  const ca = fs.readFileSync(caFilePath);
  const ip = getLanIP();
  const port = 18080;
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/x-pem-file', 'Content-Disposition': 'attachment; filename="rootCA.pem"' });
      res.end(ca);
    });
    server.listen(port, '0.0.0.0', () => {
      console.log('\nTo install the CA on your Android phone (one-time per device):');
      console.log(`  1. Open this URL on your phone: http://${ip ?? '<your-ip>'}:${port}/rootCA.pem`);
      console.log('  2. Tap the file → Install as CA certificate');
      console.log('\nPress Enter when done...');
      const rl = readline.createInterface({ input: process.stdin });
      rl.once('line', () => { rl.close(); server.close(); resolve(); });
    });
  });
}

function runMkcert(certFile, keyFile, host) {
  const args = ['-cert-file', certFile, '-key-file', keyFile,
                'localhost', '127.0.0.1', '::1', ...(host ? [host] : [])];
  try {
    execFileSync('mkcert', ['-install'], { stdio: 'inherit' });
    execFileSync('mkcert', args, { stdio: 'inherit' });
  } catch {
    console.error('\nmkcert not found. Install it first:');
    console.error('  macOS:   brew install mkcert');
    console.error('  Linux:   https://github.com/FiloSottile/mkcert#linux');
    console.error('  Windows: https://github.com/FiloSottile/mkcert#windows');
    process.exit(1);
  }
}

export function ensureDevHttps(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts?.['dev:https']) return;
  const dev = pkg.scripts?.dev ?? '';
  const portMatch = dev.match(/--listen\s+(\d+)/);
  const port = portMatch?.[1] ?? '3000';
  const devHttps = portMatch
    ? dev.replace(`--listen ${port} `, `--listen tcp:0.0.0.0:${port} `) + ' --ssl-cert local.pem --ssl-key local-key.pem'
    : `${dev} --listen tcp:0.0.0.0:${port} --single --ssl-cert local.pem --ssl-key local-key.pem`.trim();
  pkg.scripts['dev:https'] = devHttps;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✔ dev:https added to package.json');
}

async function runCert() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('No package.json found. Run socle cert from your project root.');
    process.exit(1);
  }

  const choice = await singleSelect('HTTPS certificate setup', [
    { label: 'None',             value: 'none',    description: 'No HTTPS — remove dev:https script' },
    { label: 'Shared',           value: 'shared',  description: 'One cert in ~/.socle-certs/, symlinked here (reuse across projects)' },
    { label: 'Project-specific', value: 'project', description: 'Cert generated in this folder only' },
  ]);

  if (choice === 'none') {
    for (const f of ['local.pem', 'local-key.pem']) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    delete pkg.scripts['dev:https'];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('\n✔ dev:https removed. Use npm run dev for HTTP-only development.');
    return;
  }

  const CERT_DIR   = path.join(os.homedir(), '.socle-certs');
  const GLOBAL_PEM = path.join(CERT_DIR, 'local.pem');
  const GLOBAL_KEY = path.join(CERT_DIR, 'local-key.pem');

  function link(target, name) {
    if (fs.existsSync(name)) fs.unlinkSync(name);
    fs.symlinkSync(target, name);
  }

  if (choice === 'shared' && fs.existsSync(GLOBAL_PEM) && fs.existsSync(GLOBAL_KEY)) {
    console.log('✔ Reusing shared cert from ~/.socle-certs/');
    link(GLOBAL_PEM, 'local.pem');
    link(GLOBAL_KEY, 'local-key.pem');
    ensureDevHttps(pkgPath);
    console.log('\nRun: npm run dev:https');
    return;
  }

  if (choice === 'project' && fs.existsSync('local.pem') && fs.existsSync('local-key.pem')) {
    console.log('✔ Reusing project cert (delete local.pem + local-key.pem to regenerate)');
    ensureDevHttps(pkgPath);
    console.log('\nRun: npm run dev:https');
    return;
  }

  // Need to generate — ask for mobile IP, pre-fill detected LAN address
  const detectedIP = getLanIP();
  const ipPrompt = detectedIP
    ? `Network IP for mobile testing [${detectedIP}]: `
    : 'Network IP for mobile testing (blank to skip): ';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = makeAsk(rl);
  const answer = await ask(ipPrompt);
  rl.close();
  const raw  = answer.trim().replace(/^https?:\/\//, '').replace(/[/:].*/g, '');
  const host = raw || detectedIP || null;

  if (choice === 'shared') {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    runMkcert(GLOBAL_PEM, GLOBAL_KEY, host);
    link(GLOBAL_PEM, 'local.pem');
    link(GLOBAL_KEY, 'local-key.pem');
  } else {
    runMkcert('local.pem', 'local-key.pem', host);
  }

  ensureDevHttps(pkgPath);
  console.log('\n✔ Cert ready — desktop browsers trust it automatically.');

  if (host) {
    const caRoot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8' }).trim();
    console.log(`✔ Cert covers ${host} — connect from your phone at https://${host}:3000`);
    await serveCa(path.join(caRoot, 'rootCA.pem'));
  }

  console.log('\nRun: npm run dev:https');
}

// ── entry ─────────────────────────────────────────────────────────────────────

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [,, cmd, arg] = process.argv;
  let runner;
  if      (cmd === 'cert')   runner = runCert();
  else if (cmd === 'update') runner = runUpdate();
  else if (cmd === 'add')    runner = runAdd(arg);
  else if (cmd === 'remove') runner = runRemove(arg);
  else if (cmd === 'manage') runner = runManage();
  else                       runner = runScaffold(cmd);
  runner.catch(e => { console.error(e.message); process.exit(1); });
}
