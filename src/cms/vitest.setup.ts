// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

import { testDatabaseURL } from './tests/helpers/database'

// Run against the test database that tests/helpers/globalSetup.ts creates.
process.env.DATABASE_URL = testDatabaseURL(process.env.DATABASE_URL ?? '').toString()
