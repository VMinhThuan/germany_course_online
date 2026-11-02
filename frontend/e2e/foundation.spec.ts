import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshotDir = path.resolve(process.cwd(), '..', 'docs', 'ui-implementation', 'screenshots')
const viewports = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
  { label: '320x640', width: 320, height: 640 },
]

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(screenshotDir, name), animations: 'disabled' })
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('UI kit responsive views', () => {
  for (const viewport of viewports) {
    test(`renders at ${viewport.label} without page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/__dev/ui-kit')
      await expect(
        page.getByRole('heading', { name: /Hệ thống giao diện, sẵn sàng mở rộng\./ }),
      ).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await capture(page, `ui-kit-${viewport.label}.png`)
    })
  }
})

test('layout previews render at desktop and mobile sizes', async ({ page }) => {
  const layouts = [
    { route: 'public', heading: 'Một lộ trình học tiếng Đức rõ ràng, từng bước.' },
    { route: 'auth', heading: 'Auth shell' },
    { route: 'checkout', heading: 'Checkout shell' },
    { route: 'student', heading: 'Student shell' },
    { route: 'learning', heading: 'Learning shell' },
  ]

  for (const layout of layouts) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/__dev/layouts/${layout.route}`)
    await expect(page.getByText(layout.heading, { exact: true }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await capture(page, `${layout.route}-desktop-1440x900.png`)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(page.getByText(layout.heading, { exact: true }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await capture(page, `${layout.route}-mobile-390x844.png`)
  }
})

test('public mobile navigation opens and navigates through the sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/__dev/layouts/public')
  await page.getByRole('button', { name: 'Mở điều hướng chính' }).click()
  await expect(page.getByRole('dialog', { name: 'Điều hướng' })).toBeVisible()
  await capture(page, 'public-mobile-navigation-open.png')
  await page.getByRole('link', { name: 'Bắt đầu xem' }).last().click()
  await expect(page).toHaveURL(/\/__dev\/layouts\/learning$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('form validation is announced and confirmation returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/__dev/ui-kit')
  await page.getByRole('textbox', { name: 'Tên hiển thị' }).fill('A')
  await page.getByRole('textbox', { name: 'Địa chỉ email' }).fill('invalid')
  await page.getByRole('button', { name: 'Kiểm tra biểu mẫu' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Tên cần có ít nhất 2 ký tự.' }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Vui lòng nhập email hợp lệ.' }).first(),
  ).toBeVisible()
  await capture(page, 'form-validation-desktop.png')

  const trigger = page.getByRole('button', { name: 'Xác nhận thao tác' })
  await trigger.focus()
  await trigger.click()
  const dialog = page.getByRole('alertdialog', { name: 'Lưu thay đổi?' })
  await expect(dialog).toBeVisible()
  await capture(page, 'confirmation-dialog-desktop.png')
  await page.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('showcase and each shell pass axe accessibility checks', async ({ page }) => {
  const routes = [
    '/__dev/ui-kit',
    '/__dev/layouts/public',
    '/__dev/layouts/auth',
    '/__dev/layouts/checkout',
    '/__dev/layouts/student',
    '/__dev/layouts/learning',
  ]

  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      `${route}: ${results.violations.map((item) => item.id).join(', ')}`,
    ).toEqual([])
  }
})
