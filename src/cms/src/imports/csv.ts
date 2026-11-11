// A small CSV reader for the files from the authoritative source: UTF-8 with
// or without a byte order mark, comma or semicolon, values optionally in
// double quotes, and a leading `#TYPE …` line from older versions of
// PowerShell's Export-Csv.

export type CsvRow = {
  // The line in the file, counting from 1, as the sender sees it.
  line: number
  values: string[]
}

export type CsvFile = {
  headerLine: number
  header: string[]
  rows: CsvRow[]
}

export type ImportError = {
  line: number
  column?: string
  message: string
}

// Splits the text into records, keeping line breaks inside quoted values.
const records = (text: string, separator: string): CsvRow[] => {
  const rows: CsvRow[] = []
  let values: string[] = []
  let value = ''
  let quoted = false
  let line = 1
  let start = 1

  const endValue = () => {
    values.push(value)
    value = ''
  }
  const endRecord = () => {
    endValue()
    rows.push({ line: start, values })
    values = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        if (c === '\n') line++
        value += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === separator) {
      endValue()
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      endRecord()
      line++
      start = line
    } else {
      value += c
    }
  }
  if (value !== '' || values.length > 0) endRecord()

  return rows.filter((row) => row.values.some((v) => v.trim() !== ''))
}

// The separator is whichever of semicolon and comma the header has more of.
const detectSeparator = (headerLine: string): string => {
  const outsideQuotes = headerLine.replace(/"[^"]*"/g, '')
  const count = (s: string) => outsideQuotes.split(s).length - 1
  return count(';') > count(',') ? ';' : ','
}

export const parseCsv = (input: string): CsvFile => {
  let text = input.replace(/^﻿/, '')
  let skipped = 0
  if (text.startsWith('#TYPE')) {
    const end = text.search(/\r?\n/)
    text = end === -1 ? '' : text.slice(end).replace(/^\r?\n/, '')
    skipped = 1
  }

  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const all = records(text, detectSeparator(firstLine)).map((row) => ({
    ...row,
    line: row.line + skipped,
  }))
  const [header, ...rows] = all

  return {
    headerLine: header?.line ?? 1 + skipped,
    header: (header?.values ?? []).map((name) => name.trim()),
    rows,
  }
}

// Reads the columns a file needs, by name, without regard to case, spaces
// around the name or the order. Lists a missing required column as an error
// on the header line.
export const columns = <K extends string>(
  file: CsvFile,
  wanted: Record<K, { name: string; required: boolean }>,
): { get: (row: CsvRow, key: K) => string; errors: ImportError[] } => {
  const index = new Map(file.header.map((name, i) => [name.toLowerCase(), i]))
  const errors: ImportError[] = []
  const positions = {} as Record<K, number | undefined>

  for (const key of Object.keys(wanted) as K[]) {
    const { name, required } = wanted[key]
    positions[key] = index.get(name.toLowerCase())
    if (positions[key] === undefined && required) {
      errors.push({ line: file.headerLine, column: name, message: `The column «${name}» is missing` })
    }
  }

  const get = (row: CsvRow, key: K) => {
    const i = positions[key]
    return i === undefined ? '' : (row.values[i] ?? '').trim()
  }
  return { get, errors }
}
