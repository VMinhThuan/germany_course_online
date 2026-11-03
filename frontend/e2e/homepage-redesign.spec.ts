import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshotDir = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-implementation',
  'homepage-redesign',
  'screenshots',
)

const viewports = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
  { label: '320x640', width: 320, height: 640 },
]

async function hideDevelopmentControls(page: Page) {
  await page.addStyleTag({ content: '[data-dev-controls] { display: none !important; }' })
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.document,
    `${dimensions.document}px document at ${dimensions.viewport}px`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function expectAxePass(page: Page, label: string, scope?: string) {
  if (!scope) {
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  }
  const builder = new AxeBuilder({ page })
  if (scope) builder.include(scope)
  const result = await builder.analyze()
  expect(
    result.violations,
    `${label}: ${result.violations.map((item) => `${item.id} (${item.help})`).join(', ')}`,
  ).toEqual([])
}

async function capture(page: Page, filename: string, fullPage = false) {
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage,
    animations: 'disabled',
  })
}

async function captureSection(page: Page, selector: string, filename: string) {
  await page.addStyleTag({ content: 'header.sticky { position: static !important; }' })
  await page.locator(selector).screenshot({
    path: path.join(screenshotDir, filename),
    animations: 'disabled',
  })
}

test('homepage sections adapt to the requested viewport sizes without horizontal overflow', async ({
  page,
}) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await hideDevelopmentControls(page)
    await expect(
      page.getByRole('heading', {
        name: 'Nói tiếng Đức bắt đầu từ lời chào.',
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.locator('#pricing').getByRole('article').first()).toBeVisible()
    if (viewport.width < 1024) {
      await expect(page.getByRole('button', { name: 'Mở điều hướng chính' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeHidden()
    } else {
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
    }
    await expectNoHorizontalOverflow(page)

    if (viewport.label === '1440x900') {
      await capture(page, 'after-homepage-desktop-full-1440x900.png', true)
      await captureSection(page, '#hero', 'after-hero-desktop-1440x900.png')
    }
    if (viewport.label === '768x1024') {
      await capture(page, 'after-homepage-tablet-768x1024.png', true)
    }
    if (viewport.label === '1024x768') {
      await capture(page, 'after-homepage-laptop-1024x768.png', true)
    }
    if (viewport.label === '390x844') {
      await capture(page, 'after-homepage-mobile-full-390x844.png', true)
      await captureSection(page, '#hero', 'after-hero-mobile-390x844.png')
    }
    if (viewport.label === '320x640') {
      await capture(page, 'after-homepage-small-mobile-320x640.png', true)
    }
  }
})

test('homepage course and preview links use current catalog data without invented prices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hideDevelopmentControls(page)

  await expect(page.locator('#pricing').getByRole('article')).toHaveCount(1)
  await expect(page.locator('#pricing').getByText('Học phí đang cập nhật')).toBeVisible()
  await expect(
    page.locator('#pricing').getByText('Thời hạn truy cập đang được cập nhật'),
  ).toBeVisible()
  await expect(
    page.locator('#pricing').getByText(/(?:EUR|Lifetime|365 Days|€|\b\d+\.\d{2}\b)/),
  ).toHaveCount(0)
  await expect(
    page.locator('#pricing').getByRole('link', { name: 'Xem nội dung khóa' }),
  ).toHaveAttribute('href', '/courses/tieng-duc-a1-1')

  await page.locator('#hero').getByRole('link', { name: 'Học thử miễn phí' }).click()
  await expect(page).toHaveURL('/courses/tieng-duc-a1-1/preview')
  await expect(page.getByRole('heading', { name: 'Guten Tag! · Xin chào' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Điều hướng cuối trang' })).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Điều hướng cuối trang' })
      .getByRole('link', { name: 'Đăng nhập' }),
  ).toHaveAttribute('href', '/login')
})

test('hero, pricing and expanded FAQ screenshots pass axe on desktop and mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hideDevelopmentControls(page)
  await expect(page.locator('#pricing').getByRole('article').first()).toBeVisible()
  await expectAxePass(page, 'homepage initial desktop')

  await page.locator('#pricing').scrollIntoViewIfNeeded()
  await expectAxePass(page, 'homepage pricing desktop')
  await captureSection(page, '#pricing', 'after-pricing-desktop-1440x900.png')

  const firstQuestion = page.getByRole('button', {
    name: 'Tôi có thể học thử trước khi đăng nhập không?',
  })
  await firstQuestion.focus()
  await page.keyboard.press('Enter')
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByText(
      'Có. Ba chương được đánh dấu học thử có thể mở trực tiếp trên website mà không cần đăng nhập.',
    ),
  ).toBeVisible()
  await expectAxePass(page, 'homepage expanded FAQ desktop')
  await captureSection(page, '#faq', 'after-faq-desktop-expanded-1440x900.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await hideDevelopmentControls(page)
  await expect(page.locator('#pricing').getByRole('article').first()).toBeVisible()
  await captureSection(page, '#pricing', 'after-pricing-mobile-390x844.png')
  await page.getByRole('button', { name: 'Tôi có thể học thử trước khi đăng nhập không?' }).click()
  await expectNoHorizontalOverflow(page)
  await expectAxePass(page, 'homepage expanded FAQ mobile')
  await captureSection(page, '#faq', 'after-faq-mobile-expanded-390x844.png')

  await page.getByRole('button', { name: 'Mở điều hướng chính' }).click()
  const menu = page.getByRole('dialog', { name: 'Điều hướng' })
  await expect(menu).toBeVisible()
  await expectAxePass(page, 'homepage mobile menu open', '[role="dialog"]')
  await capture(page, 'after-mobile-menu-open-390x844.png')
  await menu.getByRole('link', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL('/courses')
})

test('authenticated homepage keeps student links and the demo login flow intact', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('combobox', { name: 'Tài khoản demo' }).click()
  await page.getByRole('option', { name: /Linh Nguyễn/ }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
  await expect(page).toHaveURL(/\/student(?:\/.*)?$/)

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Học của tôi' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Điều hướng cuối trang' }).getByRole('link', {
      name: 'Khu vực học viên',
    }),
  ).toHaveAttribute('href', '/student/courses')
})

test('homepage catalog loading state is announced accessibly', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      originalSetTimeout(
        handler,
        Math.max(timeout ?? 0, 1500),
        ...args,
      )) as typeof window.setTimeout
  })
  await page.goto('/')
  const loading = page.getByRole('status').filter({ hasText: 'Đang tải khóa học' })
  await expect(loading).toBeVisible()
  await expectAxePass(page, 'homepage loading pricing state')
})
