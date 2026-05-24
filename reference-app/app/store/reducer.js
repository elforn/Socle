export function reducer(state, event) {
  switch (event.type) {
    case 'goal:added':
      return { ...state, goals: [...(state.goals ?? []), { ...event.payload, id: event.id, completion: 0 }] };
    case 'goal:completion-changed': {
      const goals = (state.goals ?? []).map(g =>
        g.id === event.payload.id ? { ...g, completion: event.payload.completion } : g
      );
      return { ...state, goals };
    }
    case 'goal:deleted':
      return { ...state, goals: (state.goals ?? []).filter(g => g.id !== event.payload.id) };
    default:
      return state;
  }
}
