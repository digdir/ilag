import type { Field, GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { collectionGroups } from '../collections/groups'
import { MARKDOWN_HELP } from '../utils/helptexts'

/** Text in markdown, such as a list or links, rendered without raw HTML (ADR-0007). */
const markdown = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'textarea',
  admin: { description: description ? `${description} ${MARKDOWN_HELP}` : MARKDOWN_HELP },
})

/** Documents uploaded to Medier, such as PDFs, linked with their alternative text. */
const files: Field = {
  name: 'files',
  label: 'Filer',
  type: 'upload',
  relationTo: 'medier',
  hasMany: true,
  admin: { description: 'Lenkes til med filens alternative tekst, som «Tildelingsbrev 2026 (PDF)».' },
}

// Digdir's styringsfundament (SF-01): vision, mission, goals, values, users
// and roles on one page, in fixed fields; the page decides the layout.
// Administrators maintain it (SF-02); every change is kept as a version
// (SF-05), and readers see only the published one.
export const GovernanceFoundation: GlobalConfig = {
  slug: 'styringsfundament',
  dbName: 'governance_foundation',
  label: 'Styringsfundament',
  typescript: {
    interface: 'GovernanceFoundation',
  },
  admin: {
    group: collectionGroups.governance,
  },
  access: {
    // Administrators may read drafts; everyone else only what is published, also with `?draft=true`.
    read: ({ req }) => (isAdmin(req.user) ? true : isSignedIn(req.user) && { _status: { equals: 'published' } }),
    readVersions: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
  },
  versions: {
    drafts: true,
    max: 0,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Visjon og samfunnsoppdrag',
          fields: [
            { name: 'intro', label: 'Innledning', type: 'textarea' },
            { name: 'vision', label: 'Vår visjon', type: 'textarea' },
            { name: 'mission', label: 'Vårt samfunnsoppdrag', type: 'textarea' },
            {
              name: 'documents',
              label: 'Eksterne styrende dokumenter',
              type: 'array',
              labels: { singular: 'Dokument', plural: 'Dokumenter' },
              admin: { description: 'Vises under samfunnsoppdraget, bak «Vis eksterne styrende dokumenter».' },
              fields: [
                { name: 'title', label: 'Tittel', type: 'text', required: true },
                { name: 'tag', label: 'Merkelapp', type: 'text', admin: { description: 'For eksempel «Varig» eller «Årlig».' } },
                { name: 'summary', label: 'Sammendrag', type: 'textarea' },
                markdown('details', 'Mer om dokumentet', 'Vises bak «Les mer».'),
                files,
              ],
            },
          ],
        },
        {
          label: 'Målbilde',
          fields: [
            {
              name: 'goals',
              label: 'Vårt målbilde',
              type: 'array',
              labels: { singular: 'Mål', plural: 'Mål' },
              fields: [
                { name: 'title', label: 'Mål', type: 'text', required: true },
                markdown('details', 'Delmål', 'Vises når målbildet åpnes med knappen i midten. Ta med lenken «Les meir om målet».'),
              ],
            },
            {
              name: 'plan',
              label: 'Virksomhetsplanen',
              type: 'group',
              fields: [
                { name: 'title', label: 'Overskrift', type: 'text', defaultValue: 'Virksomhetsplanen' },
                markdown('text', 'Tekst'),
                files,
              ],
            },
          ],
        },
        {
          label: 'Verdiar',
          fields: [
            {
              name: 'values',
              label: 'Våre verdiar',
              type: 'array',
              labels: { singular: 'Verdi', plural: 'Verdiar' },
              fields: [
                { name: 'name', label: 'Verdi', type: 'text', required: true },
                { name: 'text', label: 'Tekst', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Brukarar og roller',
          fields: [
            markdown('audiences', 'Våre brukarar', 'For eksempel én brukargruppe per punkt, og en tekst under.'),
            markdown('roles', 'Våre roller', 'For eksempel én rolle per punkt.'),
            { name: 'footnote', label: 'Fotnote', type: 'textarea', admin: { description: 'Vises nederst på siden.' } },
          ],
        },
      ],
    },
  ],
}
