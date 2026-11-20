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

// Unit descriptions, which administrators set in ilag: the unit's orgEnhet
// and a few sentences on what it does. Made up, like the prototype's.
export const unitDescriptions = [
  {
    unit: '10008925', // Digitaliseringsdirektoratet
    description:
      'Digitaliseringsdirektoratet er regjeringens fagorgan for digitalisering og samordning av offentlig sektor.',
  },
  {
    unit: '10002031', // Fellesløsninger
    description:
      'Utvikler, drifter og forvalter de nasjonale fellesløsningene som offentlige virksomheter bruker for å levere digitale tjenester.',
  },
  {
    unit: '10003276', // FEL - Utvikling
    description: 'Utvikler og videreutvikler fellesløsningene, fra arkitektur til drift.',
  },
  {
    unit: '10014302', // FEL – Backend
    description: 'Lager og vedlikeholder tjenestene bak fellesløsningene.',
  },
]

// Units that advise all of Digdir (LO-06), which administrators set in ilag:
// the units' orgEnhet. Like the prototype's Brukeropplevelse og design and
// Marked og utbredelse.
export const advisesAllOfDigdir = [
  '10014090', // BOD – Interaksjonsdesign
  '10014306', // FEL – Marked
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
    code: 'teameier',
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
    code: 'teamleder',
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
    code: 'teammedlem',
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
    code: 'produkteier',
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
    code: 'fagkoordinator',
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
    code: 'prosjekteier',
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
    code: 'prosjektleder',
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
    code: 'prosjektdeltaker',
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
    code: 'linjeleder',
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
    code: 'omradeansvarlig',
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
    code: 'medarbeider',
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
    code: 'ki-agent',
    role: 'Kunstig intelligens som deltar i teamets arbeid som støtte, ikke som medlem. Rollen er aktuell for alle team.',
    responsibility: 'Støtte kunnskapsarbeid og effektivisering',
    authority: 'Ingen formell avgjerdsmynde',
    tasks:
      'Analyse, samanfatting, utkast til dokument, idéutvikling, informasjonsinnhenting og automatisert støtte',
    teamTypes: [],
  },
]

// Lists that editors write one point per line.
const lines = (...points: string[]) => points.join('\n')

// The team types in TK-01, described as in the prototype, with what must be
// in place for each (TK-04) from the prototype's wizard results.
export const teamTypes = [
  {
    name: 'Prosjektteam',
    description:
      'Et prosjektteam etableres for å løse en avgrenset oppgave med et definert mål og en tydelig avslutning. Når målet er nådd og oppgaven er løst, kan teamet oppløses.',
    requirements: lines(
      'Et tydelig prosjektmandat som beskriver formål, mål, rammer og myndighet',
      'Prosjekteier, prosjektleder og medlemmer registrert i teamoversikten',
      'En teamkontrakt om samarbeid, kommunikasjon og beslutninger',
      'For større prosjekter: Digdirs prosjektveiviser som støtte',
    ),
  },
  {
    name: 'Støtteteam',
    description:
      'Et støtteteam har et varig ansvar for å skape verdi internt i Digdir, slik at medarbeidere, ledere og andre team kan løse sine oppgaver på en effektiv og god måte.',
    requirements: lines(
      'Et tydelig mandat som beskriver formål, ansvar, mål og handlingsrom',
      'Teameier, teamleder og medlemmer registrert i teamoversikten',
      'En teamkontrakt om samarbeid, kommunikasjon og beslutninger',
    ),
  },
  {
    name: 'Leveranseteam',
    description:
      'Et leveranseteam har et varig og helhetlig ansvar for en definert leveranse som skaper verdi utenfor Digdir. Teamet skal kjenne behovene til brukerne og bruke innsikten til å utvikle, levere og forbedre leveransen over tid.',
    requirements: lines(
      'Et tydelig mandat som beskriver formål, ansvar, mål og handlingsrom',
      'Teameier, teamleder og medlemmer registrert i teamoversikten',
      'En teamkontrakt om samarbeid, kommunikasjon og beslutninger',
    ),
  },
  {
    name: 'Produktteam',
    description:
      'Et produktteam er et leveranseteam med varig og helhetlig ansvar for ett eller flere produkter. Teamet skal ha tilstrekkelig kompetanse, myndighet og handlingsrom til å prioritere ut fra brukerbehov, mål og ønskede effekter.',
    requirements: lines(
      'En produkteier med tydelig ansvar for produktet',
      'Et mandat som beskriver formål, mål, ansvar, rammer og handlingsrom',
      'En produktstrategi: retning, hvem brukerne er og hvilket problem produktet løser',
      'Teameier, teamleder og medlemmer registrert i teamoversikten',
      'En teamkontrakt som avklarer hvordan teamet skal fungere i praksis',
    ),
  },
  {
    name: 'Fagnettverk',
    description:
      'Et fagnettverk samler personer som har et felles fagområde, kompetanse, interesse eller profesjonell bakgrunn, og som ønsker å dele kunnskap, lære av hverandre og utvikle fagområdet. Nettverket kan for eksempel organiseres som et fagforum, nettverk eller laug — eller med et helt annet navn.\n\nI motsetning til et team har et fagnettverk vanligvis ikke ansvar for en felles leveranse eller et felles resultat, og medlemmene har normalt sitt ansvar og sine oppgaver andre steder i organisasjonen.\n\nEt tydelig formål gjør det enklere å skape relevant aktivitet og verdi for deltakerne, samtidig som nettverket beholder den fleksible formen som skiller det fra et team.',
    requirements: lines(
      'Et tydelig formål som beskriver hvorfor nettverket finnes og hva det skal bidra til',
      'Avklart hvem nettverket er for, og hvordan deltakelse og medlemskap fungerer',
      'Én eller flere personer som koordinerer og legger til rette for aktivitet, registrert i Digdirs teamoversikt',
      'Avklart hvordan nettverket skal dele kunnskap, erfaringer og praksis',
    ),
  },
]

// The team type wizard (TK-03): Vedlegg 1 as the prototype's WIZARD has it.
// The prototype adds the question «fellesskap» after «Hovedsakelig nei», so
// Fagnettverk can be reached, and «Vurder» points to «verdi» and «produkt».
// Answers lead to a question by its `key`, which is only for the seed, or to
// a team type by name; one that leads to neither ends the wizard with its own
// hint as advice. Leaves first, so each answer's question exists when it is
// created.
export const wizardQuestions = [
    {
      key: 'produkt',
      title: 'Leveranseteam eller produktteam?',
      intro:
        'Noen leveranser har egenskaper som gjør det hensiktsmessig å organisere og styre dem som produkter. Produktteam kan derfor ses som en særskilt type leveranseteam.',
      considerations: lines(
        'Har leveransen et tydelig problemområde eller behov den løser?',
        'Har den brukere med målbare behov?',
        'Er den levende og endres løpende basert på innsikt, data og tilbakemeldinger?',
        'Har den forretningsmessig betydning, for eksempel gjennom effektivisering, inntekter eller brukeropplevelse?',
      ),
      answers: [
        {
          label: 'Ja, dette har egenskapene til et produkt',
          hint: 'Leveransen bør eies og utvikles av et tverrfaglig team med produkteier.',
          to: { teamType: 'Produktteam' },
        },
        {
          label: 'Nei, men leveransen skaper verdi utenfor Digdir',
          hint: 'En digital løsning, tjeneste, kunnskap eller sammenhengende brukerreise.',
          to: { teamType: 'Leveranseteam' },
        },
      ],
    },
    {
      key: 'verdi',
      title: 'Hvem skal teamet først og fremst skape verdi for?',
      intro: 'Når oppgaven krever et varig team, er neste spørsmål hvem teamet primært skal skape verdi for.',
      considerations: lines(
        'Er mottakerne innbyggere, virksomheter eller offentlig sektor utenfor Digdir?',
        'Eller er de medarbeidere, ledere og andre team i Digdir?',
      ),
      answers: [
        {
          label: 'Primært utenfor Digdir',
          hint: 'Arbeidet er rettet mot innbyggere, virksomheter, offentlig sektor eller andre aktører utenfor Digdir.',
          to: { question: 'produkt' },
        },
        {
          label: 'Primært internt i Digdir',
          hint: 'Arbeidet er rettet mot medarbeidere, ledere eller andre team og enheter i Digdir.',
          to: { teamType: 'Støtteteam' },
        },
      ],
    },
    {
      key: 'slutt',
      title: 'Har oppgaven en definert avslutning?',
      intro: 'Noen oppgaver har et tydelig sluttpunkt, mens andre krever et kontinuerlig ansvar over tid.',
      considerations: lines(
        'Skal teamet nå et definert mål eller levere et bestemt resultat?',
        'Er det mulig å si når oppgaven er ferdig?',
        'Kan teamet oppløses når målet eller resultatet er nådd?',
      ),
      answers: [
        {
          label: 'Ja, oppgaven har en definert avslutning',
          hint: 'Teamet etableres for å løse en avgrenset oppgave og kan oppløses når den er løst.',
          to: { teamType: 'Prosjektteam' },
        },
        {
          label: 'Nei, oppgaven krever kontinuerlig ansvar',
          hint: 'Det vil fortsatt være behov for å utvikle, forvalte, forbedre eller levere noe over tid.',
          to: { question: 'verdi' },
        },
      ],
    },
    {
      key: 'fellesskap',
      title: 'Er formålet å dele kunnskap og utvikle et fagområde?',
      intro:
        'Noen behov handler ikke om å levere noe sammen, men om å lære av hverandre og utvikle faget. Da kan et fagnettverk være riktig form.',
      considerations: lines(
        'Samler dette personer med felles fagområde, kompetanse, interesse eller profesjonell bakgrunn?',
        'Er hovedformålet å dele kunnskap, lære av hverandre og utvikle fagområdet?',
        'Har deltakerne sitt ansvar og sine oppgaver andre steder i organisasjonen?',
        'Er det ingen felles leveranse eller felles resultat de skal svare for?',
      ),
      answers: [
        {
          label: 'Ja, dette handler om fag og læring',
          hint: 'Deltakerne deler fagområde, men har ikke ansvar for en felles leveranse.',
          to: { teamType: 'Fagnettverk' },
        },
        {
          label: 'Nei, ingen av formene passer',
          hint: 'Verken team eller fagnettverk treffer behovet. Vurder om oppgaven kan løses gjennom individuelt ansvar eller enklere koordinering i linjen.',
          to: null,
        },
      ],
    },
    {
      key: 'team',
      isStart: true,
      title: 'Egner oppgaven seg for teamarbeid?',
      intro:
        'Team er en egnet arbeidsform når oppgaven løses bedre gjennom tett samarbeid og felles ansvar enn ved at enkeltpersoner arbeider hver for seg og koordinerer ved behov.',
      considerations: lines(
        'Krever oppgaven at flere personer samarbeider tett for å lykkes?',
        'Er personene gjensidig avhengige av hverandres arbeid, kompetanse eller perspektiver?',
        'Har de et felles mål eller resultat som de sammen kan ta ansvar for?',
        'Krever oppgaven løpende koordinering, problemløsning eller prioritering?',
        'Er det en fordel at de som utfører arbeidet lærer, tilpasser seg og tar beslutninger sammen?',
      ),
      answers: [
        {
          label: 'Hovedsakelig ja',
          hint: 'Oppgaven kan egne seg godt for teamarbeid. Gå videre og vurder hva slags team som trengs.',
          to: { question: 'slutt' },
        },
        {
          label: 'Hovedsakelig nei',
          hint: 'Det er ikke sikkert team er den mest hensiktsmessige arbeidsformen. Vurder om oppgaven kan løses gjennom individuelt ansvar, enklere koordinering i linjen, eller som et fagnettverk.',
          to: { question: 'fellesskap' },
        },
      ],
    },
] as const

// Every team type by name, for the tools that suit all of them.
const allTeamTypes = teamTypes.map((type) => type.name)

// The toolbox in the prototype (TOOLS), with team types by name from its «For
// hvem». A tool every team can use is linked to every team type, as the roles
// are. Links only where the prototype names a real site.
export const tools = [
  {
    name: 'Teammandat',
    toolType: 'mal',
    teamTypes: ['Produktteam', 'Leveranseteam', 'Støtteteam', 'Fagnettverk'],
    description:
      'Sier hvorfor teamet finnes, hva det har ansvar for, hvilket handlingsrom det har og hvordan det skal skape verdi over tid.',
    resources: [],
  },
  {
    name: 'Prosjektmandat',
    toolType: 'mal',
    teamTypes: ['Prosjektteam'],
    description: 'Beskriver formål, mål, rammer og myndighet for et prosjekt med definert start og slutt.',
    resources: [],
  },
  {
    name: 'Teamkontrakt',
    toolType: 'mal',
    teamTypes: allTeamTypes,
    description:
      'Avklarer hvordan medlemmene skal samarbeide, kommunisere, ta beslutninger og håndtere uenighet.',
    resources: [],
  },
  {
    name: 'OKR',
    toolType: 'metode',
    teamTypes: allTeamTypes,
    description:
      'Målstyring som holder fokus på hva teamet vil oppnå og hvordan suksess måles. Fungerer best når strategisk retning ovenfra møter operativt eierskap i teamene.',
    resources: [],
  },
  {
    name: 'Prosjektveiviseren',
    toolType: 'veileder',
    teamTypes: ['Prosjektteam'],
    description:
      'Digdirs støtte for planlegging, organisering og gjennomføring av større eller mer komplekse prosjekter.',
    // The address the specification links to.
    resources: [{ label: 'Prosjektveiviseren', url: 'https://prosjektveiviseren.digdir.no/' }],
  },
  {
    name: 'Produktorganisering i offentlig sektor',
    toolType: 'veileder',
    teamTypes: ['Produktteam'],
    description:
      'Anbefaling som gir veiledning om produktorganisering, og som bør brukes ved etablering og videreutvikling av produktteam.',
    resources: [],
  },
  {
    name: 'Retrospektiv',
    toolType: 'metode',
    teamTypes: allTeamTypes,
    description: 'Fast øvelse der teamet ser tilbake på perioden og blir enige om hva som skal endres.',
    resources: [],
  },
  {
    name: 'DevOps',
    toolType: 'metode',
    teamTypes: ['Produktteam'],
    description:
      'Arbeidsmåte der utvikling og drift er samlet i samme team, med små og hyppige endringer, automatisert testing og utrulling, og tett oppfølging av løsningen i bruk.',
    resources: [],
  },
  {
    name: 'Helsesjekk for team',
    toolType: 'metode',
    teamTypes: allTeamTypes,
    description: 'Jevnlig pulsmåling av samarbeid, mestring og retning i teamet.',
    resources: [],
  },
  {
    name: 'Produktstrategi',
    toolType: 'mal',
    teamTypes: ['Produktteam'],
    description: 'Beskriver produktets retning, hvem brukerne er og hvilket problem produktet løser for dem.',
    resources: [],
  },
  {
    name: 'Team Restart',
    toolType: 'metode',
    teamTypes: allTeamTypes,
    description:
      'Opplegg for å starte et etablert team på nytt, for eksempel etter endringer i mandat, sammensetning eller retning.',
    resources: [],
  },
  {
    name: 'KI Skills Bibliotek',
    toolType: 'verktoy',
    teamTypes: allTeamTypes,
    description: 'Samling av ferdige KI-ferdigheter som team kan ta i bruk og dele med hverandre.',
    resources: [],
  },
  {
    name: 'Begrepskatalogen',
    toolType: 'verktoy',
    teamTypes: allTeamTypes,
    description: 'Nasjonal katalog for begrepsdefinisjoner. Begreper i ilag kan kobles til definisjoner her.',
    toolUrl: 'https://data.norge.no/concepts',
    resources: [],
  },
  {
    name: 'Figma',
    toolType: 'verktoy',
    teamTypes: allTeamTypes,
    description: 'Digdir har lisens. Brukes til design, skisser og samarbeid om grensesnitt.',
    toolUrl: 'https://www.figma.com',
    resources: [],
  },
] as const

// Team types by name, members by employeeNumber with their roles by name,
// following the roles recommended for each team type (RO-03), and the tools
// the team uses by name (VK-06).
export const teams = [
  {
    name: 'Team Skjemabygger',
    teamType: 'Produktteam',
    description: 'Utvikler og forvalter verktøyet for å lage digitale skjema.',
    tools: ['Teammandat', 'OKR', 'DevOps', 'Figma'],
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
    tools: ['Teammandat', 'Teamkontrakt', 'Retrospektiv'],
    members: [
      { person: '1004', roles: ['Teameier'] },
      { person: '1007', roles: ['Teamleder'] },
      { person: '1009', roles: ['Teammedlem'] },
      { person: '1010', roles: ['Teammedlem'] },
      { person: '1017', roles: ['Teammedlem'] },
      { person: '1019', roles: ['Teammedlem'] },
    ],
  },
  {
    name: 'Prosjekt Nytt intranett',
    teamType: 'Prosjektteam',
    description: 'Erstatter dagens intranett innen utgangen av 2027.',
    tools: ['Prosjektmandat', 'Prosjektveiviseren'],
    members: [
      { person: '1003', roles: ['Prosjekteier'] },
      { person: '1006', roles: ['Prosjektleder'] },
      { person: '1014', roles: ['Prosjektdeltaker'] },
      { person: '1015', roles: ['Prosjektdeltaker'] },
      { person: '1011', roles: ['Prosjektdeltaker'] },
    ],
  },
  {
    name: 'Støtteteam Arbeidsflate',
    teamType: 'Støtteteam',
    description: 'Gir de andre teamene felles verktøy og arbeidsflater.',
    tools: [],
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
    tools: [],
    members: [
      { person: '1006', roles: ['Teameier'] },
      { person: '1012', roles: ['Fagkoordinator'] },
      { person: '1018', roles: ['Teammedlem'] },
      { person: '1010', roles: ['Teammedlem'] },
    ],
  },
] as const

// Users to log in as with a password, linked to people in the teams above.
export const users = [
  { person: '1008', email: 'teamleder@example.com', description: 'teamleder for Team Skjemabygger' },
  { person: '1004', email: 'teameier@example.com', description: 'teameier for Team Innlogging' },
  { person: '1012', email: 'ihaugen@example.com', description: 'teammedlem and fagkoordinator, edits no team' },
] as const
