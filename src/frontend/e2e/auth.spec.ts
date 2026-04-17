import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1:has-text("欢迎回来")')).toBeVisible()
    await expect(page.locator('input[type="tel"]')).toBeVisible()
  })

  test('register page loads with privacy policy checkbox', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('h1:has-text("创建账号")')).toBeVisible()

    // Verify privacy policy checkbox and link exist
    await expect(page.locator('text=我已阅读并同意')).toBeVisible()
    await expect(page.locator('a:has-text("《隐私政策》")')).toBeVisible()

    // Verify submit button is disabled when not agreed
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
  })

  test('cannot register without agreeing to privacy policy', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[type="tel"]', '13900139000')
    await page.fill('input[type="password"]', 'Test1234')
    await page.fill('input[placeholder="请再次输入密码"]', 'Test1234')
    await page.fill('input[placeholder="请输入验证码"]', '123456')

    // Try submitting without checking the box
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (btn) btn.disabled = false
    })
    await page.click('button[type="submit"]')

    // Should show error toast
    await expect(page.locator('text=请阅读并同意隐私政策')).toBeVisible()
  })

  test('privacy policy link navigates to policy page', async ({ page }) => {
    await page.goto('/register')

    await page.click('a:has-text("《隐私政策》")')
    await expect(page.locator('h1:has-text("隐私政策")')).toBeVisible()
    await expect(page.locator('text=1. 引言')).toBeVisible()
  })
})
