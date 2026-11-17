import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type FieldAccess,
  type TextareaField,
  ValidationError,
} from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { mandateOwners, mayApprove, mayEdit, ownedBy } from '../access/mandateOwners'
import type { Mandate } from '../payload-types'

// A team's or a unit's mandate: the four core fields of Digdir's mandate
// template (TO-09, Vedlegg 3), approved by the teameier (TO-16), with every
// version kept (TO-17). The design is in ADR-0006.
//
// Payload's drafts carry the approval. The published version is the approved
// mandate, the one everyone reads. A draft is saved as a version beside it
// and changes nothing that readers see until someone who may approve
// publishes it. Payload stores the published version in the collection's
// table and every save, drafts included, in the versions table.

type ID = number

// The template's fields, in its order. Plain text in markdown; the frontend
// renders it without raw HTML (ADR-0006).
export const MANDATE_FIELDS = [
  { name: 'problem', label: 'Hva skal vi løse?' },
  { name: 'outcomes', label: 'Hva skal vi oppnå?' },
  { name: 'expectations', label: 'Hva forventes av oss?' },
  { name: 'collaboration', label: 'Hvordan samarbeider vi med andre?' },
] as const

type MandateField = (typeof MANDATE_FIELDS)[number]['name']

const MARKDOWN_HELP = 'Markdown: **fet**, *kursiv*, [lenke](https://…), og lister med - eller 1.'

const idOf = (value: unknown): ID | null => {
  if (value == null) return null
  if (typeof value === 'object' && 'id' in value) return (value as { id: ID }).id
  return value as ID
}

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

// Exactly one owner, a team or a unit (ADR-0006). On create only, since the
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

const today = () => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

// The status follows the approval (TO-16). A draft is a draft, with no
// approval date: approving it is a new approval. Publishing approves the
// mandate and makes it current, dated today unless the approver gives an
// earlier date, or marks it expired. Only approvers publish, so only they
// set the status and the date.
// The owner is set when the mandate is created, and never changes (ADR-0006):
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

const followApproval: CollectionBeforeChangeHook<Mandate> = async ({ data, originalDoc, req }) => {
  // A restored version arrives with the status it had, but is always saved
  // as a draft (onlyDraftsOrPublish).
  const publishing = data._status === 'published' && !req.context.isRestoringVersion
  if (!publishing) {
    data.status = 'draft'
    data.approvedAt = null
    return data
  }
  if (data.status === 'expired') {
    // Expiring keeps the date of the approval that ends, also when the form
    // was opened on a draft, which has none.
    if (!data.approvedAt && originalDoc?.id) {
      const published = await req.payload.findByID({
        collection: 'mandater',
        id: originalDoc.id,
        depth: 0,
        draft: false,
        req,
      })
      data.approvedAt = published._status === 'published' ? published.approvedAt : null
    }
    return data
  }
  data.status = 'current'
  data.approvedAt = data.approvedAt || today()
  return data
}

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
    defaultColumns: ['team', 'unit', 'status', 'approvedAt', 'updatedAt'],
    description:
      'Lagre som utkast mens dere jobber. Mandatet blir synlig for alle når det godkjennes (publiseres).',
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
  // The completeness is calculated from these, so they are read even when a
  // query selects only `complete` or `missingFields`.
  forceSelect: { problem: true, outcomes: true, expectations: true, collaboration: true },
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
    beforeOperation: [onlyDraftsOrPublish],
    beforeValidate: [oneOwner],
    beforeChange: [ownerNeverChanges, followApproval],
  },
  fields: [
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'team',
      unique: true,
      access: { update: ownerOnlyOnCreate },
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
      admin: {
        position: 'sidebar',
        description: 'Enheten mandatet hører til. Kan ikke endres etterpå.',
        condition: (data) => !data?.team,
      },
    },
    ...MANDATE_FIELDS.map(
      ({ name, label }): TextareaField => ({
        name,
        type: 'textarea',
        label,
        // Checked when the mandate is approved, not for drafts.
        required: true,
        admin: { description: MARKDOWN_HELP },
      }),
    ),
    {
      // Set by followApproval: draft until approved. Not Payload's own
      // `_status`, whose enum would otherwise get the same name in Postgres.
      name: 'status',
      type: 'select',
      enumName: 'enum_mandates_approval_status',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Gjeldende', value: 'current' },
        { label: 'Utgått', value: 'expired' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Blir gjeldende når mandatet godkjennes. Velg Utgått og godkjenn når mandatet ikke lenger gjelder.',
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
      label: 'Godkjent',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd. MMMM yyyy' },
        description: 'Dagens dato hvis tomt når mandatet godkjennes.',
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
