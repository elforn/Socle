const _strings = {};

export function defineStrings(obj) {
  Object.assign(_strings, obj);
}

export function t(key) {
  return _strings[key] ?? key;
}

export function reset() {
  for (const k of Object.keys(_strings)) delete _strings[k];
}
