import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const ids = {
  course: '100000000000000000000001',
  section: '200000000000000000000001',
  lesson: '300000000000000000000001',
  comment: '400000000000000000000001',
  reply: '500000000000000000000001',
  admin: '600000000000000000000001',
  student: '700000000000000000000001',
}

const createdAt = '2026-11-10T08:20:00.000Z'
const editedAt = '2026-11-10T08:28:00.000Z'

const studentComment = {
  id: ids.comment,
  lessonId: ids.lesson,
  parentId: null,
  rootId: ids.comment,
  content: 'Mình chưa hiểu cách dùng mạo từ trong ví dụ này.',
  isAnonymous: false,
  isModerated: false,
  revision: 2,
  editedAt,
  createdAt,
  updatedAt: editedAt,
  author: { displayName: 'Minh Anh', avatarUrl: null, isAnonymous: false, role: 'STUDENT' },
  isMine: true,
  canEdit: true,
  canDelete: true,
  replyCount: 2,
  reactions: [
    { reactionType: 'LOVE', count: 3, isMine: true },
    { reactionType: 'LIKE', count: 2, isMine: false },
  ],
}

const studentReplies = [
  {
    ...studentComment,
    id: ids.reply,
    parentId: ids.comment,
    content: 'Bạn thử chú ý danh từ số ít ở câu thứ hai nhé.',
    isAnonymous: true,
    author: {
      displayName: 'Học viên ẩn danh',
      avatarUrl: null,
      isAnonymous: true,
      role: 'STUDENT',
    },
    isMine: false,
    canEdit: false,
    canDelete: false,
    replyCount: 0,
    reactions: [],
  },
  {
    ...studentComment,
    id: '500000000000000000000002',
    parentId: ids.comment,
    content: 'Mình sẽ bổ sung thêm ví dụ ở phần ghi chú.',
    isAnonymous: false,
    author: { displayName: 'Cô Mai', avatarUrl: null, isAnonymous: false, role: 'ADMIN' },
    isMine: false,
    canEdit: false,
    canDelete: false,
    replyCount: 0,
    reactions: [],
  },
]

const adminComment = {
  id: ids.comment,
  lessonId: ids.lesson,
  parentId: null,
  rootId: ids.comment,
  depth: 0,
  content: 'Mình chưa hiểu cách dùng mạo từ trong ví dụ này.',
  isAnonymous: true,
  author: {
    id: ids.student,
    fullName: 'Minh Anh',
    email: 'minh.anh@example.test',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
  revision: 2,
  editedAt,
  moderationEditedAt: null,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  createdAt,
  updatedAt: editedAt,
  replyCount: 2,
  reactionCount: 5,
  reactions: [
    { reactionType: 'LOVE', count: 3 },
    { reactionType: 'LIKE', count: 2 },
  ],
  myReaction: 'LOVE',
  context: {
    courseId: ids.course,
    courseTitle: 'Niveau A1.1',
    sectionId: ids.section,
    sectionTitle: 'Kapitel 1',
    lessonId: ids.lesson,
    lessonTitle: 'Begrüßung',
  },
}

const adminThread = [
  adminComment,
  {
    ...adminComment,
    id: ids.reply,
    parentId: ids.comment,
    depth: 1,
    content: 'Bạn thử chú ý danh từ số ít ở câu thứ hai nhé.',
    isAnonymous: true,
    author: { ...adminComment.author, fullName: 'Minh Anh' },
    replyCount: 0,
    reactionCount: 0,
    reactions: [],
    myReaction: null,
  },
]

function envelope(data: unknown) {
  return { success: true, data }
}

async function installFixtures(page: Page, role: 'STUDENT' | 'ADMIN') {
  let latestAdminComment = adminComment

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (path === '/auth/refresh') {
      await route.fulfill({ json: envelope({ accessToken: 'ui-11-fixture-access' }) })
      return
    }
    if (path === '/auth/me') {
      await route.fulfill({
        json: envelope({
          id: role === 'ADMIN' ? ids.admin : ids.student,
          fullName: role === 'ADMIN' ? 'Cô Mai' : 'Minh Anh',
          email: role === 'ADMIN' ? 'admin@example.test' : 'minh.anh@example.test',
          phone: null,
          avatarUrl: null,
          role,
          status: 'ACTIVE',
        }),
      })
      return
    }

    if (path === '/admin/courses') {
      await route.fulfill({
        json: envelope({
          items: [
            {
              id: ids.course,
              code: 'A1.1',
              slug: 'niveau-a1-1',
              title: 'Niveau A1.1',
              level: 'A1',
              description: '',
              shortDescription: '',
              objectives: [],
              requirements: [],
              thumbnailAssetId: null,
              bannerAssetId: null,
              introVideoAssetId: null,
              price: '0',
              accessDurationMonths: 12,
              sortOrder: 1,
              status: 'PUBLISHED',
              createdAt,
              updatedAt: createdAt,
              deletedAt: null,
            },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
          hasMore: false,
        }),
      })
      return
    }
    if (path === `/admin/courses/${ids.course}/sections`) {
      await route.fulfill({
        json: envelope({
          items: [
            {
              id: ids.section,
              courseId: ids.course,
              title: 'Kapitel 1',
              description: null,
              sectionType: 'CHAPTER',
              sortOrder: 1,
              status: 'PUBLISHED',
              createdAt,
              updatedAt: createdAt,
              deletedAt: null,
            },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
          hasMore: false,
        }),
      })
      return
    }
    if (path === `/admin/sections/${ids.section}/lessons`) {
      await route.fulfill({
        json: envelope({
          items: [
            {
              id: ids.lesson,
              sectionId: ids.section,
              title: 'Begrüßung',
              description: null,
              content: null,
              video: null,
              solutionVideo: null,
              lessonType: 'LECTURE',
              estimatedMinutes: 15,
              countsTowardProgress: true,
              sortOrder: 1,
              status: 'PUBLISHED',
              createdAt,
              updatedAt: createdAt,
              deletedAt: null,
            },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
          hasMore: false,
        }),
      })
      return
    }
    if (path === '/admin/students') {
      await route.fulfill({
        json: envelope({
          items: [
            {
              id: ids.student,
              fullName: 'Minh Anh',
              email: 'minh.anh@example.test',
              phone: null,
              avatarAssetId: null,
              role: 'STUDENT',
              status: 'ACTIVE',
              emailVerifiedAt: createdAt,
              createdAt,
              updatedAt: createdAt,
            },
          ],
          page: 1,
          pageSize: 50,
          total: 1,
          hasMore: false,
        }),
      })
      return
    }
    if (path === '/admin/lesson-comments/summary') {
      await route.fulfill({
        json: envelope({ total: 48, recent: 7, anonymous: 12, edited: 4, deleted: 2 }),
      })
      return
    }
    if (path === '/admin/lesson-comments' && method === 'GET') {
      const items =
        latestAdminComment.id === adminComment.id
          ? [adminComment]
          : [adminComment, latestAdminComment]
      await route.fulfill({
        json: envelope({ items, page: 1, pageSize: 20, total: items.length, hasMore: false }),
      })
      return
    }
    if (path.startsWith('/admin/lesson-comments/') && method === 'GET') {
      await route.fulfill({
        json: envelope({
          comment: latestAdminComment,
          thread: adminThread,
          threadTotal: 2,
          threadHasMore: false,
          history: [
            {
              id: 'revision-1',
              previousContent: 'Mình chưa hiểu phần này.',
              newContent: latestAdminComment.content,
              previousRevision: 1,
              newRevision: 2,
              editedAt,
              reason: null,
              editedBy: {
                id: ids.student,
                fullName: 'Minh Anh',
                email: 'minh.anh@example.test',
                role: 'STUDENT',
              },
            },
          ],
        }),
      })
      return
    }
    if (path === `/admin/lessons/${ids.lesson}/comments` && method === 'POST') {
      const input = route.request().postDataJSON() as { content: string }
      latestAdminComment = {
        ...adminComment,
        id: '800000000000000000000001',
        content: input.content,
        isAnonymous: false,
        author: {
          id: ids.admin,
          fullName: 'Cô Mai',
          email: 'admin@example.test',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      }
      await route.fulfill({ json: envelope(latestAdminComment) })
      return
    }
    if (path.startsWith('/admin/lesson-comments/') && method === 'PATCH') {
      const input = route.request().postDataJSON() as { content: string }
      latestAdminComment = { ...latestAdminComment, content: input.content, editedAt }
      await route.fulfill({ json: envelope(latestAdminComment) })
      return
    }
    if (path.startsWith('/admin/lesson-comments/') && method === 'DELETE') {
      await route.fulfill({ json: envelope({ id: ids.comment, descendantsDeleted: 1 }) })
      return
    }
    if (path.startsWith('/admin/lesson-comments/') && path.endsWith('/reaction')) {
      await route.fulfill({ json: envelope({ reactionType: 'LOVE' }) })
      return
    }

    if (path === `/learn/lessons/${ids.lesson}`) {
      await route.fulfill({
        json: envelope({
          id: ids.lesson,
          courseId: ids.course,
          sectionId: ids.section,
          title: 'Begrüßung',
          description: 'Chào hỏi trong những tình huống thường gặp.',
          content: { version: 1, paragraphs: ['Guten Morgen.', 'Wie geht es Ihnen?'] },
          video: null,
          solutionVideo: null,
          lessonType: 'LECTURE',
          estimatedMinutes: 15,
          countsTowardProgress: true,
          assets: [],
          media: [],
          exercises: [],
          canCompleteLesson: true,
          outstandingRequiredCount: 0,
        }),
      })
      return
    }
    if (path === `/me/courses/${ids.course}`) {
      await route.fulfill({
        json: envelope({
          course: {
            id: ids.course,
            code: 'A1.1',
            slug: 'niveau-a1-1',
            title: 'Niveau A1.1',
            level: 'A1.1',
            shortDescription: '',
            thumbnailUrl: null,
            price: '0',
            accessDurationMonths: 12,
            status: 'PUBLISHED',
            chapterCount: 1,
            lessonCount: 1,
          },
          sections: [
            {
              id: ids.section,
              title: 'Kapitel 1',
              description: '',
              sectionType: 'CHAPTER',
              sortOrder: 1,
              lessons: [
                {
                  id: ids.lesson,
                  title: 'Begrüßung',
                  description: '',
                  lessonType: 'LECTURE',
                  estimatedMinutes: 15,
                  countsTowardProgress: true,
                  sortOrder: 1,
                  hasVideo: false,
                  progress: { lessonId: ids.lesson, status: 'IN_PROGRESS', completedAt: null },
                  exercises: [],
                },
              ],
            },
          ],
          access: 'ACTIVE',
          progress: { courseId: ids.course, percent: 0, completedLessons: 0, totalLessons: 1 },
        }),
      })
      return
    }
    if (path === `/learn/lessons/${ids.lesson}/notes` && method === 'GET') {
      await route.fulfill({ json: envelope({ lessonId: ids.lesson, content: '' }) })
      return
    }
    if (path === `/learn/lessons/${ids.lesson}/comments` && method === 'GET') {
      await route.fulfill({
        json: envelope({ items: [studentComment], total: 1, hasMore: false, nextCursor: null }),
      })
      return
    }
    if (path === `/learn/comments/${ids.comment}/replies`) {
      await route.fulfill({
        json: envelope({ items: studentReplies, total: 2, hasMore: false, nextCursor: null }),
      })
      return
    }
    if (path === `/learn/comments/${ids.comment}/history`) {
      await route.fulfill({
        json: envelope({
          items: [
            {
              previousContent: 'Mình chưa hiểu phần này.',
              newContent: studentComment.content,
              previousRevision: 1,
              newRevision: 2,
              editedAt,
            },
          ],
        }),
      })
      return
    }
    await route.fulfill({
      status: 404,
      json: {
        success: false,
        error: { code: 'FIXTURE_NOT_FOUND', message: `No fixture for ${method} ${path}` },
      },
    })
  })
}

async function capture(page: Page, filename: string) {
  const directory = resolve(
    process.cwd(),
    '../docs/ui-refinement/UI-11-LESSON-DISCUSSION-REDESIGN/screenshots',
  )
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, filename), fullPage: true })
}

async function hideDevelopmentControls(page: Page) {
  await page.addStyleTag({ content: '[data-dev-controls] { display: none !important; }' })
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    app: document.getElementById('root')?.scrollWidth ?? 0,
  }))
  expect(Math.max(widths.document, widths.body, widths.app)).toBeLessThanOrEqual(widths.viewport)
}

async function expectNoSeriousA11yViolations(page: Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  )
  expect(
    serious.map(({ id, impact, nodes }) => ({
      name,
      id,
      impact,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  ).toEqual([])
}

test('Admin moderation inbox, catalog creation and mobile list/detail workflow', async ({
  page,
}) => {
  await installFixtures(page, 'ADMIN')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/lesson-comments')
  await hideDevelopmentControls(page)
  await expect(page.getByRole('heading', { name: 'Quản lý bình luận' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('minh.anh@example.test')).toBeVisible()
  await expect(page.getByText('Được đăng ẩn danh với học viên')).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'Admin inbox')
  await expectNoHorizontalOverflow(page)
  await capture(page, 'admin-inbox-selected-1440x900.png')
  await page.setViewportSize({ width: 768, height: 1024 })
  await expectNoHorizontalOverflow(page)
  expect(
    await page.getByRole('combobox', { name: 'Chương' }).evaluate((element) => element.clientWidth),
  ).toBeGreaterThanOrEqual(280)
  await capture(page, 'admin-inbox-selected-768x1024.png')
  await page.getByRole('button', { name: /Mở bình luận của Minh Anh/ }).click()
  await expect(page.getByRole('button', { name: 'Trở lại hộp thư' })).toBeVisible()
  await capture(page, 'admin-mobile-detail-768x1024.png')
  await page.getByRole('button', { name: 'Trở lại hộp thư' }).click()
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.getByRole('button', { name: /Bộ lọc nâng cao/ }).click()
  await expect(page.getByRole('dialog', { name: 'Bộ lọc nâng cao' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'Admin advanced filters')
  await capture(page, 'admin-advanced-filters-1440x900.png')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Bình luận mới' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Đăng bình luận quản trị viên' })
  await expect(createDialog).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'Admin create dialog')
  await createDialog.getByRole('combobox', { name: 'Khóa học' }).fill('Niveau')
  await createDialog.getByRole('option', { name: /Niveau A1\.1/ }).click()
  await createDialog.getByRole('combobox', { name: 'Chương' }).fill('Kapitel')
  await createDialog.getByRole('option', { name: /Kapitel 1/ }).click()
  await createDialog.getByRole('combobox', { name: 'Bài học' }).fill('Begrüßung')
  await createDialog.getByRole('option', { name: /Begrüßung/ }).click()
  await createDialog
    .getByLabel('Nội dung bình luận')
    .fill('Chú ý cách chào hỏi theo thời điểm trong ngày.')
  await capture(page, 'admin-create-comment-dialog-1440x900.png')
  const createRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname.endsWith(`/admin/lessons/${ids.lesson}/comments`),
  )
  await createDialog.getByRole('button', { name: 'Đăng bình luận' }).click()
  await createRequest
  await expect(createDialog).toBeHidden()

  const moderationMenu = page.getByRole('button', { name: 'Thao tác kiểm duyệt' })
  await moderationMenu.click()
  await capture(page, 'admin-moderation-menu-1440x900.png')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Thao tác kiểm duyệt' }).click()
  await page.getByRole('menuitem', { name: 'Chỉnh sửa', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Chỉnh sửa bình luận' })).toBeVisible()
  await capture(page, 'admin-inline-edit-1440x900.png')
  await page.getByRole('button', { name: 'Hủy' }).click()
  await page.getByRole('button', { name: 'Thao tác kiểm duyệt' }).click()
  await page.getByRole('menuitem', { name: /Lịch sử chỉnh sửa/ }).click()
  await expect(page.getByRole('dialog', { name: 'Lịch sử chỉnh sửa' })).toBeVisible()
  await capture(page, 'admin-history-1440x900.png')
  await page.getByRole('button', { name: 'Đóng', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm reaction' }).first().click()
  await capture(page, 'admin-reaction-picker-1440x900.png')
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Trở lại hộp thư' }).click()
  await expect(page.getByRole('region', { name: 'Bộ lọc bình luận' })).toBeVisible()
  await capture(page, 'admin-mobile-list-390x844.png')
  await page.getByRole('button', { name: /Mở bình luận của Minh Anh/ }).click()
  await expect(page.getByRole('button', { name: 'Trở lại hộp thư' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Bộ lọc bình luận' })).toBeHidden()
  await expectNoSeriousA11yViolations(page, 'Admin mobile detail')
  await expectNoHorizontalOverflow(page)
  await capture(page, 'admin-mobile-detail-390x844.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('Student lesson discussion threads and comment actions at desktop and mobile widths', async ({
  page,
}) => {
  await installFixtures(page, 'STUDENT')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/learn/lessons/${ids.lesson}`)
  await hideDevelopmentControls(page)
  await expect(page.getByRole('heading', { name: 'Thảo luận bài học' })).toBeVisible()
  await expect(page.getByText(studentComment.content)).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'Student discussion')
  await expectNoHorizontalOverflow(page)
  await capture(page, 'student-discussion-1440x900.png')
  expect(
    await page.evaluate(() => {
      const navigation = [...document.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Bài trước',
      )
      const discussion = document.getElementById('lesson-discussion-heading')
      return Boolean(
        navigation &&
        discussion &&
        navigation.compareDocumentPosition(discussion) & Node.DOCUMENT_POSITION_FOLLOWING,
      )
    }),
  ).toBe(true)

  await page.getByRole('button', { name: 'Xem 2 phản hồi' }).click()
  await expect(page.getByText(studentReplies[0]!.content)).toBeVisible()
  await capture(page, 'student-thread-expanded-1440x900.png')
  await page.getByRole('button', { name: 'Thêm reaction' }).first().click()
  await expectNoSeriousA11yViolations(page, 'Student reaction picker')
  await capture(page, 'student-reaction-picker-1440x900.png')
  await page.keyboard.press('Escape')
  const studentSidebar = page.locator('aside[aria-label="Điều hướng học viên chính"]')
  const courseOutline = page.locator('aside[aria-label="Nội dung khóa học"]')
  await expect(studentSidebar).toBeVisible()
  await expect(courseOutline).toBeVisible()
  await page.getByRole('button', { name: 'Thao tác bình luận' }).click()
  const layoutVisibility = await page.evaluate(() => {
    const intersectsViewport = (element: Element | null) => {
      if (!element) return false
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight
      )
    }
    return {
      sidebar: intersectsViewport(
        document.querySelector('aside[aria-label="Điều hướng học viên chính"]'),
      ),
      outline: intersectsViewport(document.querySelector('aside[aria-label="Nội dung khóa học"]')),
    }
  })
  expect(layoutVisibility).toEqual({ sidebar: true, outline: true })
  await expect(studentSidebar).toBeVisible()
  await expect(courseOutline).toBeVisible()
  await capture(page, 'student-action-menu-1440x900.png')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Trả lời' }).first().click()
  await expect(page.getByLabel('Nội dung phản hồi')).toBeVisible()
  await capture(page, 'student-inline-reply-1440x900.png')
  await page.getByRole('button', { name: 'Hủy' }).click()
  await page.getByRole('button', { name: 'Thao tác bình luận' }).click()
  await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click()
  await expect(page.getByRole('textbox', { name: 'Chỉnh sửa bình luận' })).toBeVisible()
  await capture(page, 'student-inline-edit-1440x900.png')
  await page.getByRole('button', { name: 'Hủy' }).click()
  await page.getByRole('button', { name: 'Đã chỉnh sửa' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Lịch sử chỉnh sửa' })).toBeVisible()
  await capture(page, 'student-history-1440x900.png')
  await page.getByRole('button', { name: 'Đóng', exact: true }).click()
  await page.getByRole('button', { name: 'Thao tác bình luận' }).click()
  await page.getByRole('menuitem', { name: 'Xóa bình luận' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await capture(page, 'student-delete-confirmation-1440x900.png')

  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 768, height: 1024 })
  await capture(page, 'student-discussion-768x1024.png')
  await expectNoHorizontalOverflow(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Thảo luận bài học' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'Student mobile discussion')
  await expectNoHorizontalOverflow(page)
  await capture(page, 'student-discussion-390x844.png')
})
