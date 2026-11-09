import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const screenshots = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-refinement',
  'UI-09C-LETTERING-MIGRATION',
  'screenshots',
)

async function login(page: Page) {
  const response = await page.request.post('http://127.0.0.1:4141/api/v1/auth/login', {
    headers: { 'X-Device-Name': 'Playwright UI-09C' },
    data: {
      email: 'student-b.be05@example.test',
      password: 'BE04-Isolated-Test-123!',
    },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  await page.goto('/student')
  await expect(page.getByRole('heading', { name: 'Tổng quan học tập' })).toBeVisible()
}

async function expectHeadingFits(page: Page, heading: ReturnType<Page['getByRole']>) {
  await expect(heading).toBeVisible()
  const lettering = heading.locator('.decorative-heading-art svg')
  await expect(lettering).toBeVisible()
  const metrics = await lettering.evaluate((svg) => {
    const viewBox = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? []
    const rect = svg.getBoundingClientRect()
    const card = svg.closest('.decorative-heading-card')?.getBoundingClientRect()
    const paths = [...svg.querySelectorAll('path')]
    return {
      viewBox,
      width: rect.width,
      height: rect.height,
      cardWidth: card?.width ?? 0,
      pathCount: paths.length,
      validPaths: paths.every((item) => Boolean(item.getAttribute('d'))),
    }
  })
  expect(metrics.width).toBeGreaterThan(0)
  expect(metrics.height).toBeGreaterThan(0)
  expect(metrics.width).toBeLessThanOrEqual(metrics.cardWidth)
  expect(metrics.pathCount).toBeGreaterThan(0)
  expect(metrics.validPaths).toBe(true)
  expect(metrics.viewBox).toHaveLength(4)
  expect(metrics.viewBox.every(Number.isFinite)).toBe(true)
  expect(metrics.viewBox[2]).toBeGreaterThan(0)
  expect(metrics.viewBox[3]).toBeGreaterThan(0)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
}

test('UI-09C responsive title treatment remains legible across learning page viewports', async ({
  page,
}) => {
  await mkdir(screenshots, { recursive: true })
  await login(page)

  const courseId = '660000000000000000000003'
  const lessonId = '660000000000000000000005'
  const viewports = [
    { name: 'desktop-1440x900', width: 1440, height: 900 },
    { name: 'tablet-768x1024', width: 768, height: 1024 },
    { name: 'mobile-390x844', width: 390, height: 844 },
    // A 720 CSS-pixel layout viewport represents 200% zoom on a 1440px desktop.
    { name: 'desktop-200-percent-equivalent-720x450', width: 720, height: 450 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(`/learn/courses/${courseId}`)
    const courseHeading = page.getByRole('heading', { level: 1, name: 'Không gian khóa học' })
    await expectHeadingFits(page, courseHeading)
    if (viewport.name === 'mobile-390x844') {
      await expect
        .poll(() =>
          courseHeading
            .locator('.decorative-heading-art svg')
            .evaluate((svg) => svg.getBoundingClientRect().width),
        )
        .toBeGreaterThan(280)
    }
    await expect(page.getByText('Khóa học E2E tiếng Đức A1')).toBeVisible()
    if (viewport.name !== 'desktop-200-percent-equivalent-720x450') {
      await page.screenshot({
        path: path.join(screenshots, `course-${viewport.name}.png`),
        fullPage: true,
        animations: 'disabled',
        style: '[data-dev-controls] { display: none !important; }',
      })
    }
    await courseHeading.screenshot({
      path: path.join(screenshots, `course-heading-${viewport.name}.png`),
    })

    await page.goto(`/learn/lessons/${lessonId}`)
    const lessonHeading = page.getByRole('heading', { level: 1, name: 'Không gian bài học' })
    await expectHeadingFits(page, lessonHeading)
    if (viewport.name === 'mobile-390x844') {
      await expect
        .poll(() =>
          lessonHeading
            .locator('.decorative-heading-art svg')
            .evaluate((svg) => svg.getBoundingClientRect().width),
        )
        .toBeGreaterThan(280)
    }
    await expect(page.getByRole('link', { name: 'Quay lại' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toBeVisible()
    if (viewport.name !== 'desktop-200-percent-equivalent-720x450') {
      await page.screenshot({
        path: path.join(screenshots, `lesson-${viewport.name}.png`),
        fullPage: true,
        animations: 'disabled',
        style: '[data-dev-controls] { display: none !important; }',
      })
    }
    await lessonHeading.screenshot({
      path: path.join(screenshots, `lesson-heading-${viewport.name}.png`),
    })
  }
})
