import type { WidgetServerProps } from 'payload'
import React from 'react'

import { isAdmin } from '@/access/isAdmin'
import { teamsEditedBy } from '@/access/teamEditor'

// The dashboard widget for teameiere and teamledere (TO-08, RO-06): the teams
// they edit, with a link to each team and to its members. It is all they see
// on the dashboard (see `dashboard` in payload.config.ts).
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
  const membersOf = (id: number) =>
    `${admin}/collections/teammedlemskap?${new URLSearchParams({ 'where[team][equals]': String(id) })}`

  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <h2 style={{ marginBottom: 'var(--base)' }}>{en ? 'Your teams' : 'Dine team'}</h2>
      <p style={{ marginBottom: 'var(--base)' }}>
        {en
          ? 'You can change these teams and their members, as team owner or team lead.'
          : 'Du kan endre disse teamene og medlemmene deres, som teameier eller teamleder.'}
      </p>
      <ul className="dashboard__card-list" style={{ listStyle: 'none', padding: 0 }}>
        {teams.map((team) => (
          <li key={team.id}>
            <div className="card" style={{ display: 'grid', gap: 'calc(var(--base) / 2)' }}>
              <a href={`${admin}/collections/team/${team.id}`}>
                <h3 className="card__title" style={{ margin: 0 }}>
                  {team.name}
                </h3>
              </a>
              {!team.active && <span>{en ? 'Closed' : 'Avsluttet'}</span>}
              <div style={{ display: 'flex', gap: 'var(--base)' }}>
                <a href={`${admin}/collections/team/${team.id}`}>{en ? 'Edit team' : 'Rediger team'}</a>
                <a href={membersOf(team.id)}>{en ? 'Members' : 'Medlemmer'}</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
