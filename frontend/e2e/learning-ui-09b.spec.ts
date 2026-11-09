import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const screenshots = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-refinement',
  'UI-09B-LEARNING-EXPERIENCE',
  'screenshots',
)

async function login(page: Page) {
  const response = await page.request.post('http://127.0.0.1:4141/api/v1/auth/login', {
    headers: { 'X-Device-Name': 'Playwright UI-09B' },
    data: {
      email: 'student-b.be05@example.test',
      password: 'BE04-Isolated-Test-123!',
    },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  await page.goto('/student')
  await expect(page.getByRole('heading', { name: 'Tổng quan học tập' })).toBeVisible()
}

async function savePage(page: Page, filename: string) {
  await page.screenshot({
    path: path.join(screenshots, filename),
    fullPage: true,
    animations: 'disabled',
    style: '[data-dev-controls] { display: none !important; }',
  })
}

async function expectAxePass(page: Page, label: string) {
  await page.locator('[data-dev-controls]').evaluateAll((items) => {
    items.forEach((item) => ((item as HTMLElement).style.display = 'none'))
  })
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations,
    `${label}: ${result.violations.map((item) => `${item.id} (${item.nodes.length})`).join(', ')}`,
  ).toEqual([])
}

test('UI-09B learning pages render responsively and export review screenshots', async ({
  page,
}) => {
  await mkdir(screenshots, { recursive: true })
  await login(page)

  await page.setViewportSize({ width: 1440, height: 900 })
  const courseId = '660000000000000000000003'
  const lessonId = '660000000000000000000005'
  const exerciseId = '660000000000000000000006'

  await page.goto(`/learn/courses/${courseId}`)
  const courseHeading = page.getByRole('heading', { level: 1, name: 'Không gian khóa học' })
  await expect(courseHeading).toBeVisible()
  await expect
    .poll(() =>
      courseHeading
        .locator('.decorative-heading-art svg')
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(0)
  await expect(page.getByText('Khóa học E2E tiếng Đức A1')).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Lộ trình Khóa học E2E tiếng Đức A1' }),
  ).toBeVisible()
  const outlineNavigation = page.getByRole('navigation', {
    name: 'Lộ trình Khóa học E2E tiếng Đức A1',
  })
  const outlineLesson = outlineNavigation.locator(
    'button[aria-controls="660000000000000000000005-outline-items"]',
  )
  const exerciseLink = outlineNavigation.getByRole('link', { name: /Tài liệu bài tập E2E/ })
  await expect(outlineLesson).toHaveAttribute('aria-expanded', 'true')
  await outlineLesson.click()
  await expect(outlineLesson).toHaveAttribute('aria-expanded', 'false')
  await expect(exerciseLink).toHaveCount(0)
  await outlineLesson.click()
  await expect(exerciseLink).toBeVisible()
  await expect(exerciseLink).toHaveAttribute('href', `/learn/exercises/${exerciseId}`)
  await expectAxePass(page, 'course overview and expanded outline')
  await savePage(page, 'course-outline-expanded-real-exercise-1440x900.png')
  await exerciseLink.click()
  await expect(page).toHaveURL(`/learn/exercises/${exerciseId}`)
  await page.goto(`/learn/courses/${courseId}`)
  await expect(
    page.getByRole('navigation', { name: 'Lộ trình Khóa học E2E tiếng Đức A1' }),
  ).toBeVisible()
  await savePage(page, 'course-overview-desktop-1440x900.png')

  const courseOverviewEndpoint = `**/api/v1/me/courses/${courseId}`
  await page.route(courseOverviewEndpoint, async (route) => {
    const response = await route.fetch()
    const payload = await response.json()
    const lesson = payload.data.sections.flatMap(
      (section: { lessons: unknown[] }) => section.lessons,
    )[0] as {
      hasVideo: boolean
      exercises: unknown[]
    }
    lesson.hasVideo = true
    lesson.exercises = []
    await route.fulfill({ response, body: JSON.stringify(payload) })
  })
  await page.goto(`/learn/courses/${courseId}`)
  await expect(courseHeading).toBeVisible()
  await expect(outlineNavigation.getByRole('link', { name: /Video bài giảng/ })).toBeVisible()
  await expect(outlineNavigation.getByRole('link', { name: /Tài liệu bài tập E2E/ })).toHaveCount(0)
  await savePage(page, 'course-outline-video-without-exercises-1440x900.png')
  await page.unroute(courseOverviewEndpoint)

  await courseHeading.screenshot({ path: path.join(screenshots, 'heading-on-white.png') })
  await courseHeading.evaluate((element) => {
    element.style.backgroundColor = '#eaf7fb'
    element.style.borderRadius = '12px'
    element.style.padding = '12px'
  })
  await courseHeading.screenshot({ path: path.join(screenshots, 'heading-on-pastel-blue.png') })

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`/learn/courses/${courseId}`)
  await expect(courseHeading).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Lộ trình Khóa học E2E tiếng Đức A1' }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
  await savePage(page, 'course-overview-tablet-768x1024.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/learn/courses/${courseId}`)
  await expect(courseHeading).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Lộ trình Khóa học E2E tiếng Đức A1' }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
  await savePage(page, 'course-overview-mobile-390x844.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
  const sidebar = page.getByRole('complementary', { name: 'Nội dung khóa học' })
  await expect(sidebar).toBeVisible()
  await expect(sidebar.getByRole('link', { name: /Tài liệu bài tập E2E/ })).toHaveAttribute(
    'href',
    `/learn/exercises/${exerciseId}`,
  )
  await expectAxePass(page, 'lesson workspace')
  await savePage(page, 'lesson-workspace-desktop-sidebar-expanded-1440x900.png')

  await sidebar.evaluate((element) => {
    const activeLesson = element.querySelector('[aria-current="page"]')
    const title = activeLesson?.querySelector('span:nth-child(2)')
    if (activeLesson instanceof HTMLButtonElement && title instanceof HTMLElement) {
      title.textContent = 'Nach dem Befinden fragen (Sie)'
      activeLesson.title = title.textContent
    }
  })
  await savePage(page, 'lesson-sidebar-long-german-title-1440x900.png')

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
  await savePage(page, 'lesson-workspace-tablet-768x1024.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
  await savePage(page, 'lesson-workspace-mobile-390x844.png')
  await page.getByRole('button', { name: 'Nội dung khóa học' }).click()
  await expect(page.getByRole('dialog', { name: 'Khóa học E2E tiếng Đức A1' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tài liệu bài tập E2E/ })).toBeVisible()
  await savePage(page, 'lesson-outline-mobile-open-390x844.png')
})
