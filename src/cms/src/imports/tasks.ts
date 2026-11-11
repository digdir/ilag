import type { TaskConfig } from 'payload'

import { IMPORT_TASKS } from '../collections/ImportRuns'
import { runImport } from './run'
import { PEOPLE_FILE_RETENTION_DAYS } from './settings'

// The jobs behind the import endpoints (ADR-0003). They run in the «imports»
// queue, which the CMS runs every 10 seconds.

const importTask = (slug: (typeof IMPORT_TASKS)[keyof typeof IMPORT_TASKS]): TaskConfig => ({
  slug,
  inputSchema: [{ name: 'importRunId', type: 'number', required: true }],
  // One import of each kind at a time, and a newer file replaces an older one
  // that hasn't started.
  concurrency: { key: () => slug, exclusive: true, supersedes: true },
  retries: { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
  handler: async ({ input, req }) => {
    await runImport(req.payload, (input as { importRunId: number }).importRunId)
    return { output: {} }
  },
})

// Removes people files older than 90 days from their import runs. The runs
// themselves are kept, and so are unit files, which have no personal data.
const removeOldPeopleFiles: TaskConfig = {
  slug: 'removeOldPeopleFiles',
  schedule: [{ cron: '0 0 3 * * *', queue: 'imports' }],
  handler: async ({ req }) => {
    const cutoff = new Date(Date.now() - PEOPLE_FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    await req.payload.update({
      collection: 'importkjoringer',
      where: {
        kind: { equals: 'people' },
        createdAt: { less_than: cutoff.toISOString() },
        file: { exists: true },
      },
      data: { file: null, fileRemovedAt: new Date().toISOString() },
      context: { importInternal: true },
    })
    return { output: {} }
  },
}

export const importTasks: TaskConfig[] = [
  importTask(IMPORT_TASKS.units),
  importTask(IMPORT_TASKS.people),
  removeOldPeopleFiles,
]
