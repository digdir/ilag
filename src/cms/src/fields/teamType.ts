import type { SelectField } from 'payload'

// The team types in Vedlegg 2 (TO-02). Every collection with a team type uses
// this list, so a type is added or renamed here.
export const teamTypeOptions = [
  { label: 'Prosjektteam', value: 'project' },
  { label: 'Støtteteam', value: 'support' },
  { label: 'Leveranseteam', value: 'delivery' },
  { label: 'Produktteam', value: 'product' },
  { label: 'Fagnettverk', value: 'network' },
]

// A select field for a team's type: `teamTypeField({ required: true })`.
// Always one type, so hasMany cannot be set.
export const teamTypeField = (
  overrides: Partial<Omit<SelectField, 'type' | 'options' | 'hasMany' | 'validate'>> = {},
): SelectField => ({
  name: 'teamType',
  // One shared TeamType in the generated types, wherever the field is used.
  interfaceName: 'TeamType',
  type: 'select',
  options: teamTypeOptions,
  ...overrides,
})
