import 'dotenv/config'
import pg from 'pg'

import { testDatabaseURL } from './database'

// Creates the test database from scratch for every run, so the schema is
// always pushed to an empty database.
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  const name = testDatabaseURL(url.toString()).pathname.slice(1)
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Unexpected test database name «${name}»`)

  const client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  try {
    await client.query(`drop database if exists "${name}" with (force)`)
    await client.query(`create database "${name}"`)
  } finally {
    await client.end()
  }
}
