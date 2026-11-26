import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'

import { adminOnly } from '../access/fields'
import { isAdmin } from '../access/isAdmin'
import { isEditor } from '../access/isEditor'
import { isSignedIn } from '../access/isSignedIn'
import { editableTeamIds } from '../access/teamEditor'
import { unitIdsLedBy } from '../access/unitLeader'
import { collectionGroups } from './groups'

export const FEEDBACK_CATEGORIES = [
  { value: 'faktafeil', label: 'Faktafeil' },
  { value: 'utdatert', label: 'Utdatert' },
  { value: 'uklart', label: 'Uklart' },
  { value: 'mangler', label: 'Mangler' },
  { value: 'annet', label: 'Annet' },
] as const

// The owner of the content (TB-02): teameier and teamleder for a team,
// enhetsleder for a unit, administrators and redaktører for everything else.
// Administrators also see everything, the team's and unit's too.
const ownedByUser: Access = async ({ req }) => {
  if (isAdmin(req.user)) return true
  if (!isSignedIn(req.user)) return false
  const [teams, units] = await Promise.all([editableTeamIds(req), unitIdsLedBy(req)])
  const or: Where[] = []
  if (teams.length) or.push({ team: { in: teams } })
  if (units.length) or.push({ unit: { in: units } })
  if (isEditor(req.user))
    or.push({ and: [{ team: { exists: false } }, { unit: { exists: false } }] })
  return or.length ? { or } : false
}

// Owners, and the reporter of feedback that isn't anonymous.
const ownedOrReported: Access = async (args) => {
  const owned = await ownedByUser(args)
  if (owned === true || !isSignedIn(args.req.user)) return owned
  const mine: Where = { reporter: { equals: args.req.user!.id } }
  return owned ? { or: [owned as Where, mine] } : mine
}

// Whoever sends it can't choose the reporter or the status. The reporter is
// stored only when they may be contacted (TB-05).
const setReporterAndStatus: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  return { ...data, reporter: data.contactMe ? req.user?.id : null, status: 'ny' }
}

// Errors and gaps reported from a page in the frontend (TB-01). Read by the
// owner of the content, administrators and a reporter who left their name
// (TB-02), never in an overview for everyone (TB-04 is removed). Redaktører
// own the shared content, alongside the administrators.
export const Feedback: CollectionConfig = {
  slug: 'tilbakemeldinger',
  dbName: 'feedback',
  labels: {
    singular: 'Tilbakemelding',
    plural: 'Tilbakemeldinger',
  },
  typescript: {
    interface: 'Feedback',
  },
  admin: {
    group: collectionGroups.system,
    useAsTitle: 'text',
    defaultColumns: ['text', 'category', 'status', 'team', 'unit', 'createdAt'],
  },
  access: {
    read: ownedOrReported,
    create: ({ req }) => isSignedIn(req.user),
    update: ownedByUser,
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeChange: [setReporterAndStatus],
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'category',
      label: 'Kategori',
      type: 'select',
      required: true,
      options: [...FEEDBACK_CATEGORIES],
      access: { update: adminOnly },
    },
    {
      name: 'text',
      label: 'Beskrivelse',
      type: 'textarea',
      required: true,
      maxLength: 5000,
      access: { update: adminOnly },
    },
    {
      // TB-03: the owner of the content and administrators set it.
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ny',
      options: [
        { value: 'ny', label: 'Ny' },
        { value: 'under-arbeid', label: 'Under arbeid' },
        { value: 'rettet', label: 'Rettet' },
        { value: 'avvist', label: 'Avvist' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      // The path of the page in the frontend it was reported from.
      name: 'page',
      label: 'Side',
      type: 'text',
      required: true,
      maxLength: 500,
      access: { update: adminOnly },
      admin: { position: 'sidebar' },
    },
    {
      // The team or unit the page is about decides who gets it. Neither means
      // content for all of Digdir, which administrators own.
      name: 'team',
      type: 'relationship',
      relationTo: 'team',
      index: true,
      access: { update: adminOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'unit',
      label: 'Enhet',
      type: 'relationship',
      relationTo: 'enheter',
      index: true,
      access: { update: adminOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'contactMe',
      label: 'Kan kontaktes',
      type: 'checkbox',
      defaultValue: false,
      access: { update: adminOnly },
      admin: { position: 'sidebar' },
    },
    {
      // Set by setReporterAndStatus, never by whoever sends the feedback.
      name: 'reporter',
      label: 'Meldt inn av',
      type: 'relationship',
      relationTo: 'brukere',
      index: true,
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
