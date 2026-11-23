// Concepts as the CMS returns them, for the concept and Prose tests.

export const teammandat = {
  id: 1,
  name: 'Teammandat',
  definition: 'Beskriver hvorfor teamet finnes, teamets ansvar og handlingsrom.',
  variants: ['teammandatet', 'teammandater'],
  autoLink: true,
}

export const okr = {
  id: 2,
  name: 'OKR',
  definition: 'Objectives and key results. Målstyringsverktøy for team.',
  variants: [],
  autoLink: true,
}

export const tverrgaende = {
  id: 3,
  name: 'Tverrgående team',
  definition: 'Team satt sammen av ressurser fra flere divisjoner.',
  variants: ['tverrgående teamet'],
  autoLink: true,
}

// A common word that would be marked everywhere, so it isn't.
export const team = {
  id: 4,
  name: 'Team',
  definition: 'En gruppe medarbeidere som arbeider sammen om leveranser.',
  variants: ['teamet', 'teamene'],
  autoLink: false,
}

export const concepts = [okr, team, teammandat, tverrgaende]
