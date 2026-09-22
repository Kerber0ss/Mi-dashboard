import { test, expect } from '@playwright/test'

/**
 * E2E smoke test: add a link card, edit its title/URL, switch the theme,
 * reload and verify both changes persisted (config saved via PUT /api/config,
 * restored by GET /api/config on boot).
 */
test('add link, switch theme, persists after reload', async ({ page }) => {
  await page.goto('/')

  // Enter edit mode (floating corner toggle: "✏️ Edit")
  await page.getByRole('button', { name: /редактировать/i }).click()

  // Add an empty link card, then click it to open the card editor
  await page.getByRole('button', { name: /ссылка/i }).click()
  await page.locator('.grid-cell').first().click()

  // Card editor (Link card dialog): fill title and URL, close with "Done"
  await page.getByLabel(/title/i).fill('GitHub')
  await page.getByLabel(/url/i).fill('https://github.com')
  await page.getByRole('button', { name: 'Готово', exact: true }).click()

  // Appearance settings → pick the "Web 3.0 Neon" theme
  await page.getByRole('button', { name: /оформление/i }).click()
  await page.getByText('Web 3.0 Neon').click()

  // Config saves are debounced (600ms): wait for the PUT to land before reloading
  await page.waitForResponse(
    (r) => r.url().includes('/api/config') && r.request().method() === 'PUT',
  )

  await page.reload()

  // Both the card and the theme choice survived the reload
  await expect(page.getByText('GitHub')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'web30')
})