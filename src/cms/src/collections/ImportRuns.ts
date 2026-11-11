import { APIError, type CollectionConfig, type FieldAccess } from 'payload'

import { isAdmin } from '../access/isAdmin'

// One file from the authoritative source, from the time it arrived until it
// was applied (ADR-0003). The import endpoints create runs and the import jobs
// update them. Administrators read them in the admin panel, and confirm a run
// that was held because the file had far fewer rows than ilag has active.

// Set by the import only.
const importOnly: FieldAccess = () => false

export const IMPORT_TASKS = { units: 'importUnits', people: 'importPeople' } as const

export const ImportRuns: CollectionConfig = {
  slug: 'importkjoringer',
  dbName: 'import_runs',
  labels: {
    singular: 'Importkjøring',
    plural: 'Importkjøringer',
  },
  typescript: {
    interface: 'ImportRun',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['kind', 'status', 'createdAt', 'rows', 'sender'],
  },
  access: {
    read: ({ req }) => isAdmin(req.user),
    create: () => false,
    update: ({ req }) => isAdmin(req.user),
    delete: () => false,
  },
  defaultSort: '-createdAt',
  hooks: {
    // An administrator may only confirm a held run. The import's own writes
    // pass `importInternal` in the context.
    beforeChange: [
      ({ context, data, operation, originalDoc }) => {
        if (operation !== 'update' || context.importInternal) return data
        if (data.status === undefined || data.status === originalDoc?.status) return data
        if (originalDoc?.status !== 'held' || data.status !== 'queued') {
          throw new APIError('Bare en import som er holdt tilbake, kan bekreftes, og bare ved å sette den i kø.', 400)
        }
        return data
      },
    ],
    afterChange: [
      async ({ context, doc, operation, previousDoc, req }) => {
        if (operation !== 'update' || context.importInternal) return doc
        if (previousDoc?.status !== 'held' || doc.status !== 'queued') return doc

        const confirmed = await req.payload.update({
          collection: 'importkjoringer',
          id: doc.id,
          data: { confirmedBy: req.user?.id ?? null, confirmedAt: new Date().toISOString() },
          context: { importInternal: true },
          req,
        })
        await req.payload.jobs.queue({
          task: IMPORT_TASKS[doc.kind as keyof typeof IMPORT_TASKS],
          input: { importRunId: doc.id },
          queue: 'imports',
          req,
        })
        return confirmed
      },
    ],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Enheter', value: 'units' },
        { label: 'Personer', value: 'people' },
      ],
      access: { update: importOnly },
    },
    {
      // «held» waits for an administrator. Set it to «queued» to confirm it.
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'I kø', value: 'queued' },
        { label: 'Holdt tilbake', value: 'held' },
        { label: 'Kjører', value: 'running' },
        { label: 'Fullført', value: 'succeeded' },
        { label: 'Feilet', value: 'failed' },
        { label: 'Erstattet av en nyere fil', value: 'superseded' },
      ],
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'brukere',
      access: { update: importOnly },
    },
    {
      // Lines in the file, not counting the header.
      name: 'rows',
      type: 'number',
      required: true,
      access: { update: importOnly },
    },
    {
      // Units or people in the file, and how many were active in ilag when
      // it arrived. A run is held when the first is under half the second.
      name: 'count',
      type: 'number',
      required: true,
      access: { update: importOnly },
    },
    {
      name: 'activeBefore',
      type: 'number',
      required: true,
      access: { update: importOnly },
    },
    {
      name: 'result',
      type: 'json',
      access: { update: importOnly },
    },
    {
      name: 'error',
      type: 'textarea',
      access: { update: importOnly },
    },
    {
      name: 'confirmedBy',
      type: 'relationship',
      relationTo: 'brukere',
      access: { update: importOnly },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      access: { update: importOnly },
    },
    {
      name: 'finishedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      access: { update: importOnly },
    },
    {
      // The file as it came. People files are removed after 90 days, since
      // they contain personal data; unit files are kept.
      name: 'file',
      type: 'textarea',
      access: { update: importOnly },
    },
    {
      name: 'fileRemovedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      access: { update: importOnly },
    },
  ],
}
