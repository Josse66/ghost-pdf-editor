import { expect, test } from '@playwright/test'

test('la app carga y promete privacidad', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Ghost PDF Editor')
  await expect(page.getByRole('heading', { name: 'Ghost PDF Editor' })).toBeVisible()
  await expect(page.getByText('Tu PDF nunca sale de este dispositivo.')).toBeVisible()
})
