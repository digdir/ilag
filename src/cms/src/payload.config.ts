import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { nb } from '@payloadcms/translations/languages/nb'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { People } from './collections/People'
import { Locations } from './collections/Locations'
import { Units } from './collections/Units'
import { Roles } from './collections/Roles'
import { Teams } from './collections/Teams'
import { TeamTypes } from './collections/TeamTypes'
import { TeamTypeWizard } from './collections/TeamTypeWizard'
import { TeamMemberships } from './collections/TeamMemberships'
import { Mandates } from './collections/Mandates'
import { Tools } from './collections/Tools'
import { Concepts } from './collections/Concepts'
import { ImportRuns } from './collections/ImportRuns'
import { Feedback } from './collections/Feedback'
import { isAdmin } from './access/isAdmin'
import { importTasks } from './imports/tasks'
import { health } from './endpoints/health'
import { serverURL, webURL } from './urls'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL,
  cors: [webURL],
  csrf: [webURL],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterLogin: ['/components/ProviderLoginButtons#ProviderLoginButtons'],
      actions: ['/components/GoToWebsite#GoToWebsite'],
    },
    // Teameiere and teamledere see only their own teams on the dashboard
    // (TO-08, RO-06); administrators see Payload's cards for all collections.
    // Each user can change their own layout, which Payload then keeps.
    dashboard: {
      widgets: [
        {
          slug: 'my-teams',
          Component: '/components/MyTeams#MyTeams',
          label: { nb: 'Dine team', en: 'Your teams' },
          minWidth: 'full',
        },
      ],
      defaultLayout: ({ req }) =>
        isAdmin(req.user) ? [{ widgetSlug: 'collections', width: 'full' }] : [{ widgetSlug: 'my-teams', width: 'full' }],
    },
    meta: {
      titleSuffix: ' – ilag',
    },
  },
  // The admin panel uses the language a user picked under Account. Otherwise
  // it takes the first language in the browser's Accept-Language that Payload
  // has translations for, and falls back to Norwegian if that isn't nb or en.
  i18n: {
    supportedLanguages: { nb, en },
    fallbackLanguage: 'nb',
  },
  // In the order of their groups in the admin panel's navigation (collections/groups.ts).
  collections: [
    Teams,
    TeamMemberships,
    Mandates,
    TeamTypes,
    TeamTypeWizard,
    Tools,
    Concepts,
    People,
    Units,
    Locations,
    Roles,
    Users,
    Feedback,
    ImportRuns,
    Media,
  ],
  // The imports from the authoritative source (ADR-0003). Only administrators
  // may queue, run or cancel jobs through the API; the import endpoints queue
  // them through the Local API.
  jobs: {
    tasks: importTasks,
    enableConcurrencyControl: true,
    access: {
      queue: ({ req }) => isAdmin(req.user),
      run: ({ req }) => isAdmin(req.user),
      cancel: ({ req }) => isAdmin(req.user),
    },
    autoRun: [{ cron: '*/10 * * * * *', queue: 'imports' }],
    // The tests run jobs themselves, when they need them.
    shouldAutoRun: () => process.env.NODE_ENV !== 'test',
  },
  endpoints: [health],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
