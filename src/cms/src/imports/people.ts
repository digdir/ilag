import type { PayloadRequest } from 'payload'

import { columns, parseCsv, type ImportError } from './csv'
import { SKIPPED_UNIT_IDS } from './settings'

// The people file from SAP (docs/integrations/people-import.md). A person
// has one line per unit; the other values come from their first line.

export type FilePerson = {
  employeeNumber: string
  externalId: string
  firstName: string
  lastName: string
  email: string
  title: string | null
  externalUnitIds: string[]
  locationCode: string
  managerEmployeeNumber: string | null
  isEmployee: boolean
  mobile: string | null
}

export type PeopleFile = { people: FilePerson[]; differingLines: string[]; rows: number }

export type PeopleResult = {
  created: number
  updated: number
  deactivated: number
  unknownUnits: string[]
  unknownLocations: string[]
  unknownManagers: string[]
  differingLines: string[]
}

const COLUMNS = {
  employeeNumber: { name: '0000PERNR', required: true },
  externalId: { name: '01050001USRID', required: true },
  firstName: { name: '0002VORNA', required: true },
  lastName: { name: '0002NACHN', required: true },
  email: { name: '01050010USRID_LONG', required: true },
  title: { name: '9999PLANS_TEKST', required: false },
  unit: { name: '0001ORGEH', required: true },
  location: { name: '0001BTRTL', required: true },
  manager: { name: '9999LEDER_PERNR', required: false },
  group: { name: '0001PERSG', required: true },
  mobile1: { name: '01059003USRID', required: false },
  mobile2: { name: '01059004USRID', required: false },
} as const

type Key = keyof typeof COLUMNS

const REQUIRED = (Object.keys(COLUMNS) as Key[]).filter((key) => COLUMNS[key].required)

// 0001PERSG: 1 and 4 are employees, 8 and 9 contractors.
const EMPLOYEE_GROUPS: Record<string, boolean> = { '1': true, '4': true, '8': false, '9': false }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const readPeopleFile = (text: string): { errors: ImportError[] } | PeopleFile => {
  const file = parseCsv(text)
  const { get, errors } = columns(file, COLUMNS)
  if (errors.length > 0) return { errors }

  const people = new Map<string, FilePerson & { line: number }>()
  const unitLines = new Map<string, number>()
  const owners = { externalId: new Map<string, string>(), email: new Map<string, string>() }
  const differing = new Set<string>()

  for (const row of file.rows) {
    const value = (key: Key) => get(row, key)
    const missing = REQUIRED.filter((key) => !value(key))
    for (const key of missing) {
      errors.push({ line: row.line, column: COLUMNS[key].name, message: `«${COLUMNS[key].name}» is empty` })
    }
    if (missing.length > 0) continue

    const employeeNumber = value('employeeNumber')
    const email = value('email').toLowerCase()
    const group = value('group')
    const unit = value('unit')
    let valid = true

    if (!EMAIL.test(email)) {
      errors.push({ line: row.line, column: COLUMNS.email.name, message: `«${value('email')}» is not a valid email` })
      valid = false
    }
    if (!(group in EMPLOYEE_GROUPS)) {
      errors.push({ line: row.line, column: COLUMNS.group.name, message: `«${group}» is not 1, 4, 8 or 9` })
      valid = false
    }

    const unitKey = `${employeeNumber}/${unit}`
    const sameUnit = unitLines.get(unitKey)
    if (sameUnit !== undefined) {
      errors.push({
        line: row.line,
        column: COLUMNS.unit.name,
        message: `«${employeeNumber}» is already in unit «${unit}» on line ${sameUnit}`,
      })
      valid = false
    } else {
      unitLines.set(unitKey, row.line)
    }

    for (const [key, id] of [
      ['externalId', value('externalId')],
      ['email', email],
    ] as const) {
      const owner = owners[key].get(id)
      if (owner !== undefined && owner !== employeeNumber) {
        errors.push({
          line: row.line,
          column: COLUMNS[key].name,
          message: `«${id}» already belongs to employee number «${owner}»`,
        })
        valid = false
      } else {
        owners[key].set(id, employeeNumber)
      }
    }
    if (!valid) continue

    const manager = value('manager')
    const person: FilePerson & { line: number } = {
      line: row.line,
      employeeNumber,
      externalId: value('externalId'),
      firstName: value('firstName'),
      lastName: value('lastName'),
      email,
      title: value('title') || null,
      externalUnitIds: SKIPPED_UNIT_IDS.includes(unit) ? [] : [unit],
      locationCode: value('location'),
      // A manager equal to the person themself means no manager.
      managerEmployeeNumber: manager && manager !== employeeNumber ? manager : null,
      isEmployee: EMPLOYEE_GROUPS[group]!,
      mobile: value('mobile1') || value('mobile2') || null,
    }

    const first = people.get(employeeNumber)
    if (!first) {
      people.set(employeeNumber, person)
      continue
    }
    if (!SKIPPED_UNIT_IDS.includes(unit)) first.externalUnitIds.push(unit)
    const fields = Object.keys(person).filter((k) => k !== 'line' && k !== 'externalUnitIds') as (keyof FilePerson)[]
    if (fields.some((k) => person[k] !== first[k])) differing.add(employeeNumber)
  }

  if (errors.length > 0) return { errors: errors.sort((a, b) => a.line - b.line) }
  return {
    people: [...people.values()].map(({ line: _line, ...person }) => person),
    differingLines: [...differing],
    rows: file.rows.length,
  }
}

// Applies a valid people file. Runs inside the import's transaction.
export const applyPeople = async (file: PeopleFile, req: PayloadRequest): Promise<PeopleResult> => {
  const { payload } = req
  const [existing, units, locations] = await Promise.all([
    payload.find({ collection: 'personer', pagination: false, depth: 0, req }),
    payload.find({ collection: 'enheter', pagination: false, depth: 0, req }),
    payload.find({ collection: 'lokasjoner', pagination: false, depth: 0, req }),
  ])
  const byEmployeeNumber = new Map(existing.docs.map((p) => [p.employeeNumber, p]))
  const unitIdOf = new Map(units.docs.map((u) => [u.externalUnitId, u.id]))
  const locationIdOf = new Map(locations.docs.map((l) => [l.code, l.id]))
  const unknown = { units: new Set<string>(), locations: new Set<string>(), managers: new Set<string>() }
  const idOf = new Map<string, number>()
  let created = 0
  let updated = 0

  for (const person of file.people) {
    for (const id of person.externalUnitIds) if (!unitIdOf.has(id)) unknown.units.add(id)
    if (!locationIdOf.has(person.locationCode)) unknown.locations.add(person.locationCode)

    const data = {
      ...person,
      units: person.externalUnitIds.flatMap((id) => unitIdOf.get(id) ?? []),
      location: locationIdOf.get(person.locationCode) ?? null,
      active: true,
    }
    const found = byEmployeeNumber.get(person.employeeNumber)
    const saved = found
      ? await payload.update({ collection: 'personer', id: found.id, data, depth: 0, req })
      : await payload.create({ collection: 'personer', data, depth: 0, req })
    idOf.set(person.employeeNumber, saved.id)
    if (found) updated++
    else created++
  }

  // Managers once everyone in the file exists.
  for (const person of file.people) {
    const manager = person.managerEmployeeNumber ? idOf.get(person.managerEmployeeNumber) : undefined
    if (person.managerEmployeeNumber && manager === undefined) unknown.managers.add(person.managerEmployeeNumber)
    const found = byEmployeeNumber.get(person.employeeNumber)
    const current = typeof found?.manager === 'object' ? found.manager?.id : found?.manager
    if ((current ?? null) !== (manager ?? null)) {
      await payload.update({
        collection: 'personer',
        id: idOf.get(person.employeeNumber)!,
        data: { manager: manager ?? null },
        depth: 0,
        req,
      })
    }
  }

  let deactivated = 0
  for (const person of existing.docs) {
    if (person.active && !idOf.has(person.employeeNumber)) {
      await payload.update({ collection: 'personer', id: person.id, data: { active: false }, depth: 0, req })
      deactivated++
    }
  }

  return {
    created,
    updated,
    deactivated,
    unknownUnits: [...unknown.units],
    unknownLocations: [...unknown.locations],
    unknownManagers: [...unknown.managers],
    differingLines: file.differingLines,
  }
}
