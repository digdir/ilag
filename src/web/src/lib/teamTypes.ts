// The colour of each team type's tag (TO-02), from the theme, close to the
// prototype. The team types themselves are in the CMS; how they look is up
// to the frontend, matched on the name. A type that isn't listed is neutral.
export const teamTypeColors: Record<string, string> = {
  Produktteam: 'info',
  Leveranseteam: 'neutral',
  Støtteteam: 'warning',
  Prosjektteam: 'danger',
  Fagnettverk: 'brand2',
}
