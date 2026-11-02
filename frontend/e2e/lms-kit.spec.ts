import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshotDir = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-implementation',
  'phase-1b',
  'screenshots',
)
const viewports = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '390x844', width: 390, height: 844 },
  { label: '320x640', width: 320, height: 640 },
]

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(screenshotDir, name),
    fullPage: true,
    animations: 'disabled',
  })
}

async function expectAxePass(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations,
    `${label}: ${results.violations.map((item) => item.id).join(', ')}`,
  ).toEqual([])
}

test.describe('LMS domain kit responsive views', () => {
  for (const viewport of viewports) {
    test(`renders at ${viewport.label} without horizontal overflow`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/__dev/lms-kit')
      await expect(
        page.getByRole('heading', { name: /Thư viện giao diện học tập/ }).first(),
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Nội dung khóa học' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Guten Tag!/ }).first()).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expect.poll(() => pageErrors).toEqual([])
      await capture(page, `lms-kit-${viewport.label}.png`)
    })
  }
})

test('supports keyboard navigation, lesson selection, exercise completion, and quiz submit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/__dev/lms-kit')
  await expect(page.getByRole('button', { name: /Guten Tag!/ }).first()).toBeVisible()
  const lessonLink = page.getByRole('link', { name: 'Bài học', exact: true })
  await lessonLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#course-tree$/)

  const chapter = page.getByRole('button', { name: /Hallo! · Chào hỏi/ })
  await chapter.focus()
  await page.keyboard.press('Enter')
  await expect(chapter).toHaveAttribute('aria-expanded', 'true')

  const radio = page.getByRole('radio', { name: 'Guten Morgen!' })
  await radio.focus()
  await page.keyboard.press('Space')
  await expect(radio).toBeChecked()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByRole('heading', { name: 'Kết quả bài làm' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Đáp án bài kiểm tra' })).toBeVisible()

  const completionAction = page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).first()
  await completionAction.click()
  await expect(page.getByRole('heading', { name: 'Lời giải của bài tập này' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tải Lời giải bài luyện nghe/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await capture(page, 'lms-kit-interactions-desktop.png')
})

test('keeps pending orders closed until the developer selects a confirmed fixture', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/__dev/lms-kit')
  const scenario = page.getByRole('combobox', { name: 'Kịch bản dữ liệu' })
  await scenario.click()
  await page.getByRole('option', { name: 'Đơn đang chờ thanh toán' }).click()
  await expect(page.getByText(/Quyền truy cập khóa học chưa được cấp/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mở khóa học' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Nạp fixture đã xác nhận' }).click()
  await expect(
    page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' }).first(),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mở khóa học' })).toBeVisible()
})

test('runs axe on populated, expanded, dialog, and API error states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/__dev/lms-kit')
  await expect(page.getByRole('heading', { name: 'Nội dung khóa học' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Guten Tag!/ }).first()).toBeVisible()
  await expectAxePass(page, 'populated')
  await capture(page, 'lms-kit-populated-axe.png')

  const chapter = page.getByRole('button', { name: /Hallo! · Chào hỏi/ })
  await chapter.click()
  await expect(page.getByRole('button', { name: 'Guten Tag!', exact: true })).toBeVisible()
  await expectAxePass(page, 'expanded')
  await capture(page, 'lms-kit-expanded-axe.png')

  await page.getByRole('button', { name: 'Giới thiệu demo' }).click()
  await expect(page.getByRole('dialog', { name: 'LMS Kit là showcase dev' })).toBeVisible()
  await expectAxePass(page, 'dialog')
  await capture(page, 'lms-kit-dialog-axe.png')
  await page.getByRole('button', { name: 'Đóng hộp thoại' }).click()

  await page.getByRole('combobox', { name: 'Response repository' }).click()
  await page.getByRole('option', { name: 'API error envelope' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Repository trả về lỗi' })).toBeVisible()
  await expectAxePass(page, 'API error')
  await capture(page, 'lms-kit-api-error-axe.png')
})

test('switches to empty, network, and HTTP response scenarios without crashing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/__dev/lms-kit')
  const responseMode = page.getByRole('combobox', { name: 'Response repository' })
  await responseMode.click()
  await page.getByRole('option', { name: 'Empty result' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Chưa có khóa học' })).toBeVisible()

  await responseMode.click()
  await page.getByRole('option', { name: 'Network failure' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không thể kết nối tới mock repository.' }).last(),
  ).toBeVisible()

  await responseMode.click()
  await page.getByRole('option', { name: 'API error envelope' }).click()
  await page.getByRole('combobox', { name: 'HTTP status mô phỏng' }).click()
  await page.getByRole('option', { name: '429' }).click()
  await expect(page.getByText('HTTP 429 · code: chưa có mã lỗi xác nhận trong V3')).toBeVisible()
})
