let basePath = '';

// Call once at boot, before assigning routes, when the app is served from a
// sub-path (e.g. a GitHub Pages project page). Routes and navigate() stay
// prefix-free; this is the only place the prefix is applied or stripped.
export function setBasePath(base) {
  if (!base) return;
  basePath = base.endsWith('/') ? base.slice(0, -1) : base;
}

export function currentPath() {
  const path = location.pathname;
  if (!basePath) return path;
  const boundary = path.length === basePath.length || path[basePath.length] === '/';
  if (!path.startsWith(basePath) || !boundary) return path;
  const stripped = path.slice(basePath.length);
  return stripped === '' ? '/' : stripped;
}

export function navigate(path) {
  const full = basePath + path;
  history.pushState(null, '', full);
  window.dispatchEvent(new CustomEvent('navigate', { detail: { path } }));
}

export function matchRoute(routes, path) {
  for (const route of routes) {
    const params = match(route.path, path);
    if (params !== null) return { route, params };
  }
  return null;
}

function match(pattern, path) {
  if (pattern === '*') return {};
  const pp = pattern.split('/');
  const rp = path.split('/');
  if (pp.length !== rp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(rp[i]);
    } else if (pp[i] !== rp[i]) {
      return null;
    }
  }
  return params;
}
