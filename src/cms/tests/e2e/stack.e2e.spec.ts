import { test, expect } from '@playwright/test'
import { seedTestUser, cleanupTestUser } from '../helpers/seedUser'

// Not the admin tests' user, so the files can run in parallel.
const testUser = { email: 'web@payloadcms.com', password: 'test' }

/**
 * The only tests that exercise the whole chain:
 * browser -> Astro SSR (:4321) -> Payload REST (:3000) -> PostgreSQL.
 *
 * The other suites stub or skip a link in it: the frontend tests stub fetch,
 * and the integration tests talk to Payload directly. The front page reads
 * its content and the newest tools from the CMS, which reads them from the
 * database; it shows its heading only once both have answered.
 */
test.describe('Full stack', () => {
  test.beforeAll(async () => {
    await seedTestUser(testUser)
  })

  test.afterAll(async () => {
    await cleanupTestUser(testUser)
  })

  test('shows nothing without logging in (NF-11)', async ({ page }) => {
    await page.goto('http://localhost:4321/')

    await expect(page).toHaveURL('http://localhost:4321/logg-inn?redirect=%2F')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Logg inn i ilag')
  })

  test('logs in with email and password and out again (NF-12)', async ({ page }) => {
    await page.goto('http://localhost:4321/')

    // Folded away when a provider such as Entra ID is configured.
    await page.locator('details').evaluate((details: HTMLDetailsElement) => (details.open = true))
    await page.getByLabel('E-post').fill(testUser.email)
    await page.getByLabel('Passord').fill(testUser.password)
    await page.getByRole('button', { name: 'Logg inn' }).click()

    await expect(page).toHaveURL('http://localhost:4321/')
    // The front page's own heading, whatever its content says.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Logg inn i ilag')
    // The site header shows who is logged in, by name or else email.
    await expect(page.getByRole('banner')).toContainText(testUser.email)

    await page.getByRole('button', { name: 'Logg ut' }).click()

    await expect(page).toHaveURL('http://localhost:4321/logg-inn')
    await page.goto('http://localhost:4321/')
    await expect(page).toHaveURL('http://localhost:4321/logg-inn?redirect=%2F')
  })
})
