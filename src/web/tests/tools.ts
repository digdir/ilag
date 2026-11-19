// Tools as the CMS returns them, for the toolbox tests.

export const figma = {
  id: 1,
  name: 'Figma',
  toolType: 'verktoy',
  description: 'Digdir har lisens. Brukes til design, skisser og samarbeid om grensesnitt.',
  teamTypes: [],
  toolUrl: 'https://www.figma.com',
  resources: [],
}

export const prosjektmandat = {
  id: 2,
  name: 'Prosjektmandat',
  toolType: 'mal',
  description: 'Beskriver formål, mål, rammer og myndighet for et prosjekt med definert start og slutt.',
  teamTypes: [
    { id: 3, name: 'Prosjektteam' },
    { id: 1, name: 'Produktteam' },
  ],
  toolUrl: null,
  resources: [{ id: 'a', label: 'Mal for prosjektmandat', url: 'https://example.org/mal' }],
}

export const toolTeamTypes = {
  docs: [
    { id: 1, name: 'Produktteam' },
    { id: 3, name: 'Prosjektteam' },
  ],
}
