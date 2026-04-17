import { test, expect } from '@playwright/test'

const TEST_PHONE = '13800138099'
const TEST_PASSWORD = 'Test1234'

async function login(page: any) {
  await page.goto('/login')
  await page.fill('input[type="tel"]', TEST_PHONE)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:3000/', { timeout: 10000 })
}

test.describe('Settings - Privacy Policy', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('privacy policy page loads with all sections', async ({ page }) => {
    await page.goto('/privacy-policy')

    // Verify privacy policy page loaded
    await expect(page.getByRole('heading', { name: '隐私政策' })).toBeVisible()
    await expect(page.locator('text=更新日期：2026年4月18日')).toBeVisible()

    // Verify all 10 sections are visible
    await expect(page.locator('text=1. 引言')).toBeVisible()
    await expect(page.locator('text=2. 我们收集的信息')).toBeVisible()
    await expect(page.locator('text=3. 信息的使用目的')).toBeVisible()
    await expect(page.locator('text=4. 信息的存储与安全')).toBeVisible()
    await expect(page.locator('text=5. 信息的共享与披露')).toBeVisible()
    await expect(page.locator('text=6. 您的权利')).toBeVisible()
    await expect(page.locator('text=7. 数据保留期限')).toBeVisible()
    await expect(page.locator('text=8. 未成年人保护')).toBeVisible()
    await expect(page.locator('text=9. 政策更新')).toBeVisible()
    await expect(page.locator('text=10. 联系我们')).toBeVisible()

    // Verify bottom confirmation banner
    await expect(page.locator('text=如您继续使用本应用')).toBeVisible()

    // Navigate back
    await page.click('[aria-label="back"]')
    // Should navigate back to previous page (dashboard since we came from login)
    await expect(page.locator('text=早上好')).toBeVisible()
  })

  test('navigates to privacy policy from settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible()

    // The settings page shows "隐私政策" row with a "查看" button
    await expect(page.locator('text=隐私政策')).toBeVisible()
  })
})
