// Test data for `pnpm db:seed`. Units and people come as the files from
// Ansattmottak, in seed-files/, and go through the import
// (docs/integrations/unit-import.md, people-import.md). enheter.csv is
// Ansattmottak's example org file; personer.csv is made up, with email
// addresses at example.com so nobody can mistake a test person for a real
// one. What isn't in the files is here. Each record has a key the seed finds
// it by: the location's code, the role's and the team's name.

// The people file's 0001BTRTL refers to these codes.
export const locations = [
  { code: 'LEIK', name: 'Leikanger' },
  { code: 'OSLO', name: 'Oslo' },
  { code: 'BRØN', name: 'Brønnøysund' },
]

// Unit leaders, which administrators set in ilag: the unit's orgEnhet and
// the leader's employee number.
export const leaders = [
  { unit: '10008925', person: '1001' }, // Digitaliseringsdirektoratet
  { unit: '10002031', person: '1002' }, // Fellesløsninger
  { unit: '10008675', person: '1003' }, // Digital strategi og samordning
  { unit: '10003276', person: '1004' }, // FEL - Utvikling
  { unit: '10006700', person: '1005' }, // FEL - Strategi og forretningsutvikling
  { unit: '10009528', person: '1006' }, // DSS1
  { unit: '10014302', person: '1007' }, // FEL – Backend
  { unit: '10014301', person: '1008' }, // FEL - Arkitektur og produktutvikling
]

// RAMO from Vedlegg 7 in the specification.
export const roles = [
  {
    name: 'Teameier',
    role: 'Formelt utpekt som teameier ved etablering av teamet. Teameiere bør ha personalansvar for flere av teammedlemmene og/eller et tyngre fagansvar og risikoeierskap rundt teamets leveranser.',
    responsibility: 'Sikre at teamet leverer i tråd med virksomhetens mål og har de nødvendige rammer.',
    authority: 'Fastsette mandat, mål/OKR, budsjett og prioriteringer på overordnet nivå.',
    tasks:
      'Definere mål og forventninger, godkjenne mandat og teamkontrakt, sikre linjeforankring og riktig bemanning (i dialog med andre linjeledere), evaluere teamets måloppnåelse og tilrettelegge for samspill med andre team. Tett dialog med teamleder.',
  },
  {
    name: 'Teamleder',
    role: 'Formelt utpekt som teamleder ved etablering av teamet.',
    responsibility: 'Lede teamets daglige arbeid og måloppnåelse innenfor mandatet.',
    authority:
      'Prioritere daglige aktiviteter, fordele arbeid og følge opp leveranser og kvalitet i tråd med teamets mandat og teamkontrakt.',
    tasks:
      'Planlegge, koordinere, følge opp fremdrift og leveranser, rapportere til teameier, tilrettelegge for faglig medarbeiderutvikling.',
  },
  {
    name: 'Teammedlem',
    role: 'Formelt utpekt som teammedlemmer ved etablering av teamet, eller evt. lagt til underveis ved behov.',
    responsibility: 'Levere faglige bidrag av høy kvalitet i tråd med teamets mål og mandat.',
    authority:
      'Gi faglige anbefalinger og ta faglige avgjørelser innenfor delegert fagområde og avtalte rammer.',
    tasks:
      'Bidra til felles planlegging og vurderinger samt utføre oppgaver og sikre faglig kvalitet/etterlevelse av krav innenfor med eget kompetanseområde (utvikler, designer, jurist, osv.).',
  },
  {
    name: 'Produkteier',
    role: 'Produktteam bør ha produkteier, enten kombinert med teamlederrollen eller som egen rolle i tillegg. Rollen utøves i tråd med anbefaling for produktorganisering i offentlig sektor. Begrepet produktleder brukes ikke i Digdir.',
    responsibility:
      'Sikre at produktteamet jobber med de riktige behovene og prioriteringene innenfor produktets mål, mandat og rammer, slik at produktet utvikles og forbedres over tid på en måte som gir verdi for brukerne og bidrar til ønskede nytteverdier for virksomheten og samfunnet.',
    authority: 'Forvalte og prioritere produktkøen innenfor produktets mål, mandat og rammer.',
    tasks:
      'Forvalte og prioritere produktkøen, avklare behov og forventninger med interessenter, og sørge for at teamets arbeid henger sammen med produktstrategien og virksomhetens mål.',
  },
]

// Members by employeeNumber, with their roles by name.
export const teams = [
  {
    name: 'Team Skjemabygger',
    teamType: 'product',
    description: 'Utvikler og forvalter verktøyet for å lage digitale skjema.',
    members: [
      { person: '1005', roles: ['Teameier'] },
      { person: '1008', roles: ['Teamleder', 'Produkteier'] },
      { person: '1012', roles: ['Teammedlem'] },
      { person: '1013', roles: ['Teammedlem'] },
      { person: '1018', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Team Innlogging',
    teamType: 'delivery',
    description: 'Leverer innloggingsløsningen til offentlige tjenester.',
    members: [
      { person: '1004', roles: ['Teameier'] },
      { person: '1007', roles: ['Teamleder'] },
      { person: '1009', roles: ['Produkteier'] },
      { person: '1010', roles: ['Teammedlem'] },
      { person: '1017', roles: ['Teammedlem'] },
      { person: '1019', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Prosjekt Nytt intranett',
    teamType: 'project',
    description: 'Erstatter dagens intranett innen utgangen av 2027.',
    members: [
      { person: '1003', roles: ['Teameier'] },
      { person: '1006', roles: ['Teamleder'] },
      { person: '1014', roles: ['Teammedlem'] },
      { person: '1015', roles: ['Teammedlem'] },
      { person: '1011', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Støtteteam Arbeidsflate',
    teamType: 'support',
    description: 'Gir de andre teamene felles verktøy og arbeidsflater.',
    members: [
      { person: '1002', roles: ['Teameier'] },
      { person: '1016', roles: ['Teamleder'] },
      { person: '1020', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Fagnettverk for universell utforming',
    teamType: 'network',
    description: 'Deler kunnskap om universell utforming på tvers av divisjonene.',
    members: [
      { person: '1006', roles: ['Teameier'] },
      { person: '1012', roles: ['Teamleder'] },
      { person: '1018', roles: ['Teammedlem'] },
      { person: '1010', roles: ['Teammedlem'] },
    ],
  },
] as const
