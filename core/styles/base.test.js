// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { baseSheet } from './base.js';

let n = 0;
const mount = (componentCSS, markup = '', hostAttr) => {
  const el = document.createElement(`base-probe-${n++}`);
  if (hostAttr) el.setAttribute(hostAttr, '');
  document.body.appendChild(el);
  const root = el.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${componentCSS}</style>${markup}`;
  root.adoptedStyleSheets = [baseSheet];
  return { el, root };
};

describe('base stylesheet cascade', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('lets a component :host rule override the default display', () => {
    const { el } = mount(':host { display: flex; }');
    expect(getComputedStyle(el).display).toBe('flex');
  });

  // The `display: block` default itself is asserted on the rule text, not via
  // getComputedStyle: happy-dom does not resolve `:where(:host)` against the
  // host at all (it returns ''), though Chromium 148 and Firefox 150 both do.
  it('still declares display: block as the zero-specificity default', () => {
    const rule = [...baseSheet.cssRules].find(r => r.selectorText === ':where(:host)');
    expect(rule).toBeDefined();
    expect(rule.style.display).toBe('block');
  });

  it('keeps [hidden] winning over a single-class display rule', () => {
    const { root } = mount('.footer { display: flex; }', '<div class="footer" hidden>x</div>');
    expect(getComputedStyle(root.querySelector('.footer')).display).toBe('none');
  });

  it('allows a deliberate two-class override of [hidden]', () => {
    const { root } = mount('.footer.shown { display: flex; }', '<div class="footer shown" hidden>x</div>');
    expect(getComputedStyle(root.querySelector('.footer')).display).toBe('flex');
  });

  it('keeps the :host([hidden]) pattern working', () => {
    const { el } = mount(':host { display: block; } :host([hidden]) { display: none; }', '', 'hidden');
    expect(getComputedStyle(el).display).toBe('none');
  });
});
