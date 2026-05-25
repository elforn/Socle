function upsert(list = [], id, data) {
  const exists = list.some(i => i.id === id);
  return exists
    ? list.map(i => i.id === id ? { ...i, ...data } : i)
    : [...list, { id, percentage: 0, ...data }];
}

function remove(list = [], id) {
  return list.filter(i => i.id !== id);
}

export function reducer(state, event) {
  const { year, id, title, percentage } = event.payload ?? {};

  switch (event.type) {
    case 'goal:title-set':
      return { ...state, goals: { ...(state.goals ?? {}), [year]: upsert(state.goals?.[year], id, { title }) } };

    case 'goal:progress-set':
      return { ...state, goals: { ...(state.goals ?? {}), [year]: upsert(state.goals?.[year], id, { percentage }) } };

    case 'goal:deleted':
      return { ...state, goals: { ...(state.goals ?? {}), [year]: remove(state.goals?.[year] ?? [], id) } };

    case 'milestone:title-set':
      return { ...state, milestone: { ...(state.milestone ?? {}), [year]: upsert(state.milestone?.[year], id, { title }) } };

    case 'milestone:progress-set':
      return { ...state, milestone: { ...(state.milestone ?? {}), [year]: upsert(state.milestone?.[year], id, { percentage }) } };

    case 'milestone:deleted':
      return { ...state, milestone: { ...(state.milestone ?? {}), [year]: remove(state.milestone?.[year], id) } };

    case 'wow:title-set':
      return { ...state, wow: { ...(state.wow ?? {}), [year]: upsert(state.wow?.[year], id, { title }) } };

    case 'wow:progress-set':
      return { ...state, wow: { ...(state.wow ?? {}), [year]: upsert(state.wow?.[year], id, { percentage }) } };

    case 'wow:deleted':
      return { ...state, wow: { ...(state.wow ?? {}), [year]: remove(state.wow?.[year], id) } };

    default:
      return state;
  }
}
