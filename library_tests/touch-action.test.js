/**
 * touch-action discipline — library developer tests only.
 *
 * `touch-action: none` takes BOTH axes away from the browser. On a region that scrolls —
 * or that sits over one — that is not a neutral choice: a flick still makes the browser
 * start a fling, the fling has nothing to move, and it runs invisibly while spending the
 * user's next tap cancelling itself. The tap is lost for no visible reason.
 *
 * This shipped three times (modal-dialog's .body, toast's .socle-toast, and the gesture
 * module's swipe default) before it was understood, each time as a fix for a real
 * on-device bug that `none` genuinely did solve. This test exists so there is no fourth.
 *
 * The rule (CLAUDE.md, docs/gestures.md): a horizontal gesture declares
 * `touch-action: pan-y pinch-zoom` and claims the axis explicitly via
 * core/scroll-claim.js. `none` is reserved for small, non-scrolling affordances that
 * legitimately own both axes, and each one needs an entry in ALLOWED below — keyed by
 * selector, not just by file, so a second `none` in an already-listed file is still caught.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Empty, and worth keeping that way. The last exemption was modal-dialog's .handle, which
// owned both axes for a horizontal tab-swipe it no longer has; once that swipe was removed
// the handle could concede pan-x and claim vertical like everything else. If you find
// yourself adding an entry here, first check whether the element actually needs both axes —
// it probably does not.
const ALLOWED = [];

const SOURCE_DIRS = ['core', 'modules'];

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { out.push(...jsFiles(full)); continue; }
    if (entry.endsWith('.js') && !entry.endsWith('.test.js')) out.push(full);
  }
  return out;
}

// Comments discuss `touch-action: none` at length — deliberately, since the reasoning is
// the valuable part. Only real declarations count, so strip comments before scanning.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map(l => (l.trim().startsWith('//') ? '' : l))
  .join('\n');

const NONE_CSS = /touch-action\s*:\s*none/;
const NONE_JS = /touchAction\s*=\s*['"`]none['"`]/;
const OVERFLOW_SCROLLS = /overflow(-[xy])?\s*:\s*(auto|scroll)/;

// Pull `selector { ...decls... }` pairs out of the CSS embedded in component templates.
// Good enough for this codebase's flat, hand-written rules; at-rule wrappers (@media)
// are skipped by requiring the declaration body to contain a colon and no nested brace.
function cssRules(src) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const selector = m[1].trim().split('\n').map(s => s.trim()).filter(Boolean).pop() || '';
    if (selector.startsWith('@')) continue;
    rules.push({ selector, body: m[2] });
  }
  return rules;
}

// '.body.has-tabs' and '.body' are the same element. Compare on the first class token so a
// more specific variant of a scroll container cannot smuggle `none` in past the check.
const baseToken = (selector) => {
  const first = selector.split(/[\s>+~,]/).filter(Boolean)[0] || selector;
  const cls = first.match(/\.[A-Za-z0-9_-]+/);
  return cls ? cls[0] : first;
};

const allFiles = SOURCE_DIRS.flatMap(d => jsFiles(join(root, d)));
const parsed = allFiles.map(file => {
  const src = stripComments(readFileSync(file, 'utf8'));
  return { file, rel: relative(root, file), src, rules: cssRules(src) };
});

describe('touch-action: none is exempted by selector, never incidental', () => {
  it('has no unlisted touch-action: none anywhere in core/ or modules/', () => {
    const allowed = new Set(ALLOWED.map(a => `${a.file}::${a.selector}`));
    const violations = [];

    for (const { rel, src, rules } of parsed) {
      for (const { selector, body } of rules) {
        if (!NONE_CSS.test(body)) continue;
        if (allowed.has(`${rel}::${selector}`)) continue;
        violations.push(`${rel}: rule "${selector}" sets touch-action: none`);
      }
      // JS-assigned values carry no selector — any of them is a violation.
      src.split('\n').forEach((line, i) => {
        if (NONE_JS.test(line)) violations.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }

    expect(violations, [
      'Unlisted `touch-action: none`.',
      'A horizontal gesture should use `pan-y pinch-zoom` and claim the axis via',
      'core/scroll-claim.js. If this element really does own both axes and does not',
      'scroll, add { file, selector, reason } to ALLOWED in this file.',
    ].join('\n')).toEqual([]);
  });

  it('every ALLOWED entry still exists, so the list cannot rot', () => {
    expect(ALLOWED.length, 'exemptions are meant to stay at zero — see the note above').toBe(0);
    for (const { file, selector } of ALLOWED) {
      const entry = parsed.find(p => p.rel === file);
      expect(entry, `${file} is in ALLOWED but no longer exists`).toBeTruthy();
      const rule = entry.rules.find(r => r.selector === selector && NONE_CSS.test(r.body));
      expect(rule, `${file} "${selector}" is in ALLOWED but no longer sets touch-action: none`).toBeTruthy();
    }
  });
});

describe('scroll containers never take both axes', () => {
  it('no element that scrolls also declares touch-action: none, however specific the selector', () => {
    const violations = [];

    for (const { rel, rules } of parsed) {
      const scrolls = new Set(
        rules.filter(r => OVERFLOW_SCROLLS.test(r.body)).map(r => baseToken(r.selector)),
      );
      for (const { selector, body } of rules) {
        if (!NONE_CSS.test(body)) continue;
        if (!scrolls.has(baseToken(selector))) continue;
        violations.push(
          `${rel}: "${selector}" sets touch-action: none but "${baseToken(selector)}" is a scroll container`,
        );
      }
    }

    expect(violations, [
      'A scroll container must never take both axes: the browser keeps generating flings',
      'that cannot move anything, and each one eats the next tap. Concede the scrolling',
      'axis (pan-y for a horizontal gesture) and claim the other via core/scroll-claim.js.',
    ].join('\n')).toEqual([]);
  });
});

// The CSS in cli/index.js is emitted as arrays of string literals, so the rule parser
// above cannot see it — which is exactly how a `touch-action: none` survived in the
// scaffolded gesture demo. A plain line scan is the right tool for generated templates,
// and there is never a legitimate exemption in one: the library sets touch-action itself.
describe('generated templates never hard-code touch-action: none', () => {
  it('has no touch-action: none in cli/ or scaffold/', () => {
    const dirs = ['cli', 'scaffold'].map(d => join(root, d));
    const violations = [];

    for (const dir of dirs) {
      for (const file of jsFiles(dir)) {
        const rel = relative(root, file);
        stripComments(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
          if (NONE_CSS.test(line) || NONE_JS.test(line)) {
            violations.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }

    expect(violations, [
      'A scaffolded app must not be taught to hard-code `touch-action: none`.',
      'Gestures.attach and the gesture mixin set touch-action themselves; a hard-coded',
      'value on the same element is at best redundant and at worst takes both axes back.',
    ].join('\n')).toEqual([]);
  });
});

describe('horizontal gestures concede the vertical axis', () => {
  it('the gesture module picks pan-y pinch-zoom for swipe in both the mixin and attach', () => {
    const src = readFileSync(join(root, 'modules/gestures/gestures.js'), 'utf8');
    const branches = src.match(/touchAction\s*=\s*hasSwipe\s*\?\s*'pan-y pinch-zoom'/g) || [];
    expect(branches.length, 'both the mixin and Gestures.attach must branch on hasSwipe').toBe(2);
  });

  it('keeps the claim primitive in core/, so no module depends on another module', () => {
    expect(readFileSync(join(root, 'core/scroll-claim.js'), 'utf8')).toContain('export const attachScrollClaim');

    for (const { rel, src } of parsed) {
      if (!rel.startsWith('modules/')) continue;
      const crossModule = src.match(/from\s+['"][^'"]*\.\.\/modules\//g) || [];
      expect(crossModule, `${rel} imports from another module`).toEqual([]);
    }
  });
});
