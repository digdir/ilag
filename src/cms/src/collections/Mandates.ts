import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type FieldAccess,
  type PayloadRequest,
  type TextareaField,
  ValidationError,
  type Where,
} from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { mandateOwners, mayApprove, mayEdit, ownedBy } from '../access/mandateOwners'
import type { Mandate } from '../payload-types'
import { idOf } from '../utils/ids'
import { collectionGroups } from './groups'

// A team's or a unit's mandate: the four core fields of Digdir's mandate
// template (TO-09, Vedlegg 3), approved by the teameier (TO-16), with every
// version kept (TO-17). The design is in ADR-0007.
//
// Payload's drafts carry the approval. The published version is the approved
// mandate, the one everyone reads. A draft is saved as a version beside it
// and changes nothing that readers see until someone who may approve
// publishes it. Payload stores the published version in the collection's
// table and every save, drafts included, in the versions table.


// The template's fields, in its order. Plain text in markdown; the frontend
// renders it without raw HTML (ADR-0007).
export const MANDATE_FIELDS = [
  { name: 'problem', label: 'Hva skal vi løse?' },
  { name: 'outcomes', label: 'Hva skal vi oppnå?' },
  { name: 'expectations', label: 'Hva forventes av oss?' },
  { name: 'collaboration', label: 'Hvordan samarbeider vi med andre?' },
] as const

type MandateField = (typeof MANDATE_FIELDS)[number]['name']

const MARKDOWN_HELP = 'Markdown: **fet**, *kursiv*, [lenke](https://…), og lister med - eller 1.'

const ownerOf = (doc: Partial<Mandate> | undefined) => ({ team: idOf(doc?.team), unit: idOf(doc?.unit) })

// Payload decides whether a save is a draft from the operation's `draft`
// argument, which neither the access functions nor the change hooks see. A
// save without it writes straight to the published mandate, even when the
// status stays published; one with `_status: 'draft'` and without it
// unpublishes the mandate. Restoring a version without it publishes that
// version again. So every change through the API is either a draft or a
// publish, which the update access lets only approvers do, and a version is
// only ever restored as a draft, to be approved like any other.
const onlyDraftsOrPublish: CollectionBeforeOperationHook = ({ args, operation, overrideAccess }) => {
  if (overrideAccess) return args
  if (operation === 'update') {
    const publishing = (args.data as Partial<Mandate> | undefined)?._status === 'published'
    const savingDraft = args.draft === true && !publishing
    if (!publishing && !savingDraft) {
      throw new APIError('Et mandat lagres som utkast eller godkjennes. Det kan ikke endres på annen måte.', 403)
    }
  }
  if (operation === 'restoreVersion' && args.draft !== true) {
    throw new APIError('En tidligere versjon gjenopprettes som utkast, og må godkjennes på nytt.', 403)
  }
  return args
}

// Sorting on a calculated field returns nothing at all from Postgres, and the
// admin panel saves the list's sort per user, so a sort on `title`,
// `status`, `complete` or `missingFields` from a URL would leave that user
// an empty list for good. Such a sort is dropped, for the default order.
const CALCULATED = ['title', 'status', 'complete', 'missingFields']

const noSortOnCalculated: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== 'read' || !('sort' in args) || !args.sort) return args
  const sort = (Array.isArray(args.sort) ? args.sort : String(args.sort).split(','))
    .map((s: string) => s.trim())
    .filter((s: string) => !CALCULATED.includes(s.replace(/^-/, '')))
  return { ...args, sort: sort.length ? sort : undefined }
}

// Exactly one owner, a team or a unit (ADR-0007). On create only, since the
// owner can't change afterwards. Not a field validation: Payload skips those
// for drafts.
const oneOwner: CollectionBeforeValidateHook<Mandate> = ({ data, operation }) => {
  if (operation !== 'create') return data
  const { team, unit } = ownerOf(data)
  if ((team == null) === (unit == null)) {
    throw new ValidationError({
      collection: 'mandater',
      errors: [{ message: 'Et mandat hører til ett team eller én enhet.', path: team == null ? 'team' : 'unit' }],
    })
  }
  return data
}

// The picker offers team editors only the teams whose mandate they may edit.
// Validation runs this too, so without a user (the Local API, the seed) all
// go.
const ownersToPick = async (req: PayloadRequest, kind: 'teams' | 'units'): Promise<boolean | Where> => {
  if (!req.user || isAdmin(req.user)) return true
  return { id: { in: (await mandateOwners(req)).edit[kind] } }
}

const today = () => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

// The admin panel stores a picked day at noon UTC, so its UTC date is the day
// picked. Today is the day in Norway, where the approvers are.
export const isAfterToday = (date: string, now = new Date()) =>
  new Date(date).toISOString().slice(0, 10) > now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })

// The owner is set when the mandate is created, and never changes (ADR-0007):
// a mandate can't be moved to a team or unit whose leaders didn't approve it.
// The field access makes the owner read-only in the admin panel. A restore
// builds its data from the old version and drops fields the user may not
// update, which would leave the mandate without an owner, so it is allowed
// then: every version has the same owner. The hook keeps the owner whatever
// the data says.
const ownerOnlyOnCreate: FieldAccess = ({ req }) => Boolean(req.context.isRestoringVersion)

const ownerNeverChanges: CollectionBeforeChangeHook<Mandate> = ({ data, operation, originalDoc }) => {
  if (operation === 'update' && originalDoc) {
    const { team, unit } = ownerOf(originalDoc)
    data.team = team
    data.unit = unit
  }
  return data
}

// Payload's `_status` says whether a version is a draft or approved
// (published) (TO-16). The date and the approver follow the approval. A draft
// has neither. Approving is dated today unless the approver gives an earlier
// date, never a later one: a mandate isn't current before it is approved. Only
// approvers publish, so only they set the date.
//
// `approvedBy` is the approving user's person, since Payload's versions don't
// record who saved them; empty for an administrator who isn't linked to a
// person. It is always set here, whatever the request sends: a field access
// rule would run after this hook and undo it.
const approvalFollowsPublishing: CollectionBeforeChangeHook<Mandate> = ({ data, req }) => {
  // A restored version arrives with its old `_status`, but is always saved as
  // a draft (onlyDraftsOrPublish).
  const publishing = data._status === 'published' && !req.context.isRestoringVersion
  if (!publishing) {
    data.approvedAt = null
    data.approvedBy = null
    return data
  }
  if (data.approvedAt && isAfterToday(data.approvedAt)) {
    throw new ValidationError({
      collection: 'mandater',
      errors: [{ message: 'Et mandat kan ikke godkjennes med en dato frem i tid.', path: 'approvedAt' }],
    })
  }
  data.approvedAt = data.approvedAt || today()
  data.approvedBy = idOf(req.user?.person)
  return data
}

// The name of the mandate's team or unit, whether the owner is populated or
// only its ID.
const ownerName = async (doc: Partial<Mandate>, req: PayloadRequest): Promise<string> => {
  const owner = doc.team ?? doc.unit
  if (owner && typeof owner === 'object') return owner.name
  const id = idOf(owner)
  if (id == null) return 'ukjent eier'
  const found = await req.payload.findByID({
    collection: doc.team ? 'team' : 'enheter',
    id,
    depth: 0,
    select: { name: true },
    disableErrors: true,
    req,
  })
  return found?.name ?? 'ukjent eier'
}

// Utkast or gjeldende (TO-16, LO-04), from `_status`. An approved version that
// a later approval replaced is utgått; it is in the version history.
export const mandateStatus = (doc: Pick<Mandate, '_status'>): 'draft' | 'current' =>
  doc._status === 'published' ? 'current' : 'draft'

export const Mandates: CollectionConfig = {
  slug: 'mandater',
  dbName: 'mandates',
  labels: {
    singular: 'Mandat',
    plural: 'Mandater',
  },
  typescript: {
    interface: 'Mandate',
  },
  admin: {
    group: collectionGroups.team,
    // The first column links to the mandate, so it names the owner.
    defaultColumns: ['title', '_status', 'approvedAt', 'updatedAt'],
    // Team editors see the mandates of their own teams, as they do with teams
    // and memberships (ADR-0005). Only the list; read access is unchanged.
    baseFilter: async ({ req }) => {
      if (isAdmin(req.user)) return null
      return ownedBy((await mandateOwners(req)).edit) || { id: { in: [] } }
    },
    description:
      'Lagre som utkast mens dere jobber. Mandatet blir synlig for alle når det godkjennes (publiseres).',
    components: {
      // Shows the description above, and titles a mandate by its owner.
      Description: '/components/MandateTitle#MandateTitle',
    },
  },
  versions: {
    // Every version, not Payload's default of the last 100 (TO-17).
    maxPerDoc: 0,
    drafts: {
      autosave: false,
      schedulePublish: false,
      validate: false,
    },
  },
  disableDuplicate: true,
  // The calculated fields are made from these, so they are read even when a
  // query selects only those.
  forceSelect: {
    problem: true,
    outcomes: true,
    expectations: true,
    collaboration: true,
    _status: true,
    team: true,
    unit: true,
  },
  access: {
    // Everyone signed in reads approved mandates. Drafts, including a
    // mandate that has never been approved, only those who may edit it.
    read: async ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!isSignedIn(req.user)) return false
      const published = { _status: { equals: 'published' } }
      const own = ownedBy((await mandateOwners(req)).edit)
      return own ? { or: [published, own] } : published
    },
    // The history: approved versions to everyone signed in, drafts only to
    // those who may edit the mandate.
    readVersions: async ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!isSignedIn(req.user)) return false
      const published = { 'version._status': { equals: 'published' } }
      const own = ownedBy((await mandateOwners(req)).edit, 'version.')
      return own ? { or: [published, own] } : published
    },
    create: async ({ req, data }) => {
      if (!isSignedIn(req.user)) return false
      const owner = ownerOf(data)
      return data?._status === 'published' ? mayApprove(req, owner) : mayEdit(req, owner)
    },
    // Saving a draft for editors, publishing for approvers. The admin panel
    // asks this with `_status: 'published'` to decide whether to show the
    // publish button. onlyDraftsOrPublish makes sure every change is one of
    // the two.
    update: async ({ req, data }) => {
      if (isAdmin(req.user)) return true
      if (!isSignedIn(req.user)) return false
      const owners = await mandateOwners(req)
      return ownedBy(data?._status === 'published' ? owners.approve : owners.edit)
    },
    // Deleting a mandate deletes its history, so only administrators.
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeOperation: [onlyDraftsOrPublish, noSortOnCalculated],
    beforeValidate: [oneOwner],
    beforeChange: [ownerNeverChanges, approvalFollowsPublishing],
  },
  fields: [
    {
      // «Mandat for Team Skjemabygger», for the first column of the admin
      // panel's list, which links to the mandate. Calculated, never stored, so
      // it follows when a team or unit is renamed. Payload doesn't allow a
      // calculated field as the document's title (`useAsTitle`), so the
      // document itself is still titled by its ID.
      name: 'title',
      type: 'text',
      label: 'Mandat',
      virtual: true,
      admin: {
        // Only a list column: never shown in the form.
        condition: () => false,
        disableListFilter: true,
      },
      hooks: {
        afterRead: [({ siblingData, req }) => ownerName(siblingData, req).then((name) => `Mandat for ${name}`)],
      },
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'team',
      unique: true,
      access: { update: ownerOnlyOnCreate },
      filterOptions: ({ req }) => ownersToPick(req, 'teams'),
      admin: {
        position: 'sidebar',
        description: 'Teamet mandatet hører til. Kan ikke endres etterpå.',
        condition: (data) => !data?.unit,
      },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'enheter',
      label: 'Enhet',
      unique: true,
      access: { update: ownerOnlyOnCreate },
      filterOptions: ({ req }) => ownersToPick(req, 'units'),
      admin: {
        position: 'sidebar',
        description: 'Enheten mandatet hører til. Kan ikke endres etterpå.',
        condition: (data) => !data?.team,
      },
    },
    ...MANDATE_FIELDS.map(
      ({ name, label }, index): TextareaField => ({
        name,
        type: 'textarea',
        label,
        // Checked when the mandate is approved, not for drafts.
        required: true,
        // Once, under the first field: it is the same for all four.
        admin: index === 0 ? { description: MARKDOWN_HELP } : {},
      }),
    ),
    {
      name: 'approvedAt',
      type: 'date',
      label: 'Godkjent',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd. MMMM yyyy' },
        description: 'Dagens dato hvis tomt når mandatet godkjennes. Kan ikke være frem i tid.',
      },
    },
    {
      // Who approved the mandate (TO-16). Set by approvalFollowsPublishing,
      // never by hand.
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'personer',
      label: 'Godkjent av',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // Calculated, never stored: Payload's `_status` says it already. Can't
      // be queried; query `_status` instead.
      name: 'status',
      type: 'select',
      virtual: true,
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Gjeldende', value: 'current' },
      ],
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        afterRead: [({ siblingData }) => mandateStatus(siblingData)],
      },
    },
    {
      // TO-10: whether all four fields are filled in. Calculated, never
      // stored.
      name: 'complete',
      type: 'checkbox',
      label: 'Komplett',
      virtual: true,
      admin: { hidden: true },
      hooks: {
        afterRead: [({ siblingData }) => missing(siblingData).length === 0],
      },
    },
    {
      // TO-10: which of the four fields are empty.
      name: 'missingFields',
      type: 'select',
      hasMany: true,
      label: 'Mangler',
      virtual: true,
      options: MANDATE_FIELDS.map(({ name, label }) => ({ label, value: name })),
      admin: { hidden: true },
      hooks: {
        afterRead: [({ siblingData }) => missing(siblingData)],
      },
    },
  ],
}

const missing = (doc: Partial<Record<MandateField, string | null>>): MandateField[] =>
  MANDATE_FIELDS.filter(({ name }) => !doc[name]?.trim()).map(({ name }) => name)
