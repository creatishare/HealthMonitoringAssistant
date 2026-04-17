import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('dashboard loads with key elements', async ({ page }) => {
    await page.goto('/')
    // Assuming user is logged in; adjust selectors based on actual UI
    await expect(page.locator('text=健康监测')).toBeVisible()
  })
})
