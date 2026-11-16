// Roles as the CMS returns them, for the role page tests.

export const teameier = {
  id: 1,
  name: 'Teameier',
  role: 'Formelt utpekt som teameier ved etablering av teamet.',
  responsibility:
    'Sikre at teamet leverer i tråd med virksomhetens mål og har de nødvendige rammer.',
  authority: 'Fastsette mandat, mål/OKR, budsjett og prioriteringer på overordnet nivå.',
  tasks: 'Definere mål og forventninger.\nTett dialog med teamleder.',
  teamTypes: [
    { id: 1, name: 'Produktteam' },
    { id: 3, name: 'Leveranseteam' },
    { id: 4, name: 'Støtteteam' },
  ],
}

export const produkteier = {
  id: 2,
  name: 'Produkteier',
  role: 'Produktteam bør ha produkteier.',
  responsibility: null,
  authority: null,
  tasks: '',
  teamTypes: [{ id: 1, name: 'Produktteam' }],
}

// A role teams work with, but that belongs to no team type.
export const linjeleder = {
  id: 3,
  name: 'Linjeleder',
  role: 'Leder en enhet i linjen.',
  responsibility: null,
  authority: null,
  tasks: null,
  teamTypes: [],
}

export const roleTeamTypes = {
  docs: [
    { id: 3, name: 'Leveranseteam' },
    { id: 1, name: 'Produktteam' },
    { id: 4, name: 'Støtteteam' },
  ],
}
