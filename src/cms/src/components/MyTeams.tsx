import type { WidgetServerProps } from 'payload'
import { Card } from '@payloadcms/ui'
import React from 'react'

import { isAdmin } from '@/access/isAdmin'
import { teamsEditedBy } from '@/access/teamEditor'

// The dashboard widget for teameiere and teamledere (TO-08, RO-06): the teams
// they edit, each a link to the team's page. It is all they see on the
// dashboard, unless they are also redaktører, who get Payload's collection
// cards below it (see `dashboard` in payload.config.ts).
export async function MyTeams({ req, user }: WidgetServerProps) {
  const { i18n, payload } = req
  if (!user || isAdmin(user)) return null
  const ids = await teamsEditedBy(payload, user)
  if (!ids.length) return null

  const { docs: teams } = await payload.find({
    collection: 'team',
    where: { id: { in: ids } },
    sort: 'name',
    pagination: false,
    depth: 0,
  })

  const en = i18n.language === 'en'
  const admin = payload.config.routes.admin

  // One card per team, like Payload's collection cards. The team's page has
  // everything: its details and its members, with add, edit and remove.
  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <h2 style={{ marginBottom: 'var(--base)' }}>{en ? 'Your teams' : 'Dine team'}</h2>
      <p style={{ marginBottom: 'var(--base)' }}>
        {en
          ? 'You can change these teams and their members, as team owner or team lead.'
          : 'Du kan endre disse teamene og medlemmene deres, som teameier eller teamleder.'}
      </p>
      <ul
        style={{
          display: 'grid',
          gap: 'var(--base)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {teams.map((team) => (
          <li key={team.id}>
            <Card
              href={`${admin}/collections/team/${team.id}`}
              title={team.active ? team.name : `${team.name} (${en ? 'closed' : 'avsluttet'})`}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
