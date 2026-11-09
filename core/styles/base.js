const sheet = new CSSStyleSheet();

// Adopted stylesheets are ordered after a shadow root's own <style>, so at equal
// specificity this sheet would beat the component. :where() drops the :host
// defaults to zero specificity so a component's own rules always win. [hidden]
// deliberately keeps its bare (0,1,0) selector instead: it ties a single-class
// rule and wins on order. Wrapping it in :where() loses that tie and hidden
// elements render; !important forces legitimate overrides to escalate.
// See docs/components.md → Base reset / Hiding elements.
sheet.replaceSync(`
  :where(:host) {
    display: block;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  [hidden] { display: none; }
`);

export { sheet as baseSheet };
