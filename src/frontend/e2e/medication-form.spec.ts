import { test, expect } from '@playwright/test'

// Test credentials matching integration test setup
const TEST_PHONE = '13800138099'
const TEST_PASSWORD = 'Test1234'

async function login(page: any) {
  await page.goto('/login')
  await page.fill('input[type="tel"]', TEST_PHONE)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  // Wait for navigation to home/dashboard (route is '/')
  await page.waitForURL('http://localhost:3000/', { timeout: 10000 })
}

test.describe('Medication Form - BottomSelector', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('medication selector opens and shows all options including "other"', async ({ page }) => {
    await page.goto('/medications/new')
    await expect(page.getByRole('heading', { name: '添加用药' })).toBeVisible()

    // Open the medication name selector
    await page.click('text=点击选择常用药品')
    await expect(page.locator('text=选择药品')).toBeVisible()

    // Scroll to bottom and verify "other" option is visible and clickable
    await page.locator('text=其他（手动输入）').scrollIntoViewIfNeeded()
    await expect(page.locator('text=其他（手动输入）')).toBeVisible()
    await page.click('text=其他（手动输入）')

    // Verify custom input mode is activated
    await expect(page.locator('input[placeholder="请输入药品名称"]')).toBeVisible()
  })

  test('specification selector opens after selecting common medication', async ({ page }) => {
    await page.goto('/medications/new')

    // Select a common medication
    await page.click('text=点击选择常用药品')
    await page.click('text=环孢素软胶囊')

    // Open specification selector (auto-filled with first spec, button shows the value)
    await page.locator('button:has-text("mg")').click()
    await expect(page.locator('text=选择规格')).toBeVisible()

    // Verify "other" option at bottom is clickable
    await page.locator('text=其他（手动输入）').last().scrollIntoViewIfNeeded()
    await expect(page.locator('text=其他（手动输入）').last()).toBeVisible()
    await page.locator('text=其他（手动输入）').last().click()

    // Verify custom input mode is activated
    await expect(page.locator('input[placeholder="如：25mg/粒"]')).toBeVisible()
  })
})
