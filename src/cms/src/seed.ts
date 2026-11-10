import type { Payload } from 'payload'

// The roles every team has (Vedlegg 7), and teamleder and teameier from the
// start (RO-07). Only created in a database without any roles, since
// administrators maintain them from there.
const roles = [
  {
    name: 'Teameier',
    description:
      'Sikrer at teamet leverer i tråd med virksomhetens mål og har de nødvendige rammer.',
  },
  {
    name: 'Teamleder',
    description: 'Leder teamets daglige arbeid og måloppnåelse innenfor mandatet.',
  },
  {
    name: 'Teammedlem',
    description: 'Leverer faglige bidrag av høy kvalitet i tråd med teamets mål og mandat.',
  },
  {
    name: 'Produkteier',
    description:
      'Sikrer at produktteamet jobber med de riktige behovene og prioriteringene innenfor produktets mål, mandat og rammer.',
  },
]

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({ collection: 'roller' })
  if (totalDocs === 0) {
    for (const role of roles) {
      await payload.create({ collection: 'roller', data: role })
    }
  }
}
