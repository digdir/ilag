import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeLoginHook, type CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors, isTeamEditor } from '../access/teamEditor'
import { isIntegration } from '../access/isIntegration'
import { isSignedIn } from '../access/isSignedIn'
import { oidcEndpoints, providersEndpoint } from '../auth/oidc'
import { providers } from '../auth/providers'
import { collectionGroups } from './groups'

// The first user, created on /admin of an empty database, has to be able to
// use the admin panel and make others administrators. Not someone who just
// happens to be the first to log in with a provider, and never the
// integration user.
const makeFirstUserAdmin: CollectionBeforeChangeHook = async ({ context, data, operation, req }) => {
  if (operation === 'create' && !context.createdByLogin && !data.roles?.includes('integration')) {
    const { totalDocs } = await req.payload.count({ collection: 'brukere', req })
    if (totalDocs === 0) data.roles = ['admin']
  }
  return data
}

// The integration user only sends files, with an API key (ADR-0003). It never
// logs in, with a password or otherwise.
const refuseIntegrationLogin: CollectionBeforeLoginHook = ({ user }) => {
  if (isIntegration(user)) throw new APIError('Integrasjonsbrukeren kan ikke logge inn.', 403)
  return user
}

// Everyone who can log in. People log in with Entra ID (NF-02), which creates
// their user the first time, or with an email and password set in Payload
// (NF-12), the fallback for when Entra ID doesn't work.
export const Users: CollectionConfig = {
  slug: 'brukere',
  dbName: 'users',
  labels: {
    singular: 'Bruker',
    plural: 'Brukere',
  },
  typescript: {
    interface: 'User',
  },
  admin: {
    group: collectionGroups.system,
    // Team editors only see their teams in the admin panel.
    hidden: hiddenFromEditors,
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'roles'],
  },
  auth: {
    // A working day, so people aren't sent through the login again before
    // they leave. Payload's default is two hours.
    tokenExpiration: 8 * 60 * 60,
    // For the integration user that sends files from the authoritative
    // source (ADR-0003). Changing PAYLOAD_SECRET makes the keys unreadable.
    useAPIKey: true,
  },
  access: {
    // Administrators, and the teameiere and teamledere who edit their teams
    // (TO-08, RO-06).
    admin: async ({ req }) => isAdmin(req.user) || (await isTeamEditor(req)),
    read: ({ req }) => isAdmin(req.user) || (isSignedIn(req.user) ? { id: { equals: req.user!.id } } : false),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeChange: [makeFirstUserAdmin],
    beforeLogin: [refuseIntegrationLogin],
  },
  endpoints: [providersEndpoint(providers), ...providers.flatMap(oidcEndpoints)],
  fields: [
    // Email added by default
    // The names come from the provider on every login.
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Administrator', value: 'admin' },
        // May call the import endpoints and nothing else (ADR-0003).
        { label: 'Integrasjon', value: 'integration' },
      ],
      validate: (value: unknown) =>
        Array.isArray(value) && value.includes('integration') && value.length > 1
          ? 'Integrasjonsbrukeren kan ikke ha andre roller.'
          : true,
    },
    {
      // The person the user is, so ilag can find their team memberships and
      // what they may edit (TO-08, RO-06). Set on every Entra ID login from
      // the active person with the same email; administrators can set it by
      // hand, for accounts whose email doesn't match.
      name: 'person',
      type: 'relationship',
      relationTo: 'personer',
      access: {
        create: ({ req }) => isAdmin(req.user),
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        position: 'sidebar',
        description: 'Settes ved innlogging fra personen med samme e-post.',
      },
    },
    {
      // How the user logs in besides a password: one entry per provider, with
      // the provider's own ID for the user. Set by the login only.
      name: 'identities',
      type: 'array',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: providers.map(({ id, label }) => ({ label, value: id })),
        },
        {
          name: 'subject',
          type: 'text',
          required: true,
          index: true,
        },
      ],
    },
  ],
}
