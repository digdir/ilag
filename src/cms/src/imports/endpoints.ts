import type { Endpoint, PayloadRequest } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isIntegration } from '../access/isIntegration'
import { IMPORT_TASKS } from '../collections/ImportRuns'
import { serverURL } from '../urls'
import { readPeopleFile } from './people'
import { HOLD_BELOW_SHARE, MAX_FILE_BYTES } from './settings'
import { readUnitFile } from './units'

// POST /api/<collection>/import takes a file from the authoritative source,
// and GET /api/<collection>/import/<id> tells its sender how it went
// (ADR-0003). The contracts are in docs/integrations.

type Kind = keyof typeof IMPORT_TASKS

const COLLECTION = { units: 'enheter', people: 'personer' } as const

const problem = (status: number, message: string) => Response.json({ message }, { status })

const read = (kind: Kind, text: string) => {
  if (kind === 'units') {
    const file = readUnitFile(text)
    return 'errors' in file ? file : { rows: file.rows, count: file.units.length, counted: 'units' }
  }
  const file = readPeopleFile(text)
  return 'errors' in file ? file : { rows: file.rows, count: file.people.length, counted: 'people' }
}

const receive =
  (kind: Kind) =>
  async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) return problem(401, 'The key is missing or wrong')
    if (!isIntegration(req.user)) return problem(403, 'This user may not import')

    const type = req.headers.get('content-type') ?? ''
    if (!type.toLowerCase().startsWith('text/csv')) return problem(415, 'The body must be text/csv')
    if (Number(req.headers.get('content-length') ?? 0) > MAX_FILE_BYTES) {
      return problem(413, 'The file is larger than 5 MB')
    }
    const text = (await req.text?.()) ?? ''
    if (Buffer.byteLength(text) > MAX_FILE_BYTES) return problem(413, 'The file is larger than 5 MB')

    const file = read(kind, text)
    if ('errors' in file) return Response.json({ errors: file.errors }, { status: 400 })

    const { payload } = req
    const collection = COLLECTION[kind]
    const { totalDocs: activeBefore } = await payload.count({ collection, where: { active: { equals: true } } })
    const held = activeBefore > 0 && file.count < activeBefore * HOLD_BELOW_SHARE

    // Only the newest file of each kind matters. Runs that haven't started,
    // or wait to be tried again, are replaced; their jobs are removed by the
    // task's concurrency control.
    await payload.update({
      collection: 'importkjoringer',
      where: { kind: { equals: kind }, status: { in: ['queued', 'held', 'failed'] } },
      data: { status: 'superseded' },
      context: { importInternal: true },
    })

    const run = await payload.create({
      collection: 'importkjoringer',
      data: {
        kind,
        status: held ? 'held' : 'queued',
        sender: req.user.id,
        rows: file.rows,
        count: file.count,
        activeBefore,
        file: text,
      },
      context: { importInternal: true },
    })
    if (!held) {
      await payload.jobs.queue({ task: IMPORT_TASKS[kind], input: { importRunId: run.id }, queue: 'imports' })
    }

    return Response.json(
      {
        importRunId: run.id,
        status: run.status,
        rows: file.rows,
        [file.counted]: file.count,
        statusUrl: `${serverURL}/api/${collection}/import/${run.id}`,
      },
      { status: 202 },
    )
  }

const status =
  (kind: Kind) =>
  async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) return problem(401, 'The key is missing or wrong')
    if (!isIntegration(req.user) && !isAdmin(req.user)) return problem(403, 'This user may not import')

    const id = Number(req.routeParams?.id)
    const { docs } = await req.payload.find({
      collection: 'importkjoringer',
      where: { id: { equals: Number.isInteger(id) ? id : -1 }, kind: { equals: kind } },
      depth: 0,
      limit: 1,
    })
    const run = docs[0]
    if (!run) return problem(404, 'No import run of this kind has that ID')

    return Response.json({
      importRunId: run.id,
      status: run.status,
      ...(run.result ? { result: run.result } : {}),
      ...(run.error ? { error: run.error } : {}),
    })
  }

export const importEndpoints = (kind: Kind): Endpoint[] => [
  { path: '/import', method: 'post', handler: receive(kind) },
  { path: '/import/:id', method: 'get', handler: status(kind) },
]
