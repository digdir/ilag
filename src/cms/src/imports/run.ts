import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import type { ImportRun } from '../payload-types'
import type { ImportError } from './csv'
import { applyPeople, readPeopleFile } from './people'
import { applyUnits, readUnitFile } from './units'

// One lock for both imports, so a unit import and a people import never apply
// files at the same time, and the second sees what the first wrote
// (ADR-0003, 8). Held until the transaction ends.
const LOCK = sql`select pg_advisory_xact_lock(hashtext('ilag-imports'))`

const internal = { importInternal: true }

const setRun = (payload: Payload, id: number, data: Partial<ImportRun>) =>
  payload.update({ collection: 'importkjoringer', id, data, context: internal, depth: 0 })

// Applies an import run's file in one transaction: everything changes, or
// nothing does. A run that is no longer queued, because a newer file replaced
// it or it already finished, is left alone. A failed run is tried again by the
// job's retries.
export const runImport = async (payload: Payload, importRunId: number): Promise<void> => {
  const run = await payload.findByID({ collection: 'importkjoringer', id: importRunId, depth: 0 })
  if (!['queued', 'running', 'failed'].includes(run.status)) return
  await setRun(payload, run.id, { status: 'running', error: null })

  const req = await createLocalReq({ context: internal }, payload)
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('The database did not start a transaction')
  req.transactionID = transactionID

  // The file was valid when it arrived, so an error here means it was
  // changed or removed since.
  const apply = <F extends object, R>(
    readFile: (text: string) => { errors: ImportError[] } | F,
    applyFile: (file: F, req: PayloadRequest) => Promise<R>,
  ): Promise<R> => {
    const file = readFile(run.file ?? '')
    if ('errors' in file) throw new Error(`The file is no longer valid: ${file.errors[0]?.message}`)
    return applyFile(file, req)
  }

  try {
    await (payload.db as unknown as PostgresAdapter).sessions[transactionID]!.db.execute(LOCK)

    const result = run.kind === 'units' ? await apply(readUnitFile, applyUnits) : await apply(readPeopleFile, applyPeople)

    await payload.db.commitTransaction(transactionID)
    await setRun(payload, run.id, { status: 'succeeded', result, finishedAt: new Date().toISOString() })
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    await setRun(payload, run.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString(),
    })
    throw error
  }
}
