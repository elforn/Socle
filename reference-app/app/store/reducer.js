export function reducer(state, event) {
  switch (event.type) {
    case 'goal:added':
      return { ...state, goals: [...(state.goals ?? []), event.payload] };
    default:
      return state;
  }
}
