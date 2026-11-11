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

// The roles in the prototype, with RAMO as it shows them (ROLES, ROLE_EXTRA,
// LINE_MANAGER, AREA_OWNER, EMPLOYEE and AI_AGENT in prototype/Saman.dc.html),
// and the team types they are relevant for by name (RO-03, Vedlegg 7): the
// project roles replace teameier, teamleder and teammedlem in a prosjektteam,
// and a fagnettverk has a fagkoordinator instead of a teamleder. The roles
// teams work with, but that aren't roles in a team, have none.
export const roles = [
  {
    name: 'Teameier',
    role: 'Formelt utpekt som teameier ved etablering av teamet. Teameiere bør ha personalansvar for flere av teammedlemmene og/eller et tyngre fagansvar og risikoeierskap rundt teamets leveranser. For team som hører til et innsatsområde vil teameieren fortsatt måtte sørge for at teamet har de nødvendige rammene til å kunne levere, men teameierens ansvar, myndighet og oppgaver vil være avgrenset til drift/linjeoppgaver som ligger i teamet, mens områdeansvarlig vil styre ny utvikling og samkjøringsaktiviteter som kommer via innsatsområdet. Teameier og områdeansvarlig må formelt avtale kapasitetsfordeling og evt. endringer i mandat seg i mellom når et team går inn i et innsatsområde.',
    responsibility:
      'Sikre at teamet leverer i tråd med virksomhetens mål og har de nødvendige rammer.',
    authority: 'Fastsette mandat, mål/OKR, budsjett og prioriteringer på overordnet nivå.',
    tasks:
      'Definere mål og forventninger, godkjenne mandat og teamkontrakt, sikre linjeforankring og riktig bemanning i dialog med andre linjeledere, evaluere teamets måloppnåelse og tilrettelegge for samspill med andre team. Tett dialog med teamleder.',
    teamTypes: ['Produktteam', 'Leveranseteam', 'Støtteteam', 'Fagnettverk'],
  },
  {
    name: 'Teamleder',
    role: 'Formelt utpekt som teamleder ved etablering av teamet.',
    responsibility: 'Lede teamets daglige arbeid og måloppnåelse innenfor mandatet.',
    authority:
      'Prioritere daglige aktiviteter, fordele arbeid og følge opp leveranser og kvalitet i tråd med teamets mandat og teamkontrakt.',
    tasks:
      'Planlegge, koordinere, følge opp framdrift og leveranser, rapportere til teameier og tilrettelegge for faglig medarbeiderutvikling.',
    teamTypes: ['Produktteam', 'Leveranseteam', 'Støtteteam'],
  },
  {
    name: 'Teammedlem',
    role: 'Formelt utpekt som teammedlem ved etablering av teamet, eller lagt til underveis ved behov.',
    responsibility: 'Levere faglige bidrag av høy kvalitet i tråd med teamets mål og mandat.',
    authority:
      'Gi faglige anbefalinger og ta faglige avgjørelser innenfor delegert fagområde og avtalte rammer.',
    tasks:
      'Bidra til felles planlegging og vurderinger, utføre oppgaver og sikre faglig kvalitet innenfor eget kompetanseområde: utvikler, designer, jurist og så videre.',
    teamTypes: ['Produktteam', 'Leveranseteam', 'Støtteteam', 'Fagnettverk'],
  },
  {
    name: 'Produkteier',
    role: 'Produktteam bør ha produkteier, enten kombinert med teamlederrollen eller som egen rolle i tillegg. Rollen utøves i tråd med anbefaling for produktorganisering i offentlig sektor. Begrepet produktleder brukes ikke i Digdir.',
    responsibility:
      'En produkteier har ansvar for å sikre at produktteamet jobber med de riktige behovene og prioriteringene innenfor produktets mål, mandat og rammer. Rollen skal bidra til at produktet utvikles og forbedres over tid på en måte som gir verdi for brukerne og bidrar til ønskede nytteverdier for virksomheten og samfunnet.',
    authority: 'Forvalter og prioriterer produktkøen innenfor produktets mål, mandat og rammer.',
    tasks:
      'Produkteieren har vanligvis ansvar for å forvalte og prioritere produktkøen, avklare behov og forventninger med interessenter, og sørge for at teamets arbeid henger sammen med produktstrategien og virksomhetens mål.',
    teamTypes: ['Produktteam'],
  },
  {
    name: 'Fagkoordinator',
    role: 'Utpekt som koordinator for fagnettverket. Et fagnettverk har ikke teamleder, siden det ikke svarer for en felles leveranse. Koordinatoren er registrert i teamoversikten.',
    responsibility:
      'Ansvar for at nettverket har et tydelig formål, relevant aktivitet og verdi for deltakerne.',
    authority:
      'Beslutter møteform, tema og hvordan kunnskap deles, innenfor formålet nettverket er opprettet for. Kan ikke pålegge deltakerne oppgaver eller leveranser.',
    tasks:
      'Legge til rette for aktivitet, kalle inn og fasilitere samlinger, avklare hvem nettverket er for og hvordan deltakelse fungerer, og sørge for at kunnskap, erfaringer og praksis deles videre.',
    teamTypes: ['Fagnettverk'],
  },
  {
    name: 'Prosjekteier',
    role: 'Formelt utpekt som prosjekteier ved etablering av prosjektet.',
    responsibility:
      'Sikre at prosjektet leverer i tråd med virksomhetens mål og har de nødvendige rammer.',
    authority: 'Fastsette mandat, mål/OKR, budsjett og prioriteringer på overordnet nivå.',
    tasks:
      'Definere mål og forventninger, godkjenne mandat, sikre linjeforankring og riktig bemanning i dialog med andre linjeledere, evaluere prosjektets måloppnåelse og tilrettelegge for samspill med andre prosjekter. Tett dialog med prosjektleder.',
    teamTypes: ['Prosjektteam'],
  },
  {
    name: 'Prosjektleder',
    role: 'Formelt utpekt som prosjektleder ved etablering av prosjektet.',
    responsibility: 'Lede prosjektets daglige arbeid og måloppnåelse innenfor mandatet.',
    authority:
      'Prioritere daglige aktiviteter, fordele arbeid og følge opp leveranser og kvalitet i tråd med prosjektets mandat.',
    tasks:
      'Planlegge, koordinere, følge opp framdrift og leveranser, rapportere til prosjekteier og tilrettelegge for faglig medarbeiderutvikling.',
    teamTypes: ['Prosjektteam'],
  },
  {
    name: 'Prosjektdeltaker',
    role: 'Formelt utpekt som prosjektdeltaker ved etablering av prosjektet, eller lagt til underveis ved behov.',
    responsibility: 'Levere faglige bidrag av høy kvalitet i tråd med prosjektets mål og mandat.',
    authority:
      'Gi faglige anbefalinger og ta faglige avgjørelser innenfor delegert fagområde og avtalte rammer.',
    tasks:
      'Bidra til felles planlegging og vurderinger, utføre oppgaver og sikre faglig kvalitet innenfor eget kompetanseområde: utvikler, designer, jurist og så videre.',
    teamTypes: ['Prosjektteam'],
  },
  {
    name: 'Linjeleder',
    role: 'Formelt ansatt som divisjonsdirektør, avdelingsleder eller seksjonsleder med personalansvar.',
    responsibility:
      'Er ressurseier, har arbeidsgiveransvaret og beslutningsmyndighet i arbeidsforholdet. Har fagansvar og budsjettansvar. Bygger og sikrer riktig kompetansekapasitet basert på behov i linja og i innsatsområdene, sørger for ressurstildeling (allokering). Setter retning og fart på det arbeidet som skal løses i linja. Ivaretar personalansvar og medarbeiderutvikling. Leder strategisk rekruttering og omstilling (kompetanseutvikling).',
    authority:
      'Godkjenner ansettelser og oppsigelser. Setter lønn, godkjenner ferie og fravær. Godkjenner kurs, sertifiseringer og opplæringsbudsjetter og rollebeskrivelser. Bestemmer endelig ressurstildeling ved konflikter.',
    tasks:
      'Gjennomfører medarbeidersamtaler og lønnssamtaler. Følger opp sykefravær og HR-prosesser. Planlegger langsiktige kompetanseløp og kurs. Kjører rekrutteringsprosesser. Matcher konsulenter/ansatte mot ressursforespørsler.',
    teamTypes: [],
  },
  {
    name: 'Områdeansvarlig',
    role: 'Oppnevnt av TLG for ett strategisk innsatsområde, for en tidsavgrenset mandatperiode (evalueres årlig). Rapporterer til Frode og er medlem av porteføljestyret. Hører personalmessig til VSU (Strategi og styring). Er ikke linjeleder og har ikke personalansvar.',
    responsibility:
      'Sikre at summen av det Digdir gjør innen innsatsområdet gir ønsket effekt, innenfor avtalt mandat, økonomiske rammer og ressursallokering. Leveranseansvaret ligger imidlertid hos de teamene som er knyttet til innsatsområdet.',
    authority:
      'Sette retning og prioritere mål, tiltak og behov innenfor sitt innsatsområde. Disponere dedikerte ressurser og midler tildelt området, og prioritere innenfor avtalte bidrag fra linjen. Kan ikke ensidig øke linjens bidrag eller styre teamenes daglige arbeid.',
    tasks:
      'Konkretisere effektmål/OKR for innsatsområdet, holde et samlet porteføljebilde for området, avtale bidrag med linjeledere, vurdere virkemiddelbruken, varsle når målene er truet og gi porteføljestyret beslutningsgrunnlag. Tett dialog med linjeledere/teameiere, produkteiere og teamledere.',
    teamTypes: [],
  },
  {
    name: 'Medarbeider',
    role: 'Formelt ansatt under en divisjonsdirektør, avdelingsleder eller seksjonsleder.',
    responsibility:
      'Utfører arbeidsoppgaver og leverer på avtalte mål. Utviser faglig skjønn innenfor eget ansvarsområde (fagområde). Melder fra om eventuelle risikoer og avvik, kapasitet og belastning og om kompetansen brukes på riktig måte. Tar et aktivt medansvar for egen kompetanseutvikling ved å identifisere egne læringsbehov, søke ny kunnskap og ta initiativ til å utvikle ferdigheter som bidrar til faglig vekst og bedre oppgaveløsning. Og samarbeider med andre til forbedring av leveranser og arbeidsmåter.',
    authority:
      'Tar beslutninger innenfor eget ansvarsområde (fagområde). Eskalerer til relevant leder ang. ev. risiko og avvik.',
    tasks:
      'Utfører avtalte arbeidsoppgaver. Oppfyller avtalte forpliktelser om kompetanseheving. Bidrar til forbedring av leveranser, og måten vi jobber på.',
    teamTypes: [],
  },
  {
    name: 'KI-agent',
    role: 'Kunstig intelligens som deltar i teamets arbeid som støtte, ikke som medlem. Rollen er aktuell for alle team.',
    responsibility: 'Støtte kunnskapsarbeid og effektivisering',
    authority: 'Ingen formell avgjerdsmynde',
    tasks:
      'Analyse, samanfatting, utkast til dokument, idéutvikling, informasjonsinnhenting og automatisert støtte',
    teamTypes: [],
  },
]

// The team types in TK-01, described as in the prototype.
export const teamTypes = [
  {
    name: 'Prosjektteam',
    description:
      'Et prosjektteam etableres for å løse en avgrenset oppgave med et definert mål og en tydelig avslutning. Når målet er nådd og oppgaven er løst, kan teamet oppløses.',
  },
  {
    name: 'Støtteteam',
    description:
      'Et støtteteam har et varig ansvar for å skape verdi internt i Digdir, slik at medarbeidere, ledere og andre team kan løse sine oppgaver på en effektiv og god måte.',
  },
  {
    name: 'Leveranseteam',
    description:
      'Et leveranseteam har et varig og helhetlig ansvar for en definert leveranse som skaper verdi utenfor Digdir. Teamet skal kjenne behovene til brukerne og bruke innsikten til å utvikle, levere og forbedre leveransen over tid.',
  },
  {
    name: 'Produktteam',
    description:
      'Et produktteam er et leveranseteam med varig og helhetlig ansvar for ett eller flere produkter. Teamet skal ha tilstrekkelig kompetanse, myndighet og handlingsrom til å prioritere ut fra brukerbehov, mål og ønskede effekter.',
  },
  {
    name: 'Fagnettverk',
    description:
      'Et fagnettverk samler personer som har et felles fagområde, kompetanse, interesse eller profesjonell bakgrunn, og som ønsker å dele kunnskap, lære av hverandre og utvikle fagområdet. Nettverket kan for eksempel organiseres som et fagforum, nettverk eller laug — eller med et helt annet navn.\n\nI motsetning til et team har et fagnettverk vanligvis ikke ansvar for en felles leveranse eller et felles resultat, og medlemmene har normalt sitt ansvar og sine oppgaver andre steder i organisasjonen.\n\nEt tydelig formål gjør det enklere å skape relevant aktivitet og verdi for deltakerne, samtidig som nettverket beholder den fleksible formen som skiller det fra et team.',
  },
]

// Team types by name, and members by employeeNumber with their roles by name.
export const teams = [
  {
    name: 'Team Skjemabygger',
    teamType: 'Produktteam',
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
    teamType: 'Leveranseteam',
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
    teamType: 'Prosjektteam',
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
    teamType: 'Støtteteam',
    description: 'Gir de andre teamene felles verktøy og arbeidsflater.',
    members: [
      { person: '1002', roles: ['Teameier'] },
      { person: '1016', roles: ['Teamleder'] },
      { person: '1020', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Fagnettverk for universell utforming',
    teamType: 'Fagnettverk',
    description: 'Deler kunnskap om universell utforming på tvers av divisjonene.',
    members: [
      { person: '1006', roles: ['Teameier'] },
      { person: '1012', roles: ['Teamleder'] },
      { person: '1018', roles: ['Teammedlem'] },
      { person: '1010', roles: ['Teammedlem'] },
    ],
  },
] as const
