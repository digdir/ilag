import type { PayloadRequest } from 'payload'

import type { Unit } from '../payload-types'
import { columns, parseCsv, type ImportError } from './csv'
import { DIRECTORATE_UNIT_ID, SKIPPED_UNIT_IDS, UNIT_LEVELS } from './settings'

// The unit file from SAP (docs/integrations/unit-import.md). Its Avdeling,
// Seksjon and gruppe are what ilag calls divisjon, avdeling and seksjon.

export type FileUnit = {
  externalUnitId: string
  name: string
  code: string | null
  level: Unit['level']
  // The parent's externalUnitId. Null for the directorate.
  parentId: string | null
}

export type UnitFile = { units: FileUnit[]; skipped: string[]; rows: number }

export type UnitsResult = {
  created: number
  updated: number
  deactivated: number
  skipped: string[]
}

const COLUMNS = {
  id: { name: 'orgEnhet', required: true },
  name: { name: 'Betegnelse på organisasjonsenh', required: true },
  division: { name: 'Avdeling', required: true },
  department: { name: 'Seksjon', required: true },
  section: { name: 'gruppe', required: false },
} as const

// The order the levels are created in, so a parent always exists first.
const LEVELS: Unit['level'][] = ['directorate', 'division', 'support', 'authority', 'department', 'section']

export const readUnitFile = (text: string): { errors: ImportError[] } | UnitFile => {
  const file = parseCsv(text)
  const { get, errors } = columns(file, COLUMNS)
  if (errors.length > 0) return { errors }

  type Line = FileUnit & { line: number; division: string; department: string }
  const lines: Line[] = []
  const skipped: string[] = []
  const firstLineOfId = new Map<string, number>()

  for (const row of file.rows) {
    const id = get(row, 'id')
    if (SKIPPED_UNIT_IDS.includes(id)) {
      skipped.push(id)
      continue
    }

    const name = get(row, 'name')
    const division = get(row, 'division')
    const department = get(row, 'department')
    const section = get(row, 'section')
    const isDirectorate = id === DIRECTORATE_UNIT_ID

    const missing = [
      ['id', id],
      ['name', name],
      ...(isDirectorate ? [] : [['division', division], ['department', department]]),
    ].filter(([, value]) => !value)
    for (const [key] of missing) {
      const column = COLUMNS[key as keyof typeof COLUMNS].name
      errors.push({ line: row.line, column, message: `«${column}» is empty` })
    }
    if (missing.length > 0) continue

    const seen = firstLineOfId.get(id)
    if (seen !== undefined) {
      errors.push({ line: row.line, column: COLUMNS.id.name, message: `«${id}» is already on line ${seen}` })
      continue
    }
    firstLineOfId.set(id, row.line)

    const level: Unit['level'] = isDirectorate
      ? 'directorate'
      : section
        ? 'section'
        : division === department
          ? 'division'
          : 'department'
    const code = level === 'directorate' ? null : level === 'section' ? section : department
    lines.push({ line: row.line, externalUnitId: id, name, code, level, parentId: null, division, department })
  }

  if (!lines.some((l) => l.level === 'directorate')) {
    errors.push({
      line: file.headerLine,
      column: COLUMNS.id.name,
      message: `The directorate, «${DIRECTORATE_UNIT_ID}», is not in the file`,
    })
  }

  // The keys that identify a unit at its level, for finding parents.
  const keyOf = (l: Line) =>
    l.level === 'division' ? l.division : l.level === 'department' ? `${l.division}/${l.department}` : l.code
  const byLevel = new Map(LEVELS.map((level) => [level, new Map<string, Line>()]))
  for (const l of lines) {
    if (l.level === 'directorate') continue
    const units = byLevel.get(l.level)!
    const key = keyOf(l)!
    const other = units.get(key)
    if (other) {
      const column = l.level === 'division' ? 'Avdeling' : l.level === 'department' ? 'Seksjon' : 'gruppe'
      errors.push({ line: l.line, column, message: `«${l.code}» is already the code of line ${other.line}` })
    } else {
      units.set(key, l)
    }
  }

  const directorate = lines.find((l) => l.level === 'directorate')
  for (const l of lines) {
    if (l.level === 'division') l.parentId = directorate?.externalUnitId ?? null
    if (l.level === 'department') {
      const parent = byLevel.get('division')!.get(l.division)
      if (parent) l.parentId = parent.externalUnitId
      else errors.push({ line: l.line, column: 'Avdeling', message: `No division in the file has the code «${l.division}»` })
    }
    if (l.level === 'section') {
      const parent = byLevel.get('department')!.get(`${l.division}/${l.department}`)
      if (parent) l.parentId = parent.externalUnitId
      else
        errors.push({
          line: l.line,
          column: 'Seksjon',
          message: `No department in the file has the codes «${l.division}» and «${l.department}»`,
        })
    }
  }

  if (errors.length > 0) return { errors: errors.sort((a, b) => a.line - b.line) }
  return {
    units: lines.map(({ externalUnitId, name, code, level, parentId }) => ({
      externalUnitId,
      name,
      code,
      // The structure above uses the level from the file; support units and
      // authorities only get theirs here.
      level: level === 'division' ? (UNIT_LEVELS[externalUnitId] ?? level) : level,
      parentId,
    })),
    skipped,
    rows: file.rows.length,
  }
}

const idOrNull = (value: number | { id: number } | null | undefined) =>
  (typeof value === 'object' ? value?.id : value) ?? null

// Links every person's `units` and `location` from the IDs and code they came
// with, against the units and locations in ilag now, so a unit or location
// that arrives later is linked by the next import of either kind (ADR-0003,
// 8). The unit import calls it after applying its file.
export const linkPeople = async (req: PayloadRequest): Promise<void> => {
  const { payload } = req
  const [units, locations, people] = await Promise.all([
    payload.find({ collection: 'enheter', pagination: false, depth: 0, req }),
    payload.find({ collection: 'lokasjoner', pagination: false, depth: 0, req }),
    payload.find({ collection: 'personer', pagination: false, depth: 0, req }),
  ])
  const unitIdOf = new Map(units.docs.map((u) => [u.externalUnitId, u.id]))
  const locationIdOf = new Map(locations.docs.map((l) => [l.code, l.id]))

  for (const person of people.docs) {
    const wanted = (person.externalUnitIds ?? []).flatMap((id) => unitIdOf.get(id) ?? [])
    const current = (person.units ?? []).map(idOrNull)
    const location = locationIdOf.get(person.locationCode) ?? null
    if (wanted.join() !== current.join() || location !== idOrNull(person.location)) {
      await payload.update({ collection: 'personer', id: person.id, data: { units: wanted, location }, depth: 0, req })
    }
  }
}

// Applies a valid unit file. Runs inside the import's transaction.
export const applyUnits = async (file: UnitFile, req: PayloadRequest): Promise<UnitsResult> => {
  const { payload } = req
  const existing = await payload.find({ collection: 'enheter', pagination: false, depth: 0, req })
  const byExternalId = new Map(existing.docs.map((u) => [u.externalUnitId, u]))
  const idOf = new Map<string, number>()
  const result: UnitsResult = { created: 0, updated: 0, deactivated: 0, skipped: file.skipped }

  const ordered = [...file.units].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
  for (const unit of ordered) {
    const data = {
      externalUnitId: unit.externalUnitId,
      name: unit.name,
      code: unit.code,
      level: unit.level,
      parent: unit.parentId ? (idOf.get(unit.parentId) ?? null) : null,
      active: true,
    }
    const found = byExternalId.get(unit.externalUnitId)
    const saved = found
      ? await payload.update({ collection: 'enheter', id: found.id, data, depth: 0, req })
      : await payload.create({ collection: 'enheter', data, depth: 0, req })
    idOf.set(unit.externalUnitId, saved.id)
    result[found ? 'updated' : 'created']++
  }

  for (const unit of existing.docs) {
    if (unit.active && !idOf.has(unit.externalUnitId)) {
      await payload.update({ collection: 'enheter', id: unit.id, data: { active: false }, depth: 0, req })
      result.deactivated++
    }
  }

  await linkPeople(req)
  return result
}
