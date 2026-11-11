// Teams as the CMS returns them, members included, for the team page tests.

const membership = (id: number, fullName: string, roles: string[]) => ({
  id,
  person: { id: 100 + id, fullName },
  roles: roles.map((name, i) => ({ id: i + 1, name })),
})

export const skjemabygger = {
  id: 7,
  name: 'Team Skjemabygger',
  description: 'Utvikler og forvalter verktøyet for å lage digitale skjema.',
  teamType: 'product',
  members: {
    docs: [
      membership(1, 'Magnus Johansen', ['Teameier']),
      membership(2, 'Emma Kristiansen', ['Teamleder', 'Produkteier']),
      membership(3, 'Ida Haugen', ['Teammedlem']),
    ],
  },
}

export const nettverk = {
  id: 8,
  name: 'Fagnettverk for universell utforming',
  description: null,
  teamType: 'network',
  members: { docs: [] },
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// What a logged-in visitor's request carries.
export const cookie = 'payload-token=visitor-token'
