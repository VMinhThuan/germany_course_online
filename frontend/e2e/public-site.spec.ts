import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshotDir = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-implementation',
  'phase-2a',
  'screenshots',
)
const course = '/courses/tieng-duc-a1-1'
const preview = `${course}/preview`
const viewports = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
  { label: '320x640', width: 320, height: 640 },
]

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(screenshotDir, name),
    fullPage: true,
    animations: 'disabled',
  })
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map((element) => ({
        element: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        text: element.textContent?.trim().slice(0, 70) ?? '',
        right: Math.round(element.getBoundingClientRect().right),
        left: Math.round(element.getBoundingClientRect().left),
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter((element) => element.width > 0 && element.right > innerWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 5)
    return {
      excess: document.documentElement.scrollWidth - innerWidth,
      offenders,
    }
  })
  expect(overflow.excess, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1)
}

async function expectAxePass(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations,
    `${label}: ${result.violations.map((item) => item.id).join(', ')}`,
  ).toEqual([])
}

test.describe('public website responsive routes', () => {
  const routes = [
    {
      path: '/',
      heading: 'Bắt đầu giao tiếp bằng tiếng Đức, từng bước một.',
      title: 'Học tiếng Đức A1.1 · Deutsch A1.1',
    },
    {
      path: '/courses',
      heading: 'Chọn điểm bắt đầu của bạn',
      title: 'Khóa học · Deutsch A1.1',
    },
    {
      path: course,
      heading: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
      title: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp · Deutsch A1.1',
    },
    {
      path: `${preview}?sectionId=a11-chapter-01`,
      heading: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
      title: 'Học thử · Tiếng Đức A1.1 · Bắt đầu giao tiếp · Deutsch A1.1',
    },
  ]

  for (const viewport of viewports) {
    test(`renders all product routes at ${viewport.label}`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of routes) {
        await page.goto(route.path)
        await expect(
          page.getByRole('heading', { name: route.heading, exact: true }).first(),
        ).toBeVisible()
        await expect(page).toHaveTitle(route.title)
        await expect(
          page.getByText('Bản demo sản phẩm · Nội dung và thông tin khóa học đang được cập nhật'),
        ).toBeVisible()
        if (route.path === '/courses') {
          await expect(
            page.getByRole('link', {
              name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
              exact: true,
            }),
          ).toBeVisible()
        }
        await expectNoHorizontalOverflow(page)
        const name =
          route.path === '/'
            ? 'home'
            : route.path === '/courses'
              ? 'catalog'
              : route.path.endsWith('/preview') || route.path.includes('/preview?')
                ? 'preview'
                : 'course-detail'
        await capture(page, `${name}-${viewport.label}.png`)
      }

      expect(pageErrors).toEqual([])
    })
  }
})

test('supports chapter and lesson URL state, reload, Back and Forward', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(course)
  const firstChapter = page.getByRole('button', { name: 'Hallo! · Chào hỏi' })
  await firstChapter.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: 'Học thử miễn phí' }).first()).toBeVisible()
  await capture(page, 'course-detail-expanded-chapter.png')
  await page.getByRole('link', { name: 'Học thử miễn phí' }).first().click()
  await expect(page).toHaveURL(/sectionId=a11-chapter-01/)
  await expect(page.getByRole('heading', { name: 'Guten Tag! · Xin chào' })).toBeVisible()

  await page
    .getByRole('link', { name: /Ich heiße/ })
    .first()
    .click()
  await expect(page).toHaveURL(/sectionId=a11-chapter-02/)
  await expect(page.getByRole('heading', { name: 'Tên của tôi là …' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/sectionId=a11-chapter-01/)
  await expect(page.getByRole('heading', { name: 'Guten Tag! · Xin chào' })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/sectionId=a11-chapter-02/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tên của tôi là …' })).toBeVisible()
})

test('keeps paid sections guarded and shows honest not-ready purchase dialog', async ({ page }) => {
  await page.goto(`${preview}?sectionId=a11-chapter-04&lessonId=a11-lesson-06`)
  await expect(
    page.getByRole('status').filter({ hasText: 'Chương này thuộc khóa học đầy đủ' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bạn nói tiếng gì?' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Thông tin khóa học', exact: true })).toBeVisible()
  await capture(page, 'preview-paid-section-restricted.png')

  await page.goto(course)
  const purchase = page.getByRole('button', { name: 'Thông tin mua khóa học' })
  await purchase.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Đăng ký khóa học chưa mở' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('chưa nhận đăng ký hoặc thanh toán')
  await expect(page.getByRole('link', { name: /checkout|thanh toán/i })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(purchase).toBeFocused()
})

test('restores the landing scroll position after browser Back and supports keyboard routes', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight))
  const savedScroll = await page.evaluate(() => window.scrollY)
  const catalogLink = page.getByRole('link', { name: 'Xem khóa học' }).last()
  await catalogLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/courses$/)
  await expect(page.getByRole('heading', { name: 'Chọn điểm bắt đầu của bạn' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScroll - 24)
})

test('handles invalid slugs, query sections and missing preview content', async ({ page }) => {
  await page.goto('/courses/unknown-course')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy nội dung này' })).toBeVisible()

  await page.goto(`${preview}?sectionId=not-a-section`)
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không tìm thấy chương học thử' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/sectionId=not-a-section/)
  await capture(page, 'preview-invalid-section-error.png')

  await page.goto(`${preview}?sectionId=a11-chapter-01&lessonId=a11-lesson-02`)
  await expect(
    page.getByRole('status').filter({ hasText: 'Nội dung bài học đang được chuẩn bị' }),
  ).toBeVisible()
  await capture(page, 'preview-content-empty.png')
})

test('mobile chapter selector, public menu, keyboard access and key states pass axe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(preview)
  await expect(page.getByLabel('Chọn chương học thử')).toBeVisible()
  await page.getByLabel('Chọn chương học thử').selectOption('a11-chapter-03')
  await expect(page).toHaveURL(/sectionId=a11-chapter-03/)
  await expect(page.getByRole('heading', { name: 'Quê quán và quốc tịch' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expectAxePass(page, 'mobile preview')
  await capture(page, 'preview-mobile-chapter-selected.png')

  await page.getByRole('button', { name: 'Mở điều hướng chính' }).click()
  const menu = page.getByRole('dialog', { name: 'Điều hướng' })
  await expect(menu).toBeVisible()
  await expectAxePass(page, 'mobile public navigation')
  await capture(page, 'public-mobile-navigation-open.png')
  await menu.getByRole('link', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL(/\/courses$/)

  await page.setViewportSize({ width: 1440, height: 900 })
  for (const [route, name] of [
    ['/', 'landing'],
    ['/courses', 'catalog'],
    [course, 'course detail'],
    [preview, 'preview'],
  ]) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expectAxePass(page, name)
  }
})

test('captures a visible catalog loading state', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      originalSetTimeout(
        handler,
        Math.max(timeout ?? 0, 1500),
        ...args,
      )) as typeof window.setTimeout
  })
  await page.goto('/courses')
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải khóa học' })).toBeVisible()
  await capture(page, 'catalog-loading.png')
})
