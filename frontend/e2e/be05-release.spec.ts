import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const apiBase = 'http://127.0.0.1:4141/api/v1'
const webOrigin = 'http://127.0.0.1:4173'
const controlToken = 'BE05-LOCAL-RESET-ONLY-6f3bf983'
const password = 'BE04-Isolated-Test-123!'
const ids = {
  student: '660000000000000000000001',
  studentB: '66000000000000000000000b',
  admin: '660000000000000000000002',
  courseA: '660000000000000000000003',
  courseB: '660000000000000000000009',
  courseC: '66000000000000000000000a',
  lesson: '660000000000000000000005',
  fileExercise: '660000000000000000000006',
  quizExercise: '660000000000000000000007',
  renewalActive: 'renewal-active.be05@example.test',
  renewalExpired: 'renewal-expired.be05@example.test',
  renewalRevoked: 'renewal-revoked.be05@example.test',
}

async function resetFixtures(request: APIRequestContext) {
  const response = await request.post('http://127.0.0.1:4142/reset', {
    headers: { Origin: webOrigin, 'X-BE05-Control': controlToken },
  })
  expect(response.status(), 'test-only reset control must accept only the isolated request').toBe(
    204,
  )
}

async function login(page: Page, email: string) {
  if (!page.url().includes('/login')) await page.goto('/login')
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/login',
  )
  await page.getByLabel('Email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/\/login/)
  const body = await (await responsePromise).json()
  return body.data.accessToken as string
}

async function checkout(page: Page, path: string) {
  const quotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/checkout/quote',
  )
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Tạo đơn hàng' })).toBeVisible()
  return (await (await quotePromise).json()).data as Record<string, string>
}

async function applyCoupon(page: Page, code: string, captureQuote = false) {
  const validationPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/coupons/validate',
  )
  const quotePromise = captureQuote
    ? page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === '/api/v1/checkout/quote' &&
          new URL(response.url()).searchParams.get('couponCode') === code,
      )
    : undefined
  await page.getByLabel('Mã coupon').fill(code)
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  const validation = await validationPromise
  return {
    validation,
    ...(quotePromise
      ? { quote: (await (await quotePromise).json()).data as Record<string, string> }
      : {}),
  }
}

async function apiGet(request: APIRequestContext, path: string, token: string) {
  return request.get(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token}` } })
}

async function apiPost(
  request: APIRequestContext,
  path: string,
  token: string,
  body: unknown = {},
) {
  return request.post(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  })
}

async function adminPage(browser: Browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, 'admin.be04@example.test')
  return page
}

test.beforeEach(async ({ request }) => {
  await resetFixtures(request)
})

test('purchase pricing, coupon reservation, cancellation and Admin reconciliation follow server state', async ({
  page,
  browser,
  request,
}) => {
  await page.goto('/courses')
  await expect(page.getByText('Khóa học E2E tiếng Đức A1', { exact: true })).toBeVisible()
  const studentToken = await login(page, 'student.be04@example.test')

  const firstQuote = await checkout(page, `/checkout/${ids.courseA}`)
  expect(firstQuote).toMatchObject({
    baseAmount: '1950000',
    automaticDiscountAmount: '0',
    discountAmount: '0',
    totalAmount: '1950000',
  })
  await page.getByLabel('Mã coupon').fill('BE05EXPIRED')
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Mã coupon').fill('BE05OFF')
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Mã coupon').fill('BE05ONE')
  const oneUseQuotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/checkout/quote' &&
      new URL(response.url()).searchParams.get('couponCode') === 'BE05ONE',
  )
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  expect((await (await oneUseQuotePromise).json()).data).toMatchObject({
    discountSource: 'COUPON',
    couponDiscountAmount: '195000',
    totalAmount: '1755000',
  })
  await expect(page.getByText(/1\.755\.000/)).toBeVisible()
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const firstOrderId = new URL(page.url()).pathname.split('/')[2]!
  await expect(page.getByText('Đang chờ chuyển khoản')).toBeVisible()

  const pendingPurchaseQuote = await checkout(page, `/checkout/${ids.courseB}`)
  expect(pendingPurchaseQuote).toMatchObject({
    automaticDiscountAmount: '0',
    discountAmount: '0',
    totalAmount: '2000000',
  })

  const admin = await adminPage(browser)
  await admin.goto('/admin/coupons')
  await expect(admin.getByRole('heading', { level: 1, name: 'Mã ưu đãi' })).toBeVisible()
  await expect(admin.getByText(/Đã giữ 1 · đã dùng 0/)).toBeVisible()
  const couponPagination = admin.getByRole('navigation', { name: 'Phân trang' })
  await expect(couponPagination.getByText('Trang 1 / 2')).toBeVisible()
  await couponPagination.getByRole('button', { name: 'Trang sau' }).click()
  await expect(couponPagination.getByText('Trang 2 / 2')).toBeVisible()
  await couponPagination.getByRole('button', { name: 'Trang trước' }).click()
  await expect(couponPagination.getByText('Trang 1 / 2')).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept())
  await page.goto(`/orders/${firstOrderId}/pending`)
  await page.getByRole('button', { name: 'Hủy đơn' }).click()
  await expect(page).toHaveURL(`/orders/${firstOrderId}/result`)
  const repeatedCancellation = await apiPost(
    request,
    `/orders/${firstOrderId}/cancel`,
    studentToken,
  )
  expect(repeatedCancellation.status()).toBe(200)
  expect((await repeatedCancellation.json()).data.order.status).toBe('CANCELLED')

  await admin.reload()
  await expect(admin.getByText(/Đã giữ 0 · đã dùng 0/).first()).toBeVisible()
  await checkout(page, `/checkout/${ids.courseA}`)
  await page.getByLabel('Mã coupon').fill('BE05ONE')
  const reusableQuote = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/checkout/quote' &&
      new URL(response.url()).searchParams.get('couponCode') === 'BE05ONE',
  )
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  expect((await (await reusableQuote).json()).data.discountSource).toBe('COUPON')
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const paidOrderId = new URL(page.url()).pathname.split('/')[2]!
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click()
  await expect(page.getByText('Đã báo chuyển khoản · chờ Admin đối soát')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hủy đơn' })).toHaveCount(0)
  const afterReportCancellation = await apiPost(
    request,
    `/orders/${paidOrderId}/cancel`,
    studentToken,
  )
  expect(afterReportCancellation.status()).toBe(409)
  expect((await afterReportCancellation.json()).error.code).toBe('TRANSFER_ALREADY_SUBMITTED')

  await admin.goto(`/admin/orders/${paidOrderId}`)
  await expect(admin.getByRole('button', { name: 'Duyệt đã nhận tiền' })).toBeEnabled()
  admin.once('dialog', (dialog) => void dialog.accept())
  await admin.getByRole('button', { name: 'Duyệt đã nhận tiền' }).click()
  await expect(admin.getByText('Backend đã duyệt đơn và cập nhật quyền học.').first()).toBeVisible()
  const paidOrderCancellation = await apiPost(
    request,
    `/orders/${paidOrderId}/cancel`,
    studentToken,
  )
  expect(paidOrderCancellation.status()).toBe(409)
  expect((await paidOrderCancellation.json()).error.code).toBe('ORDER_NOT_CANCELLABLE')
  await admin.goto('/admin/coupons')
  await expect(admin.getByText(/Đã giữ 0 · đã dùng 1/)).toBeVisible()

  const fixedQuote = await checkout(page, `/checkout/${ids.courseB}`)
  expect(fixedQuote).toMatchObject({
    automaticDiscountAmount: '100000',
    discountAmount: '100000',
    totalAmount: '1900000',
  })
  const fixedCoupon = await applyCoupon(page, 'BE05FIXED', true)
  expect(fixedCoupon.validation.status()).toBe(200)
  const fixedQuoteData = fixedCoupon.quote
  expect(fixedQuoteData).toMatchObject({
    discountSource: 'COUPON',
    couponDiscountAmount: '150000',
    totalAmount: '1850000',
  })
  await expect(page.getByText(/1\.850\.000/)).toBeVisible()

  const lowCoupon = await applyCoupon(page, 'BE05LOW', true)
  expect(lowCoupon.validation.status()).toBe(200)
  const lowQuote = lowCoupon.quote
  expect(lowQuote).toMatchObject({
    discountSource: 'AUTOMATIC_5_PERCENT',
    discountAmount: '100000',
    totalAmount: '1900000',
  })

  const tieCoupon = await applyCoupon(page, 'BE05TIE', true)
  expect(tieCoupon.validation.status()).toBe(200)
  const tieQuote = tieCoupon.quote
  expect(tieQuote).toMatchObject({
    discountSource: 'AUTOMATIC_5_PERCENT',
    discountAmount: '100000',
    totalAmount: '1900000',
  })

  const courseCQuote = await checkout(page, `/checkout/${ids.courseC}`)
  expect(courseCQuote).toMatchObject({
    automaticDiscountAmount: '125000',
    discountAmount: '125000',
    totalAmount: '2375000',
  })
  await page.getByLabel('Mã coupon').fill('BE05LOW')
  const lowOnCourseCQuotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/checkout/quote' &&
      new URL(response.url()).searchParams.get('couponCode') === 'BE05LOW',
  )
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  const lowOnCourseC = (await (await lowOnCourseCQuotePromise).json()).data
  expect(lowOnCourseC).toMatchObject({
    discountSource: 'AUTOMATIC_5_PERCENT',
    couponDiscountAmount: '50000',
    totalAmount: '2375000',
  })

  await checkout(page, `/checkout/${ids.courseC}`)
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const adminCancellationOrderId = new URL(page.url()).pathname.split('/')[2]!
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click()
  await admin.goto(`/admin/orders/${adminCancellationOrderId}`)
  const adminCancel = admin.getByRole('button', { name: 'Hủy đơn sau đối soát' })
  await expect(adminCancel).toBeDisabled()
  await admin.getByLabel('Lý do bắt buộc').fill('Đối soát fixture xác nhận không có tiền vào.')
  await admin.getByLabel('Kết quả đối soát bên ngoài').selectOption('NO_FUNDS_RECEIVED')
  admin.once('dialog', (dialog) => void dialog.accept())
  await adminCancel.click()
  await expect(
    admin.getByText('Đã cập nhật hủy đơn theo kết quả đối soát bạn xác nhận.').first(),
  ).toBeVisible()
  await expect(admin.getByText('NO_FUNDS_RECEIVED')).toBeVisible()
  await admin.context().close()
})

test('renewal supports active and expired enrollments, reuses the existing record and preserves learning state', async ({
  page,
  browser,
  request,
}) => {
  const token = await login(page, ids.renewalActive)
  const initialEnrollmentResponse = await apiGet(request, '/me/courses?page=1&pageSize=100', token)
  expect(initialEnrollmentResponse.status()).toBe(200)
  const initialEnrollments = (await initialEnrollmentResponse.json()).data.items as Array<{
    id: string
    courseId: string
    expiresAt: string
    progressPercent: number
  }>
  const initialEnrollment = initialEnrollments.find((item) => item.courseId === ids.courseA)
  expect(initialEnrollment).toBeDefined()
  const enrollmentId = initialEnrollment!.id
  const initialExpiry = initialEnrollment!.expiresAt

  await page.goto(`/learn/lessons/${ids.lesson}`)
  await page.getByLabel('Nội dung ghi chú').fill('Ghi chú BE-05 phải còn nguyên sau khi gia hạn.')
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.goto(`/learn/exercises/${ids.quizExercise}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await expect(page.getByText('Chọn cách nói “Tạm biệt”.')).toBeVisible()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/[^/]+\/result(?:\?|$)/)
  const attemptId = new URL(page.url()).pathname.split('/')[3]!
  await expect(page.getByText('0 / 1 câu đúng')).toBeVisible()
  const initialProgressResponse = await apiGet(
    request,
    `/learn/courses/${ids.courseA}/progress`,
    token,
  )
  expect(initialProgressResponse.status()).toBe(200)
  const initialProgress = (await initialProgressResponse.json()).data

  await page.goto(`/student/courses/${ids.courseA}/renew`)
  await expect(page.getByText('Gia hạn 3 tháng · E2E')).toBeVisible()
  await page.getByRole('link', { name: /Tiếp tục/ }).click()
  await expect(page).toHaveURL(new RegExp(`/checkout/${ids.courseA}\\?type=RENEWAL&plan=`))
  const quotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/checkout/quote',
  )
  await expect(page.getByRole('heading', { name: 'Tạo đơn hàng' })).toBeVisible()
  const renewalQuote = (await (await quotePromise).json()).data
  expect(renewalQuote).toMatchObject({
    orderType: 'RENEWAL',
    baseAmount: '450000',
    automaticDiscountAmount: '0',
    discountAmount: '0',
    totalAmount: '450000',
    durationMonths: 3,
  })
  await expect(page.getByText(/450\.000/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const orderId = new URL(page.url()).pathname.split('/')[2]!
  await expect(page.getByText('Đang chờ chuyển khoản')).toBeVisible()
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click()

  const admin = await adminPage(browser)
  await admin.goto(`/admin/orders/${orderId}`)
  admin.once('dialog', (dialog) => void dialog.accept())
  await admin.getByRole('button', { name: 'Duyệt đã nhận tiền' }).click()
  await expect(admin.getByText('Backend đã duyệt đơn và cập nhật quyền học.').first()).toBeVisible()

  const renewedEnrollmentResponse = await apiGet(request, '/me/courses?page=1&pageSize=100', token)
  expect(renewedEnrollmentResponse.status()).toBe(200)
  const renewedEnrollments = (await renewedEnrollmentResponse.json()).data.items as Array<{
    id: string
    courseId: string
    expiresAt: string
    progressPercent: number
  }>
  const renewedEnrollment = renewedEnrollments.find((item) => item.courseId === ids.courseA)
  expect(renewedEnrollment?.id).toBe(enrollmentId)
  expect(Date.parse(renewedEnrollment!.expiresAt)).toBeGreaterThan(Date.parse(initialExpiry))
  const renewedProgressResponse = await apiGet(
    request,
    `/learn/courses/${ids.courseA}/progress`,
    token,
  )
  expect(renewedProgressResponse.status()).toBe(200)
  expect((await renewedProgressResponse.json()).data).toEqual(initialProgress)

  await page.goto(`/learn/lessons/${ids.lesson}`)
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveValue(
    'Ghi chú BE-05 phải còn nguyên sau khi gia hạn.',
  )
  await page.goto(`/learn/quizzes/${attemptId}/result`)
  await expect(page.getByText('0 / 1 câu đúng')).toBeVisible()
  await expect(page.getByText('Đáp án được hệ thống trả về: Auf Wiedersehen')).toBeVisible()

  const plan = renewalQuote.renewalPlanId as string
  const expiredPage = await browser.newPage()
  const expiredToken = await login(expiredPage, ids.renewalExpired)
  const expiredQuote = await apiGet(
    request,
    `/checkout/quote?courseId=${ids.courseA}&orderType=RENEWAL&renewalPlanId=${plan}`,
    expiredToken,
  )
  expect(expiredQuote.status()).toBe(200)
  const revokedPage = await browser.newPage()
  const revokedToken = await login(revokedPage, ids.renewalRevoked)
  const revokedQuote = await apiGet(
    request,
    `/checkout/quote?courseId=${ids.courseA}&orderType=RENEWAL&renewalPlanId=${plan}`,
    revokedToken,
  )
  expect(revokedQuote.status()).toBe(409)
  expect((await revokedQuote.json()).error.code).toBe('ENROLLMENT_REVOKED')
  await Promise.all([admin.context().close(), expiredPage.close(), revokedPage.close()])
})

test('Student resource isolation, server RBAC, account block and reactivation do not revive old sessions', async ({
  page,
  browser,
  request,
}) => {
  const studentBToken = await login(page, 'student-b.be05@example.test')
  await page.goto(`/learn/lessons/${ids.lesson}`)
  await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toBeVisible()
  const noteContent = 'Ghi chú riêng của học viên B.'
  await page.getByLabel('Nội dung ghi chú').fill(noteContent)
  const saveNotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/v1/learn/lessons/${ids.lesson}/notes`,
  )
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click()
  const savedNote = await saveNotePromise
  expect(savedNote.status()).toBe(200)
  expect((await savedNote.json()).data.content).toBe(noteContent)
  await page.goto(`/learn/exercises/${ids.quizExercise}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/[^/]+\/result(?:\?|$)/)
  const attemptId = new URL(page.url()).pathname.split('/')[3]!
  await page.goto(`/checkout/${ids.courseB}`)
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const studentBOrderId = new URL(page.url()).pathname.split('/')[2]!

  const studentAPage = await browser.newPage()
  const studentAToken = await login(studentAPage, 'student.be04@example.test')
  const lessonResponse = studentAPage.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/v1/learn/lessons/${ids.lesson}`,
  )
  await studentAPage.goto(`/learn/lessons/${ids.lesson}`)
  expect((await lessonResponse).status()).toBe(404)
  await expect(studentAPage.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toHaveCount(
    0,
  )
  const noteResponse = await apiGet(request, `/learn/lessons/${ids.lesson}/notes`, studentAToken)
  expect(noteResponse.status()).toBe(404)
  const attemptResponse = await apiGet(
    request,
    `/learn/quiz-attempts/${attemptId}/result`,
    studentAToken,
  )
  expect(attemptResponse.status()).toBe(404)
  const orderResponse = await apiGet(request, `/orders/${studentBOrderId}`, studentAToken)
  expect(orderResponse.status()).toBe(404)
  const crossCancel = await apiPost(request, `/orders/${studentBOrderId}/cancel`, studentAToken)
  expect(crossCancel.status()).toBe(404)
  const forbiddenAdminApi = await apiGet(request, '/admin/orders', studentAToken)
  expect(forbiddenAdminApi.status()).toBe(403)
  await studentAPage.goto('/admin')
  await expect(studentAPage).not.toHaveURL(/\/admin/)

  const admin = await adminPage(browser)
  await admin.goto(`/admin/students/${ids.studentB}`)
  await expect(admin.getByRole('heading', { name: 'Học viên BE-05 thứ hai' })).toBeVisible()
  admin.once('dialog', (dialog) => void dialog.accept())
  await admin.getByRole('button', { name: 'Khóa tài khoản' }).click()
  await expect(
    admin.getByText('Đã khóa tài khoản; backend đã áp dụng quy tắc thu hồi phiên.'),
  ).toBeVisible()
  const blockedAccess = await apiGet(request, '/me/courses', studentBToken)
  expect(blockedAccess.status()).toBe(401)

  admin.once('dialog', (dialog) => void dialog.accept())
  await admin.getByRole('button', { name: 'Mở lại tài khoản' }).click()
  await expect(admin.getByText('Đã mở lại tài khoản.')).toBeVisible()
  const staleSessionAfterReactivation = await apiGet(request, '/me/courses', studentBToken)
  expect(staleSessionAfterReactivation.status()).toBe(401)
  await Promise.all([studentAPage.close(), admin.context().close()])
})

test('Admin renewal plan, enrollment lifecycle and partial settings changes use audited backend operations', async ({
  browser,
  request,
}) => {
  const admin = await browser.newPage()
  const adminToken = await login(admin, 'admin.be04@example.test')
  await admin.goto('/admin/renewal-plans')
  await admin.getByLabel('Khóa học').selectOption(ids.courseB)
  await admin.getByLabel('Tên gói').fill('Gói gia hạn BE-05 tạo từ UI')
  await admin.getByLabel('Số tháng').fill('6')
  await admin.getByLabel('Giá (VND nguyên)').fill('650000')
  await admin.getByRole('button', { name: 'Tạo gói' }).click()
  await expect(admin.getByText('Đã tạo gói gia hạn.')).toBeVisible()
  const newPlan = admin.getByText('Gói gia hạn BE-05 tạo từ UI', { exact: true })
  await expect(newPlan).toBeVisible()
  const plansResponse = await apiGet(
    request,
    `/admin/courses/${ids.courseB}/renewal-plans?page=1&pageSize=20`,
    adminToken,
  )
  const planId = (
    (await plansResponse.json()).data.items as Array<{ id: string; title: string }>
  ).find((plan) => plan.title === 'Gói gia hạn BE-05 tạo từ UI')!.id
  const planCard = newPlan.locator('../..')
  await planCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  await admin.getByLabel('Tên gói').fill('Gói gia hạn BE-05 đã cập nhật')
  await admin.getByLabel('Giá (VND nguyên)').fill('675000')
  await admin.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(admin.getByText('Đã cập nhật gói gia hạn.')).toBeVisible()
  await expect(admin.getByText('Gói gia hạn BE-05 đã cập nhật', { exact: true })).toBeVisible()
  const updatedPlanCard = admin
    .getByText('Gói gia hạn BE-05 đã cập nhật', { exact: true })
    .locator('../..')
  const deactivationPromise = admin.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname === `/api/v1/admin/renewal-plans/${planId}`,
    { timeout: 15_000 },
  )
  const deactivationClick = updatedPlanCard
    .getByRole('button', { name: 'Ngừng bán' })
    .click({ timeout: 10_000 })
  const confirmation = await admin.waitForEvent('dialog', { timeout: 10_000 })
  expect(confirmation.type()).toBe('confirm')
  await confirmation.accept()
  await deactivationClick
  const deactivationResponse = await deactivationPromise
  expect(deactivationResponse.status()).toBe(200)
  expect((await deactivationResponse.json()).data.status).toBe('INACTIVE')
  await expect(admin.getByText('Đã ngừng bán gói.')).toBeVisible()

  const student = await browser.newPage()
  const studentToken = await login(student, 'student-b.be05@example.test')
  const studentDetailResponse = await apiGet(request, `/admin/students/${ids.studentB}`, adminToken)
  expect(studentDetailResponse.status()).toBe(200)
  const studentDetail = (await studentDetailResponse.json()).data
  const enrollmentId = studentDetail.enrollments.find(
    (item: { courseId: string }) => item.courseId === ids.courseA,
  ).id as string
  const enrollmentBefore = await apiGet(request, `/admin/enrollments/${enrollmentId}`, adminToken)
  const originalExpiry = (await enrollmentBefore.json()).data.enrollment.expiresAt as string

  await admin.goto(`/admin/enrollments/${enrollmentId}`)
  await expect(admin.getByRole('heading', { name: /enrollment/ })).toBeVisible()
  await expect(admin.getByRole('button', { name: 'Gia hạn' })).toBeDisabled()
  await expect(admin.getByRole('button', { name: 'Thu hồi' })).toBeDisabled()
  await admin.getByLabel('Lý do bắt buộc').fill('BE-05 kiểm thử gia hạn thủ công.')
  admin.once('dialog', async (dialog) => {
    await dialog.accept()
  })
  await admin.getByRole('button', { name: 'Gia hạn' }).click()
  await expect(admin.getByText('Đã gia hạn quyền học.')).toBeVisible()
  const afterExtend = await apiGet(request, `/admin/enrollments/${enrollmentId}`, adminToken)
  expect(Date.parse((await afterExtend.json()).data.enrollment.expiresAt)).toBeGreaterThan(
    Date.parse(originalExpiry),
  )

  await admin.getByLabel('Lý do bắt buộc').fill('BE-05 kiểm thử thu hồi quyền học.')
  admin.once('dialog', async (dialog) => {
    await dialog.accept()
  })
  await admin.getByRole('button', { name: 'Thu hồi' }).click()
  await expect(admin.getByText('Đã thu hồi quyền học.')).toBeVisible()
  const deniedAfterRevoke = await apiGet(request, `/learn/lessons/${ids.lesson}`, studentToken)
  expect(deniedAfterRevoke.status()).toBe(404)
  await expect(admin.getByText('REVOKED', { exact: true })).toBeVisible()

  await admin.getByLabel('Lý do bắt buộc').fill('BE-05 kiểm thử khôi phục quyền học.')
  admin.once('dialog', async (dialog) => {
    await dialog.accept()
  })
  await admin.getByRole('button', { name: 'Khôi phục' }).click()
  await expect(admin.getByText('Đã khôi phục quyền học.')).toBeVisible()
  const restoredAccess = await apiGet(request, `/learn/lessons/${ids.lesson}`, studentToken)
  expect(restoredAccess.status()).toBe(200)
  await expect(admin.getByText('RENEW', { exact: true })).toBeVisible()
  await expect(admin.getByText('REVOKE', { exact: true })).toBeVisible()
  await expect(admin.getByText('RESTORE', { exact: true })).toBeVisible()

  await admin.goto('/admin/settings')
  await expect(admin.getByLabel('Tên website')).toBeVisible()
  await admin.getByLabel('Tên website').fill('PAniverseDeutsch BE-05 settings')
  const settingsPatchPromise = admin.waitForRequest(
    (requestEvent) =>
      requestEvent.method() === 'PATCH' &&
      new URL(requestEvent.url()).pathname === '/api/v1/admin/site-settings',
  )
  await admin.getByRole('button', { name: 'Lưu nội dung website' }).click()
  const settingsPatch = await settingsPatchPromise
  const settingsBody = JSON.parse(settingsPatch.postData() ?? '{}')
  expect(settingsBody).not.toHaveProperty('payment')
  await expect(admin.getByText('Đã lưu nội dung website.')).toBeVisible()
  const savedSettings = await apiGet(request, '/admin/site-settings', adminToken)
  expect((await savedSettings.json()).data.payment.bankName).toBe('BANK E2E · TEST ONLY')
  await Promise.all([admin.context().close(), student.close()])
})

test('Admin creates and publishes a valid CMS tree; learner completion keeps its quiz-attempt snapshot', async ({
  page,
  browser,
  request,
}) => {
  const adminToken = await login(page, 'admin.be04@example.test')
  await page.goto('/admin/courses')
  await page.getByLabel('Mã khóa học').fill('BE05-CMS-A1')
  await page.getByLabel('Slug').fill('be05-cms-a1')
  await page.getByLabel('Tên khóa học').fill('Khóa CMS tổng hợp BE-05')
  await page.getByLabel('Cấp độ').fill('A1')
  await page.getByLabel('Học phí (VND nguyên)').fill('1200000')
  await page.getByLabel('Thời hạn truy cập (tháng)').fill('12')
  await page.getByLabel('Mô tả ngắn').fill('Course created by the actual Admin CMS form.')
  await page
    .getByLabel('Mô tả', { exact: true })
    .fill('Nội dung tổng hợp dùng cho kiểm thử E2E BE-05.')
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f]{24}$/)
  const courseId = new URL(page.url()).pathname.split('/').at(-1)!
  const draftPublic = await request.get(`${apiBase}/courses/be05-cms-a1`)
  expect(draftPublic.status()).toBe(404)

  await page.getByLabel('Tên khóa học').fill('Khóa CMS BE-05 đã chỉnh sửa')
  await page.getByRole('button', { name: 'Lưu khóa học' }).click()
  await expect(page.getByText('Đã lưu thông tin khóa học.')).toBeVisible()
  await page.getByLabel('Tên chương').fill('Chương BE-05')
  await page.getByRole('button', { name: 'Thêm chương' }).click()
  const sectionLink = page.getByRole('link', { name: /Chương BE-05/ })
  await expect(sectionLink).toBeVisible()
  await sectionLink.click()
  const sectionId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.getByLabel('Trạng thái').selectOption('PUBLISHED')
  await page.getByRole('button', { name: 'Lưu chương' }).click()
  await expect(page.getByText('Đã lưu chương.', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Tên bài học').fill('Bài học đầu tiên BE-05')
  await page.getByRole('button', { name: 'Thêm bài học' }).click()
  const lessonLink = page.getByRole('link', { name: 'Bài học đầu tiên BE-05' })
  await expect(lessonLink).toBeVisible()
  await lessonLink.click()
  const lessonId = new URL(page.url()).pathname.split('/').at(-1)!
  await page
    .getByLabel('Nội dung bài học (văn bản thuần)')
    .fill('Hallo zusammen.\n\nWie geht es dir?')
  await page.getByLabel('Trạng thái').selectOption('PUBLISHED')
  await page.getByRole('button', { name: 'Lưu bài học' }).click()
  await expect(page.getByText('Đã lưu bài học.', { exact: true }).first()).toBeVisible()

  await page.getByLabel('Tên bài tập').fill('Tệp bài tập BE-05')
  await page.getByLabel('Hướng dẫn bài tập').fill('Hoàn thành tệp tổng hợp theo hướng dẫn.')
  await page.getByRole('button', { name: 'Thêm bài' }).click()
  const fileExerciseLink = page.getByRole('link', { name: 'Chỉnh sửa' }).first()
  await expect(fileExerciseLink).toBeVisible()
  const fileExerciseHref = await fileExerciseLink.getAttribute('href')
  const fileExerciseId = fileExerciseHref?.split('/').at(-1) ?? ''
  expect(fileExerciseId).toMatch(/^[0-9a-f]{24}$/)
  await fileExerciseLink.click()
  await page.getByLabel('Hướng dẫn').fill('Hoàn thành tệp tổng hợp theo hướng dẫn.')
  await page.getByLabel('Trạng thái').selectOption('PUBLISHED')
  await page.getByRole('button', { name: 'Lưu bài tập' }).click()
  await expect(page.getByText('Đã lưu bài tập.')).toBeVisible()
  await page.goto(`/admin/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`)

  await page.locator('form').last().getByRole('combobox').selectOption('QUIZ')
  await page.getByLabel('Tên bài tập').fill('Quiz bắt buộc BE-05')
  await page.getByLabel('Hướng dẫn bài tập').fill('Chọn đáp án phù hợp với ngữ cảnh.')
  await page.getByRole('button', { name: 'Thêm bài' }).click()
  await expect(page).toHaveURL(
    new RegExp(
      `/admin/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/exercises/[0-9a-f]{24}$`,
    ),
  )
  const quizExerciseId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.getByLabel('Tên Quiz').fill('Quiz giao tiếp BE-05')
  await page.getByLabel('Ngưỡng đạt (%) · để trống nếu không có').fill('80')
  const questionEditor = page.getByLabel('Câu hỏi và lựa chọn (JSON theo schema Quiz)')
  await questionEditor.fill('[]')
  await page.getByRole('button', { name: 'Lưu Quiz' }).click()
  await expect(page.getByRole('alert').getByText(/Cần ít nhất một câu hỏi/)).toBeVisible()
  await questionEditor.fill(
    JSON.stringify(
      [
        {
          questionText: 'Cách nói tạm biệt là gì?',
          questionType: 'SINGLE_CHOICE',
          explanation: 'Auf Wiedersehen là lời tạm biệt.',
          points: '1',
          sortOrder: 1,
          options: [
            { optionText: 'Guten Tag', isCorrect: false, sortOrder: 1 },
            { optionText: 'Auf Wiedersehen', isCorrect: true, sortOrder: 2 },
          ],
        },
      ],
      null,
      2,
    ),
  )
  await page.getByRole('button', { name: 'Lưu Quiz' }).click()
  await expect(page.getByText('Đã lưu cấu hình Quiz.')).toBeVisible()
  await page.getByLabel('Hướng dẫn').fill('Chọn đáp án phù hợp với ngữ cảnh.')
  await page.getByLabel('Trạng thái').selectOption('PUBLISHED')
  await page.getByRole('button', { name: 'Lưu bài tập' }).click()
  await expect(page.getByText('Đã lưu bài tập.')).toBeVisible()
  await page.goto(`/admin/courses/${courseId}`)
  await page.getByRole('button', { name: 'Xuất bản khóa học' }).click()
  await expect(page.getByText('Khóa học đã được xuất bản.')).toBeVisible()
  const publishedPublic = await request.get(`${apiBase}/courses/be05-cms-a1`)
  expect(publishedPublic.status()).toBe(200)
  expect((await publishedPublic.json()).data.title).toBe('Khóa CMS BE-05 đã chỉnh sửa')

  await page.goto('/admin/enrollments')
  await page.getByLabel('Student User ID').fill(ids.studentB)
  const grantCourse = page.getByLabel('Khóa học')
  await expect(grantCourse).toContainText('BE05-CMS-A1')
  const grantCourseValue = await grantCourse.locator('option').evaluateAll((options) => {
    const match = options.find((option) => option.textContent?.includes('BE05-CMS-A1'))
    return match instanceof HTMLOptionElement ? match.value : ''
  })
  expect(grantCourseValue).not.toBe('')
  await grantCourse.selectOption(grantCourseValue)
  await page.getByLabel('Lý do bắt buộc').fill('Cấp quyền học cho kiểm thử tổng hợp BE-05.')
  await page.getByRole('button', { name: 'Cấp enrollment' }).click()
  await expect(page).toHaveURL(/\/admin\/enrollments\/[0-9a-f]{24}$/)
  const grantedEnrollmentId = new URL(page.url()).pathname.split('/').at(-1)!

  const learner = await browser.newPage()
  const learnerToken = await login(learner, 'student-b.be05@example.test')
  await learner.goto(`/learn/exercises/${quizExerciseId}`)
  await expect(learner.getByRole('heading', { name: 'Quiz bắt buộc BE-05' })).toBeVisible()
  const quizRoute = `/admin/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/exercises/${quizExerciseId}`
  await learner.goto(`/learn/lessons/${lessonId}`)
  await expect(learner.getByRole('heading', { name: 'Bài học đầu tiên BE-05' })).toBeVisible()
  await learner.goto(`/learn/exercises/${fileExerciseId}`)
  await learner.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click()
  await expect(learner.getByText('Bài tập đã hoàn thành')).toBeVisible()
  await learner.goto(`/learn/exercises/${quizExerciseId}`)
  await learner.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await learner.getByRole('radio').first().check()
  await learner.getByRole('button', { name: 'Nộp bài' }).click()
  await learner.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(learner).toHaveURL(/\/learn\/quizzes\/[^/]+\/result(?:\?|$)/)
  const attemptId = new URL(learner.url()).pathname.split('/')[3]!
  await expect(learner.getByText('0 / 1 câu đúng')).toBeVisible()
  const completedQuiz = await apiGet(request, `/learn/exercises/${quizExerciseId}`, learnerToken)
  expect((await completedQuiz.json()).data.progress.status).toBe('COMPLETED')
  await learner.goto(`/learn/lessons/${lessonId}`)
  const completeLessonButton = learner.getByRole('button', { name: 'Hoàn thành bài học' })
  await expect(completeLessonButton).toBeEnabled()
  await completeLessonButton.click()
  await expect(learner.getByRole('button', { name: 'Đã hoàn thành' })).toBeVisible()

  await page.goto(quizRoute)
  const quizJson = page.getByLabel('Câu hỏi và lựa chọn (JSON theo schema Quiz)')
  await expect(quizJson).toHaveValue(/Cách nói tạm biệt là gì\?/)
  const editedQuestions = JSON.parse(await quizJson.inputValue()) as Array<{
    options: Array<{ isCorrect: boolean }>
  }>
  editedQuestions[0]!.options[0]!.isCorrect = true
  editedQuestions[0]!.options[1]!.isCorrect = false
  await quizJson.fill(JSON.stringify(editedQuestions, null, 2))
  await page.getByRole('button', { name: 'Lưu Quiz' }).click()
  await expect(page.getByText('Đã lưu cấu hình Quiz.')).toBeVisible()
  await learner.goto(`/learn/quizzes/${attemptId}/result`)
  await expect(learner.getByText('0 / 1 câu đúng')).toBeVisible()
  await expect(learner.getByText('Đáp án được hệ thống trả về: Auf Wiedersehen')).toBeVisible()
  await expect(learner.getByText('Bạn đã chọn: Guten Tag')).toBeVisible()

  await page.goto(`/admin/courses/${courseId}`)
  page.once('dialog', async (dialog) => {
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Xóa mềm' }).click()
  await expect(page).toHaveURL('/admin/courses')
  const deletedPublicCourse = await request.get(`${apiBase}/courses/be05-cms-a1`)
  expect(deletedPublicCourse.status()).toBe(404)
  const retainedEnrollment = await apiGet(
    request,
    `/admin/enrollments/${grantedEnrollmentId}`,
    adminToken,
  )
  expect(retainedEnrollment.status()).toBe(200)
  expect((await retainedEnrollment.json()).data.enrollment.id).toBe(grantedEnrollmentId)
  await learner.close()
})

test('representative public, student and Admin routes stay usable at desktop, tablet and mobile widths', async ({
  page,
  browser,
}) => {
  const findings: Array<{ route: string; viewport: string; violations: string[] }> = []
  const ruleCounts = new Map<
    string,
    { impact: string; rule: string; occurrences: number; nodes: number }
  >()
  const scan = async (target: Page, route: string, viewport: string) => {
    console.log(`BE-05 axe scan ${findings.length + 1}/37: ${route} (${viewport})`)
    const result = await new AxeBuilder({ page: target })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    for (const violation of result.violations) {
      const impact = violation.impact ?? 'unknown'
      const key = `${impact} ${violation.id}`
      const current = ruleCounts.get(key) ?? {
        impact,
        rule: violation.id,
        occurrences: 0,
        nodes: 0,
      }
      current.occurrences += 1
      current.nodes += violation.nodes.length
      ruleCounts.set(key, current)
    }
    const violations = result.violations.map(
      (violation) =>
        `${violation.impact ?? 'unknown'} ${violation.id}: ${violation.nodes.length} node(s)`,
    )
    findings.push({ route, viewport, violations })
    const severe = result.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    )
    expect(severe, `${route} ${viewport}: ${JSON.stringify(violations)}`).toEqual([])
  }

  for (const [width, height, name] of [
    [1280, 800, 'desktop'],
    [768, 1024, 'tablet'],
    [390, 844, 'mobile'],
  ] as const) {
    await page.setViewportSize({ width, height })
    for (const route of ['/', '/register', '/login', '/courses', '/courses/be04-e2e-a1']) {
      await page.goto(route)
      await scan(page, route, name)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      if (name !== 'desktop')
        expect(overflow, `horizontal overflow at ${route} ${name}`).toBe(false)
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await login(page, 'student-b.be05@example.test')
  const learnerRoutes = [
    '/student',
    '/student/courses',
    '/student/orders',
    '/student/profile',
    `/learn/lessons/${ids.lesson}`,
    `/learn/exercises/${ids.fileExercise}`,
    `/checkout/${ids.courseB}`,
  ]
  for (const route of learnerRoutes) {
    await page.goto(route)
    await scan(page, route, 'desktop')
  }
  await page.setViewportSize({ width: 768, height: 1024 })
  for (const route of ['/student', '/student/orders', `/learn/lessons/${ids.lesson}`]) {
    await page.goto(route)
    await scan(page, route, 'tablet')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/student', '/student/orders', `/learn/lessons/${ids.lesson}`]) {
    await page.goto(route)
    await scan(page, route, 'mobile')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }

  const admin = await adminPage(browser)
  await admin.setViewportSize({ width: 1280, height: 800 })
  for (const route of [
    '/admin',
    '/admin/courses',
    '/admin/students',
    '/admin/enrollments',
    '/admin/orders',
    '/admin/media',
    '/admin/audit-logs',
  ]) {
    await admin.goto(route)
    await scan(admin, route, 'desktop')
  }
  await admin.setViewportSize({ width: 768, height: 1024 })
  await admin.goto('/admin/courses')
  await scan(admin, '/admin/courses', 'tablet')
  await admin.setViewportSize({ width: 390, height: 844 })
  await admin.goto('/admin/courses')
  await scan(admin, '/admin/courses', 'mobile')
  const mobileAdminWidth = await admin.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    overflowingElements: [...document.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: String(element.className).slice(0, 120),
          right: Math.round(rect.right),
          text: element.innerText?.trim().slice(0, 80) ?? '',
        }
      })
      .filter((element) => element.right > window.innerWidth + 1)
      .slice(0, 10),
  }))
  expect(
    mobileAdminWidth.document,
    `mobile Admin overflow: ${JSON.stringify(mobileAdminWidth.overflowingElements)}`,
  ).toBeLessThanOrEqual(mobileAdminWidth.viewport)

  await test.info().attach('axe-be05-findings.json', {
    body: JSON.stringify(findings, null, 2),
    contentType: 'application/json',
  })
  console.log(
    `BE-05 axe ${findings.length} route/viewport scans: ${JSON.stringify([...ruleCounts.values()])}`,
  )
  await admin.context().close()
})

test('API outage and unavailable media show honest error states instead of demo success', async ({
  page,
}) => {
  await page.route('**/api/v1/courses?page=*', (route) => route.abort('failed'))
  await page.goto('/courses')
  await expect(page.getByRole('alert').getByText('Không tải được danh mục khóa học')).toBeVisible()
  await page.unrouteAll()
  await login(page, 'student-b.be05@example.test')
  await page.goto(`/learn/exercises/${ids.fileExercise}`)
  await expect(
    page.getByText(
      'Kho lưu trữ media chưa được cấu hình. Nội dung chữ và bài quiz vẫn sử dụng được.',
    ),
  ).toBeVisible()
})
