import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { collectionGroups } from '../collections/groups'
import { validSiteLink } from '../utils/links'

const LINK_HELP = 'En side i ilag, som «/verktoy/veiviser», eller en lenke som starter med https://.'

// The front page (3.15): the texts at the top, the entrances for new
// employees (FS-02) and for those who are to set up a team (FS-03), and the
// changes in ilag (FS-06), in fixed fields; the page decides the layout and
// adds the newest tools from the toolbox (FS-05) itself. Administrators
// maintain it, and every change is kept as a version, as for the
// styringsfundament. Readers see only the published one.
export const FrontPage: GlobalConfig = {
  slug: 'forside',
  dbName: 'front_page',
  label: 'Forside',
  typescript: {
    interface: 'FrontPage',
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
          label: 'Toppen',
          fields: [
            {
              name: 'eyebrow',
              label: 'Overtittel',
              type: 'text',
              admin: { description: 'Vises med små bokstaver over overskriften.' },
            },
            { name: 'title', label: 'Overskrift', type: 'text' },
            { name: 'intro', label: 'Innledning', type: 'textarea' },
            {
              name: 'image',
              label: 'Illustrasjon',
              type: 'upload',
              relationTo: 'medier',
              admin: { description: 'Vises ved siden av overskriften. Uten et bilde vises ilags egen illustrasjon.' },
            },
          ],
        },
        {
          label: 'Innganger',
          fields: [
            {
              name: 'entries',
              label: 'Innganger',
              type: 'array',
              labels: { singular: 'Inngang', plural: 'Innganger' },
              admin: {
                description:
                  'Vises nederst på forsiden, side om side, for eksempel for nyansatte og for dem som skal etablere et team.',
              },
              fields: [
                { name: 'title', label: 'Overskrift', type: 'text', required: true },
                { name: 'text', label: 'Tekst', type: 'textarea' },
                {
                  name: 'links',
                  label: 'Lenker',
                  type: 'array',
                  labels: { singular: 'Lenke', plural: 'Lenker' },
                  admin: { description: 'Vises som knapper. Den første er hovedknappen.' },
                  fields: [
                    { name: 'label', label: 'Tekst', type: 'text', required: true },
                    {
                      name: 'href',
                      label: 'Lenke',
                      type: 'text',
                      required: true,
                      validate: validSiteLink,
                      admin: { description: LINK_HELP },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Endringer',
          fields: [
            {
              name: 'changes',
              label: 'Endringer i ilag',
              type: 'array',
              labels: { singular: 'Endring', plural: 'Endringer' },
              admin: {
                description: 'Forsiden viser de fem nyeste etter dato, uansett rekkefølge her.',
              },
              fields: [
                {
                  name: 'date',
                  label: 'Dato',
                  type: 'date',
                  required: true,
                  admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd. MMMM yyyy' } },
                },
                { name: 'text', label: 'Hva er endret', type: 'textarea', required: true },
                {
                  name: 'href',
                  label: 'Lenke',
                  type: 'text',
                  validate: validSiteLink,
                  admin: { description: `Valgfri. ${LINK_HELP}` },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
