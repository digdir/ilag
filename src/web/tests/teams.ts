// Teams and memberships as the CMS returns them, for the team page tests.

export const skjemabygger = {
  id: 7,
  name: 'Team Skjemabygger',
  description: 'Utvikler og forvalter verktøyet for å lage digitale skjema.',
  teamType: 'product',
}

export const nettverk = {
  id: 8,
  name: 'Fagnettverk for universell utforming',
  description: null,
  teamType: 'network',
}

const membership = (id: number, team: { id: number; name: string }, fullName: string, roles: string[]) => ({
  id,
  team: { id: team.id, name: team.name },
  person: { id: 100 + id, fullName },
  roles: roles.map((name, i) => ({ id: i + 1, name })),
})

// Sorted by last name, as the query asks for.
export const memberships = [
  membership(3, skjemabygger, 'Ida Haugen', ['Teammedlem']),
  membership(1, skjemabygger, 'Magnus Johansen', ['Teameier']),
  membership(2, skjemabygger, 'Emma Kristiansen', ['Teamleder', 'Produkteier']),
]

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** A fetch that answers the CMS's team and membership endpoints. */
export const cms = (answers: { team: () => Response; teammedlemskap: () => Response }) =>
  async (url: string, _init?: RequestInit) =>
    new URL(url).pathname.startsWith('/api/teammedlemskap') ? answers.teammedlemskap() : answers.team()

// What a logged-in visitor's request carries.
export const cookie = 'payload-token=visitor-token'
