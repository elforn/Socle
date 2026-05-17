import { createHash } from 'crypto';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BASE_PATH = process.env.BASE_PATH ?? '/';

mkdirSync(dist, { recursive: true });

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function contentHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

// 1. Process app/main.js — inject __APP_VERSION__, rewrite import paths for dist/ layout
const mainSrc = readFileSync(join(root, 'app', 'main.js'), 'utf8');
const mainProcessed = mainSrc
  .replaceAll('__APP_VERSION__', `'${version}'`)
  .replaceAll("'../_lib/", "'./_lib/")        // app/main.js → dist root: ../_lib → ./_lib
  .replaceAll("'./pages/", "'./app/pages/"); // app/main.js → dist root: ./pages → ./app/pages
const mainHash = contentHash(mainProcessed);
const mainFilename = `main.${mainHash}.js`;
writeFileSync(join(dist, mainFilename), mainProcessed);

// 2. Write version.json
writeFileSync(join(dist, 'version.json'), JSON.stringify({ version, buildTime: new Date().toISOString() }, null, 2));

// 3. Process _lib/core/sw.js — inject CACHE_VERSION, ASSETS, and BASE_PATH
const swSrc = readFileSync(join(root, '_lib', 'core', 'sw.js'), 'utf8');
const assets = [BASE_PATH, `${BASE_PATH}${mainFilename}`, `${BASE_PATH}manifest.json`];
const swProcessed = swSrc
  .replace('%%CACHE_VERSION%%', `${version}-${mainHash}`)
  .replace('%%ASSETS%%', JSON.stringify(assets))
  .replace('%%BASE_PATH%%', BASE_PATH);
writeFileSync(join(dist, 'sw.js'), swProcessed);

// 4. Process index.html — inject hashed main.js path
const indexProcessed = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('%%MAIN_JS%%', `${BASE_PATH}${mainFilename}`);
writeFileSync(join(dist, 'index.html'), indexProcessed);

// 5. Copy manifest.json
copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));

// 6. Copy _lib/ to dist/_lib/ — dereference symlinks so dist/ is self-contained
cpSync(join(root, '_lib'), join(dist, '_lib'), { recursive: true, dereference: true });

// 7. Copy app/ to dist/app/ — page components needed by dist/main.*.js imports
cpSync(join(root, 'app'), join(dist, 'app'), { recursive: true });

console.log(`Built ${version} (base: ${BASE_PATH}) → dist/`);
console.log(`  ${mainFilename}`);
console.log(`  sw.js (cache: ${version}-${mainHash})`);
console.log(`  version.json`);
console.log(`  index.html`);
