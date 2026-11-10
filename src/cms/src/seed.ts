import type { Payload } from 'payload'

// The roles every team has (Vedlegg 7), and teamleder and teameier from the
// start (RO-07).
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

// The team types in Vedlegg 2 (TO-02).
const teamTypes = [
  {
    name: 'Prosjektteam',
    description: 'Løser en avgrenset oppgave med et definert mål og en tydelig avslutning.',
  },
  {
    name: 'Støtteteam',
    description: 'Har et varig ansvar for å skape verdi internt i Digdir.',
  },
  {
    name: 'Leveranseteam',
    description:
      'Har et varig og helhetlig ansvar for en definert leveranse som skaper verdi utenfor Digdir.',
  },
  {
    name: 'Produktteam',
    description: 'Et leveranseteam med varig og helhetlig ansvar for ett eller flere produkter.',
  },
  {
    name: 'Fagnettverk',
    description:
      'Samler personer med et felles fagområde for å dele kunnskap. Har vanligvis ikke ansvar for en felles leveranse.',
  },
]

// Only fills a collection that is empty, since administrators maintain the
// content from there.
const seedIfEmpty = async (
  payload: Payload,
  collection: 'roller' | 'teamtyper',
  docs: { name: string; description: string }[],
) => {
  const { totalDocs } = await payload.count({ collection })
  if (totalDocs === 0) {
    for (const data of docs) await payload.create({ collection, data })
  }
}

export const seed = async (payload: Payload) => {
  await seedIfEmpty(payload, 'roller', roles)
  await seedIfEmpty(payload, 'teamtyper', teamTypes)
}
