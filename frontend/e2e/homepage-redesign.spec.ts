import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshotDir = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-implementation',
  'paniverse-homepage-redesign',
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

async function loadHomepageImages(page: Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images)
    images.forEach((image) => {
      image.loading = 'eager'
    })
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  })
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
  await page.locator(selector).screenshot({
    path: path.join(screenshotDir, filename),
    animations: 'disabled',
  })
}

test('homepage section order, brand, logo and responsive layout are correct', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await hideDevelopmentControls(page)

    await expect(
      page.getByRole('heading', {
        name: 'Học tiếng Đức từ những bước đầu tiên.',
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.locator('h1[lang="de"]')).toHaveCount(0)
    await expect(page.locator('#homepage-hero-title + p[lang="de"]')).toHaveText(
      'Deutsch lernen – Schritt für Schritt.',
    )
    await expect(page.locator('#pricing').getByRole('article').first()).toBeVisible()
    await expect(page.getByRole('img', { name: 'PAniverseDeutsch' }).first()).toBeVisible()
    await expect(page.locator('#learning-features article h3').first()).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    )
    await expect(page.locator('#pricing article h3 a')).toHaveCSS('color', 'rgb(255, 255, 255)')

    const sectionOrder = await page
      .locator('main > section')
      .evaluateAll((sections) => sections.map((section) => section.id))
    expect(sectionOrder).toEqual([
      'hero',
      'course-intro',
      'course-overview',
      'learning-features',
      'pricing',
      'learning-benefits',
      'faq',
    ])
    await expectNoHorizontalOverflow(page)

    if (viewport.width < 1024) {
      await expect(page.getByRole('button', { name: 'Mở điều hướng chính' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeHidden()
    } else {
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', {
          name: 'Giới thiệu',
        }),
      ).toHaveAttribute('href', '/#course-intro')
      await expect(
        page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', {
          name: 'Liên hệ',
        }),
      ).toHaveAttribute('href', '/#footer-contact')
    }

    if (viewport.label === '1440x900') {
      await loadHomepageImages(page)
      await capture(page, 'after-homepage-full-desktop-1440x900.png', true)
      await captureSection(page, '#hero', 'after-hero-desktop-1440x900.png')
      await captureSection(page, '#course-intro', 'after-course-introduction-desktop-1440x900.png')
      await captureSection(page, '#course-overview', 'after-youtube-overview-desktop-1440x900.png')
      await captureSection(
        page,
        '#learning-features',
        'after-learning-features-desktop-1440x900.png',
      )
      await captureSection(page, '#pricing', 'after-pricing-desktop-1440x900.png')
      await captureSection(page, '#learning-benefits', 'after-benefits-desktop-1440x900.png')
      await captureSection(page, '#footer-contact', 'after-footer-desktop-1440x900.png')
    }
    if (viewport.label === '768x1024') {
      await capture(page, 'after-homepage-tablet-768x1024.png', true)
    }
    if (viewport.label === '1024x768') {
      await capture(page, 'after-homepage-laptop-1024x768.png', true)
    }
    if (viewport.label === '390x844') {
      await loadHomepageImages(page)
      await capture(page, 'after-homepage-mobile-full-390x844.png', true)
      await captureSection(page, '#hero', 'after-hero-mobile-390x844.png')
      await captureSection(page, '#pricing', 'after-pricing-mobile-390x844.png')
      await captureSection(page, '#footer-contact', 'after-footer-mobile-390x844.png')
    }
    if (viewport.label === '320x640') {
      await expectNoHorizontalOverflow(page)
      await capture(page, 'after-homepage-small-mobile-320x640.png', true)
    }
  }
})

test('brand metadata, favicon assets, course data and footer contact details remain truthful', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hideDevelopmentControls(page)

  await expect(page).toHaveTitle('Học tiếng Đức A1.1 | PAniverseDeutsch')
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    'PAniverseDeutsch',
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'PAniverseDeutsch | Học tiếng Đức A1.1',
  )
  for (const asset of [
    '/assets/brand/favicon.svg',
    '/assets/brand/favicon-32x32.png',
    '/assets/brand/favicon.ico',
    '/assets/brand/apple-touch-icon.png',
    '/assets/brand/logo-primary.svg',
    '/assets/brand/logo-mark.svg',
    '/assets/brand/logo-light.svg',
    '/assets/brand/logo-dark.svg',
  ]) {
    expect((await request.get(asset)).ok(), `${asset} should resolve`).toBeTruthy()
  }

  await expect(page.locator('#pricing').getByRole('article')).toHaveCount(1)
  await expect(page.locator('#pricing').getByText('Học phí đang cập nhật')).toBeVisible()
  await expect(page.locator('#pricing').getByText('Thời hạn truy cập đang cập nhật')).toBeVisible()
  await expect(page.locator('#pricing').getByText('4 chương · 7 bài học')).toBeVisible()
  await expect(page.locator('#pricing').getByText(/(?:EUR|Lifetime|€|\b\d+\.\d{2}\b)/)).toHaveCount(
    0,
  )
  await expect(
    page.locator('#pricing').getByRole('link', { name: 'Xem nội dung khóa' }),
  ).toHaveAttribute('href', '/courses/tieng-duc-a1-1')
  await expect(page.locator('#footer-contact')).toContainText('Thông tin liên hệ sẽ được bổ sung')
  await expect(page.locator('#footer-contact a[href^="mailto:"]')).toHaveCount(0)
  await expect(page.locator('#footer-contact a[href^="tel:"]')).toHaveCount(0)
  await expect(
    page.locator('#footer-contact').getByRole('link', { name: /Điều khoản|Chính sách/ }),
  ).toHaveCount(0)

  const courseLink = page.locator('#pricing').getByRole('link', { name: 'Xem nội dung khóa' })
  await courseLink.click()
  await expect(page).toHaveURL('/courses/tieng-duc-a1-1')
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }),
  ).toBeVisible()
})

test('hero CTA, feature photos and the click-to-load YouTube player work in Chromium', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const youtubeRequests: string[] = []
  page.on('request', (requestEvent) => {
    const hostname = new URL(requestEvent.url()).hostname
    if (/^(?:www\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be|ytimg\.com)$/.test(hostname)) {
      youtubeRequests.push(requestEvent.url())
    }
  })
  await page.goto('/')
  await hideDevelopmentControls(page)

  await expect(
    page.locator('#hero').getByRole('link', { name: 'Học thử miễn phí' }),
  ).toHaveAttribute('href', '/courses/tieng-duc-a1-1/preview')
  await expect(page.locator('#learning-features article')).toHaveCount(4)
  await page.locator('#learning-features').scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      page
        .locator('#learning-features img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true)
  expect(youtubeRequests).toHaveLength(0)

  const videoFrame = page.locator('#course-overview .homepage-video-embed')
  const aspectRatio = await videoFrame.evaluate((element) => getComputedStyle(element).aspectRatio)
  expect(aspectRatio).toBe('16 / 9')
  await page.locator('#course-overview').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /Tải video:/ }).click()
  const player = page.getByTitle('Video giới thiệu khóa học Tiếng Đức A1.1 của PAniverseDeutsch')
  await expect(player).toBeVisible()
  await expect(player).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/L-lkjyMArwE?rel=0',
  )
  await expect(player).not.toHaveAttribute('src', /autoplay=/)
  await expect(page.getByRole('link', { name: 'Xem trên YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=L-lkjyMArwE',
  )
  await page.waitForTimeout(2500)
  expect(youtubeRequests.length).toBeGreaterThan(0)
  await captureSection(page, '#course-overview', 'after-youtube-player-loaded-1440x900.png')
})

test('expanded FAQ remains keyboard accessible and the mobile navigation reaches real routes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hideDevelopmentControls(page)
  await expectAxePass(page, 'homepage desktop')

  const firstQuestion = page.getByRole('button', {
    name: 'Tôi có thể học thử trước khi đăng ký không?',
  })
  await firstQuestion.focus()
  await page.keyboard.press('Enter')
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByText(
      'Có. Chọn “Học thử miễn phí” để mở nội dung được đánh dấu học thử mà không cần đăng nhập.',
    ),
  ).toBeVisible()
  await expectAxePass(page, 'homepage expanded FAQ desktop')
  await captureSection(page, '#faq', 'after-faq-desktop-expanded-1440x900.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await hideDevelopmentControls(page)
  await page.getByRole('button', { name: 'Tôi có thể học thử trước khi đăng ký không?' }).click()
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
  await expect(page).toHaveTitle('Đăng nhập | PAniverseDeutsch')
  await page.getByRole('combobox', { name: 'Tài khoản demo' }).click()
  await page.getByRole('option', { name: /Linh Nguyễn/ }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
  await expect(page).toHaveURL(/\/student(?:\/.*)?$/)

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Học của tôi' })).toBeVisible()
  await expect(
    page.locator('#footer-contact').getByRole('link', { name: 'Khu vực học viên' }),
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

test('brand artwork remains legible at favicon and header sizes', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 180 })
  await page.goto('/')
  await page.setContent(`
    <main style="display:flex;align-items:center;gap:32px;padding:24px;font:14px Arial,sans-serif">
      <figure style="margin:0;text-align:center"><img src="/assets/brand/favicon.svg" width="16" height="16" alt="PAniverseDeutsch 16px"><figcaption>16 px</figcaption></figure>
      <figure style="margin:0;text-align:center"><img src="/assets/brand/favicon.svg" width="32" height="32" alt="PAniverseDeutsch 32px"><figcaption>32 px</figcaption></figure>
      <figure style="margin:0"><img src="/assets/brand/logo-primary.svg" width="236" height="40" alt="PAniverseDeutsch header logo"></figure>
    </main>
  `)
  await expect(page.getByRole('img', { name: 'PAniverseDeutsch 16px' })).toHaveJSProperty(
    'naturalWidth',
    64,
  )
  await expect(page.getByRole('img', { name: 'PAniverseDeutsch 32px' })).toHaveJSProperty(
    'naturalWidth',
    64,
  )
  await expect(page.getByRole('img', { name: 'PAniverseDeutsch header logo' })).toBeVisible()
  await capture(page, 'after-brand-scales-16-32-header.png')
})
