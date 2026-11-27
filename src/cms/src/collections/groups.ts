// The groups the collections are listed under in the admin panel's navigation.
// Payload shows the groups in the order their first collection appears in
// `collections` in payload.config.ts, so keep that list in this order.
export const collectionGroups = {
  governance: 'Styring',
  team: 'Team',
  tools: 'Verktøy',
  organisation: 'Organisasjon',
  system: 'System',
} as const
