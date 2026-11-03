import { useState } from 'react'
import { brandConfig } from '@/config/brand'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  ChevronRight,
  CircleHelp,
  Info,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AspectRatioMedia,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Container,
  ContentSection,
  DropdownMenu,
  EmailInput,
  EmptyState,
  ErrorState,
  FormErrorSummary,
  FormField,
  FormLabel,
  IconButton,
  InlineAlert,
  LearningPath,
  LearningPathStep,
  LinkButton,
  LoadingSpinner,
  NotificationExamples,
  Pagination,
  PasswordInput,
  Progress,
  RadioGroup,
  ResponsiveGrid,
  RHFTextInput,
  SearchInput,
  SectionHeader,
  SelectField,
  Separator,
  Skeleton,
  Stack,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TextInput,
  Tooltip,
  Popover,
  VisuallyHidden,
} from '@/shared/ui'
import { DialogExamples } from '@/shared/ui/dialogs'
import { useNotifications } from '@/shared/ui/notifications'
import { LayoutPreviewIntro } from '@/shared/layouts/shells'

const sampleSchema = z.object({
  displayName: z.string().trim().min(2, 'Tên cần có ít nhất 2 ký tự.'),
  email: z.string().trim().email('Vui lòng nhập email hợp lệ.'),
})
type SampleValues = z.infer<typeof sampleSchema>

function FormShowcase() {
  const [selection, setSelection] = useState('a1')
  const [checked, setChecked] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [query, setQuery] = useState('')
  const form = useForm<SampleValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: { displayName: '', email: '' },
  })
  const validationErrors = Object.values(form.formState.errors)
    .map((error) => error.message)
    .filter((message): message is string => typeof message === 'string')
  const notifications = useNotifications()

  const submit = form.handleSubmit(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    notifications.success(
      'Biểu mẫu hợp lệ',
      'Đây là trạng thái mẫu; không có dữ liệu nào được gửi đi.',
    )
  })

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="grid content-start gap-5" onSubmit={submit} noValidate>
        <FormErrorSummary errors={validationErrors} />
        <RHFTextInput
          control={form.control}
          name="displayName"
          label="Tên hiển thị"
          placeholder="Ví dụ: Anna"
          required
          autoComplete="name"
        />
        <RHFTextInput
          control={form.control}
          name="email"
          label="Địa chỉ email"
          type="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
        />
        <div className="grid gap-2">
          <FormLabel htmlFor="sample-password">Mật khẩu</FormLabel>
          <PasswordInput
            id="sample-password"
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
          />
        </div>
        <FormField
          id="sample-textarea"
          label="Ghi chú"
          description="Mô tả trường nhiều dòng."
          optional
        >
          {(describedBy, invalid) => (
            <Textarea
              id="sample-textarea"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              placeholder="Nhập nội dung mẫu…"
            />
          )}
        </FormField>
        <SelectField
          id="sample-select"
          label="Lựa chọn mẫu"
          value={selection}
          onValueChange={setSelection}
          options={[
            { value: 'a1', label: 'A1.1' },
            { value: 'a2', label: 'A1.2' },
            { value: 'disabled', label: 'Không khả dụng', disabled: true },
          ]}
        />
        <Checkbox
          id="sample-consent"
          label="Hộp chọn mẫu"
          description="Trạng thái có thể đổi bằng bàn phím."
          checked={checked}
          onCheckedChange={setChecked}
        />
        <RadioGroup
          id="sample-radio"
          label="Nhóm tùy chọn"
          value={selection}
          onValueChange={setSelection}
          options={[
            { value: 'a1', label: 'Tùy chọn thứ nhất' },
            { value: 'a2', label: 'Tùy chọn thứ hai' },
          ]}
          orientation="horizontal"
        />
        <Switch
          id="sample-switch"
          label="Công tắc mẫu"
          description="Kiểm tra nhãn và trạng thái bật/tắt."
          checked={subscribed}
          onCheckedChange={setSubscribed}
        />
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          startIcon={<Check aria-hidden="true" />}
        >
          Kiểm tra biểu mẫu
        </Button>
        <p className="text-sm text-ink-muted">
          Dữ liệu chỉ được xác thực trong trình duyệt để trình diễn trạng thái giao diện.
        </p>
      </form>
      <div className="grid content-start gap-5">
        <div className="grid gap-2">
          <FormLabel htmlFor="sample-text">Trường văn bản cơ bản</FormLabel>
          <TextInput
            id="sample-text"
            placeholder="Nhập văn bản"
            leadingIcon={<Search aria-hidden="true" className="size-4" />}
          />
        </div>
        <div className="grid gap-2">
          <FormLabel htmlFor="sample-email">Email cơ bản</FormLabel>
          <EmailInput id="sample-email" placeholder="name@example.com" />
        </div>
        <div className="grid gap-2">
          <FormLabel>Tìm kiếm có thể xóa</FormLabel>
          <SearchInput
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            placeholder="Tìm kiếm trong ví dụ"
          />
        </div>
        <FormField
          id="invalid-sample"
          label="Trạng thái không hợp lệ"
          error="Thông báo lỗi liên kết với trường nhập."
        >
          {(describedBy, invalid) => (
            <TextInput
              id="invalid-sample"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              defaultValue="Nội dung mẫu"
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled>
            Đã vô hiệu hóa
          </Button>
          <Button variant="outline" loading>
            Đang xử lý
          </Button>
        </div>
        <InlineAlert tone="info" title="Thông tin trường">
          Thông báo hỗ trợ hiển thị ngay trong ngữ cảnh.
        </InlineAlert>
      </div>
    </div>
  )
}

function ColorSwatch({
  name,
  value,
  className,
  inverse = false,
}: {
  name: string
  value: string
  className: string
  inverse?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card-surface">
      <div className={`h-20 ${className}`} />
      <div className="p-3">
        <p className="font-semibold">{name}</p>
        <p className={`font-mono text-sm ${inverse ? 'text-white' : 'text-ink-muted'}`}>{value}</p>
      </div>
    </div>
  )
}

function ShowcaseSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <ContentSection id={id} className="scroll-mt-28">
      <SectionHeader title={title} description={description} />
      <div className="mt-6">{children}</div>
    </ContentSection>
  )
}

function SectionNav() {
  const items = [
    ['colors', 'Màu sắc'],
    ['type', 'Chữ'],
    ['actions', 'Hành động'],
    ['forms', 'Biểu mẫu'],
    ['states', 'Trạng thái'],
    ['dialogs', 'Hộp thoại'],
    ['display', 'Hiển thị'],
    ['navigation', 'Điều hướng'],
    ['path', 'Lộ trình'],
    ['layouts', 'Bố cục'],
    ['utilities', 'Tiện ích'],
    ['accessibility', 'A11y'],
    ['extras', 'Bổ sung'],
    ['reference', 'Tài liệu'],
  ] as const
  return (
    <nav
      aria-label="Mục trong UI kit"
      className="sticky top-0 z-header border-y border-border-subtle bg-card-surface/95 backdrop-blur-sm"
    >
      <Container className="flex gap-1 overflow-x-auto py-2">
        {items.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
          >
            {label}
          </a>
        ))}
      </Container>
    </nav>
  )
}

export function UiKitPage() {
  const [tab, setTab] = useState('lesson')
  const [page, setPage] = useState(1)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const notifications = useNotifications()

  return (
    <div className="min-h-screen bg-page-surface">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-control bg-card-surface px-4 py-3 font-semibold text-ink-primary shadow-raised focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Bỏ qua điều hướng
      </a>
      <header>
        <div className="border-b border-border-subtle bg-surface-blue px-4 py-2 text-center text-xs font-semibold text-pastel-blue-ink">
          PHASE 1A · UI FOUNDATION · NỘI DUNG TRÌNH DIỄN
        </div>
        <div className="border-b border-border-subtle bg-card-surface">
          <Container className="flex min-h-[4.5rem] items-center justify-between gap-4">
            <a href="/__dev/ui-kit" className="inline-flex items-center gap-3 rounded-lg">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-blue text-pastel-blue-ink">
                <BookOpenText aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-display text-sm font-extrabold">
                  Deutsch · UI foundation
                </span>
                <span className="block text-xs text-ink-secondary">Component showcase</span>
              </span>
            </a>
            <div className="hidden items-center gap-2 sm:flex">
              <Badge tone="success">Dev only</Badge>
              <LinkButton
                to="/__dev/layouts/public"
                variant="outline"
                size="sm"
                endIcon={<ArrowRight aria-hidden="true" />}
              >
                Xem layouts
              </LinkButton>
              <LinkButton
                to="/__dev/lms-kit"
                variant="primary"
                size="sm"
                endIcon={<ArrowRight aria-hidden="true" />}
              >
                LMS domain kit
              </LinkButton>
            </div>
            <div className="sm:hidden">
              <IconButton
                label="Thông báo mẫu"
                icon={<Bell aria-hidden="true" />}
                variant="ghost"
                onClick={() =>
                  notifications.info('Thông báo mẫu', 'Global notification layer đang hoạt động.')
                }
              />
            </div>
          </Container>
        </div>
        <section className="relative overflow-hidden border-b border-border-subtle bg-card-surface">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-36 size-[25rem] rounded-full bg-brand-blue/50 blur-3xl"
          />
          <Container className="relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">Foundation</Badge>
                <Badge tone="neutral">Build · components · layouts</Badge>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Hệ thống giao diện, sẵn sàng mở rộng.
              </h1>
              <p className="max-w-2xl text-lg leading-7 text-ink-secondary">
                Tập trung token, thành phần dùng lại, trạng thái tương tác và năm khung bố cục. Mọi
                nội dung ở đây chỉ để xem trước UI.
              </p>
            </div>
            <Card className="border-0 bg-surface-lime p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-card-surface text-action-primary">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{brandConfig.name} · A1.1</p>
                  <p className="text-sm text-ink-secondary">Dấu hiệu nhận diện giao diện</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">
                Một đường học với các nút bài học nhỏ tạo nhịp thị giác xuyên suốt trải nghiệm.
              </p>
            </Card>
          </Container>
        </section>
      </header>
      <SectionNav />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Container className="space-y-14 py-12 sm:space-y-16 sm:py-16">
          <ShowcaseSection
            id="colors"
            title="01 · Màu sắc"
            description="Màu nhận diện giữ nguyên mã; màu pastel chỉ dùng làm bề mặt, màu hành động dành cho CTA và tương tác."
          >
            <ResponsiveGrid minItemWidth="9rem" gap="md">
              <ColorSwatch name="Pastel blue" value="#C2E8F5" className="bg-brand-blue" />
              <ColorSwatch name="Lime" value="#D1F685" className="bg-brand-lime" />
              <ColorSwatch name="Ink" value="#203039" className="bg-ink-primary" inverse />
              <ColorSwatch name="Ink phụ" value="#4A5B63" className="bg-ink-secondary" inverse />
              <ColorSwatch name="CTA teal" value="#006B70" className="bg-action-primary" inverse />
              <ColorSwatch
                name="Teal hover"
                value="#0B5960"
                className="bg-action-primary-hover"
                inverse
              />
              <ColorSwatch name="Page" value="#F6FBFC" className="bg-page-surface" />
              <ColorSwatch name="Card" value="#FFFFFF" className="bg-card-surface" />
            </ResponsiveGrid>
          </ShowcaseSection>

          <ShowcaseSection
            id="type"
            title="02 · Typography"
            description="Manrope cho tiêu đề và Source Sans 3 cho nội dung; cả hai font được self-host qua package fontsource."
          >
            <Card className="grid gap-5 p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                  Manrope · Display
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Lernen macht Freude.
                </h2>
                <p className="mt-2 text-ink-secondary">
                  Học tập có nhịp điệu, tiêu đề có độ tương phản rõ ràng.
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                  Source Sans 3 · Body
                </p>
                <p className="mt-2 max-w-3xl text-lg leading-8">
                  Guten Morgen! Wie geht es dir? Câu chữ cần dễ đọc trên màn hình rộng, máy tính
                  bảng và điện thoại.
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  12px · 14px · 16px · 18px · 24px · 32px · 48px
                </p>
              </div>
            </Card>
          </ShowcaseSection>

          <ShowcaseSection
            id="actions"
            title="03 · Hành động"
            description="Nút, liên kết, icon action, tooltip và popover với trạng thái bàn phím, hover, disabled và loading."
          >
            <Stack gap="md">
              <div className="flex flex-wrap gap-3">
                <Button startIcon={<Check aria-hidden="true" />}>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline" loading>
                  Loading
                </Button>
                <Button variant="outline" disabled>
                  Disabled
                </Button>
                <IconButton
                  label="Cần trợ giúp"
                  icon={<CircleHelp aria-hidden="true" />}
                  variant="outline"
                />
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <LinkButton
                  to="/__dev/layouts/public"
                  variant="link"
                  endIcon={<ChevronRight aria-hidden="true" />}
                >
                  Link button
                </LinkButton>
                <Tooltip content="Mô tả bổ sung cho biểu tượng">
                  <IconButton
                    label="Thông tin bổ sung"
                    icon={<Info aria-hidden="true" />}
                    variant="ghost"
                  />
                </Tooltip>
                <Popover
                  open={popoverOpen}
                  onOpenChange={setPopoverOpen}
                  trigger={<Button variant="outline">Mở popover</Button>}
                  title="Popover mẫu"
                >
                  <p className="max-w-56 text-sm leading-5 text-ink-secondary">
                    Nội dung ngắn, có thể đóng bằng Escape hoặc click bên ngoài.
                  </p>
                </Popover>
              </div>
            </Stack>
          </ShowcaseSection>

          <ShowcaseSection
            id="forms"
            title="04 · Biểu mẫu"
            description="Input có nhãn, mô tả, lỗi, trạng thái; tích hợp React Hook Form và Zod để kiểm tra phản hồi thực tế."
          >
            <FormShowcase />
          </ShowcaseSection>

          <ShowcaseSection
            id="states"
            title="05 · Trạng thái và phản hồi"
            description="Loading, empty, error, inline alert, skeleton và thông báo toàn cục."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <InlineAlert tone="success" title="Hoàn tất">
                  Nội dung mẫu được xác nhận.
                </InlineAlert>
                <InlineAlert tone="warning" title="Cần chú ý">
                  Kiểm tra thông tin trước khi tiếp tục.
                </InlineAlert>
                <InlineAlert tone="danger" title="Có lỗi">
                  Không thể hoàn tất thao tác mẫu.
                </InlineAlert>
                <InlineAlert tone="info" title="Thông tin">
                  Một lời giải thích ngắn hỗ trợ bước kế tiếp.
                </InlineAlert>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status="success" label="Đã hoàn tất" />
                  <StatusBadge status="warning" label="Chờ xử lý" />
                  <StatusBadge status="danger" label="Có lỗi" />
                  <StatusBadge status="neutral" label="Bản nháp" />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-card-surface p-4">
                  <LoadingSpinner label="Đang tải nội dung mẫu" />
                  <span className="text-sm text-ink-secondary">Đang tải nội dung mẫu</span>
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <EmptyState
                  title="Chưa có nội dung"
                  description="Trạng thái trống với lời giải thích và hành động rõ ràng."
                  icon={<BookOpenText aria-hidden="true" />}
                  action={
                    <Button
                      variant="outline"
                      onClick={() => notifications.info('Trạng thái trống', 'Hành động minh họa.')}
                    >
                      Thử thao tác
                    </Button>
                  }
                />
                <ErrorState
                  title="Không tải được mẫu"
                  description="Trạng thái lỗi có thể đưa ra cách khôi phục."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => notifications.error('Lỗi minh họa', 'Không gửi yêu cầu mạng.')}
                    >
                      Thử lại
                    </Button>
                  }
                />
              </div>
            </div>
            <Separator className="my-6" />
            <NotificationExamples />
          </ShowcaseSection>

          <ShowcaseSection
            id="dialogs"
            title="06 · Dialog và sheet"
            description="Dialog thông tin, xác nhận thao tác, hộp lỗi và sheet điều hướng dùng primitive có quản lý focus."
          >
            <DialogExamples />
          </ShowcaseSection>

          <ShowcaseSection
            id="display"
            title="07 · Hiển thị nội dung"
            description="Card, avatar, badge, progress, separator, khung media và vùng tỷ lệ co giãn."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>Thẻ nội dung mẫu</CardTitle>
                    <Avatar>
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                  </div>
                  <CardDescription>Mô tả ngắn hỗ trợ nội dung chính.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="info">A1.1</Badge>
                    <Badge tone="success">Đang học</Badge>
                    <Badge tone="neutral">Mẫu</Badge>
                  </div>
                  <Progress value={62} label="Tiến độ hiển thị" />
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">
                    Xem chi tiết
                  </Button>
                </CardFooter>
              </Card>
              <Card className="p-5">
                <h3 className="font-display text-lg font-bold">Khung media 16:9</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Tỉ lệ ổn định theo chiều rộng vùng chứa.
                </p>
                <AspectRatioMedia
                  className="mt-4 border border-dashed border-border-strong bg-surface-muted"
                  ratio={16 / 9}
                >
                  <div
                    className="grid size-full place-items-center text-sm text-ink-secondary"
                    role="img"
                    aria-label="Khung media trống dùng cho ví dụ"
                  >
                    Tỉ lệ media ổn định
                  </div>
                </AspectRatioMedia>
              </Card>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="navigation"
            title="08 · Điều hướng"
            description="Breadcrumb, tab, pagination, dropdown menu và nhóm accordion dùng được bằng bàn phím."
          >
            <div className="grid gap-7 lg:grid-cols-2">
              <div className="space-y-5">
                <Breadcrumbs
                  items={[
                    { label: 'Khóa học', href: '/__dev/layouts/student' },
                    { label: 'A1.1', href: '/__dev/layouts/learning' },
                    { label: 'Bài học mẫu' },
                  ]}
                />
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList aria-label="Nội dung tab mẫu">
                    <TabsTrigger value="lesson">Bài học</TabsTrigger>
                    <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                    <TabsTrigger value="vocabulary">Từ vựng</TabsTrigger>
                  </TabsList>
                  <TabsContent value="lesson">
                    <Card className="p-4">
                      <h3 className="font-semibold">Bài học mẫu</h3>
                      <p className="mt-1 text-sm text-ink-secondary">
                        Nội dung tab được chuyển bằng phím mũi tên hoặc click.
                      </p>
                    </Card>
                  </TabsContent>
                  <TabsContent value="notes">
                    <Card className="p-4">
                      <h3 className="font-semibold">Ghi chú</h3>
                      <p className="mt-1 text-sm text-ink-secondary">Vùng ghi chú minh họa.</p>
                    </Card>
                  </TabsContent>
                  <TabsContent value="vocabulary">
                    <Card className="p-4">
                      <h3 className="font-semibold">Từ vựng</h3>
                      <p className="mt-1 text-sm text-ink-secondary">Vùng từ vựng minh họa.</p>
                    </Card>
                  </TabsContent>
                </Tabs>
                <div className="flex flex-wrap items-center gap-3">
                  <Pagination page={page} pages={4} onPageChange={setPage} />
                  <DropdownMenu
                    label="Tùy chọn"
                    items={[
                      {
                        label: 'Mở bố cục Public',
                        onSelect: () => {
                          window.location.href = '/__dev/layouts/public'
                        },
                      },
                      {
                        label: 'Thông tin',
                        onSelect: () => notifications.info('Menu', 'Mục menu đã được chọn.'),
                      },
                    ]}
                  />
                </div>
              </div>
              <Accordion
                type="single"
                collapsible
                className="rounded-card border border-border-subtle bg-card-surface px-4"
              >
                <AccordionItem value="first">
                  <AccordionTrigger>Accordion item thứ nhất</AccordionTrigger>
                  <AccordionContent>
                    Nội dung có thể mở, đóng và điều hướng bằng bàn phím.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="second">
                  <AccordionTrigger>Accordion item thứ hai</AccordionTrigger>
                  <AccordionContent>Accordion chỉ mở khi người dùng tương tác.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="path"
            title="09 · PAniverseDeutsch"
            description="Dấu hiệu học tập với đường dẫn thị giác và các nút bước học, tách khỏi quy tắc nghiệp vụ."
          >
            <Card className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.7fr)] sm:p-7">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-lime text-pastel-lime-ink">
                    <BookOpenText aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">{brandConfig.name} · A1.1</p>
                    <p className="text-sm text-ink-secondary">Lộ trình mẫu</p>
                  </div>
                </div>
                <LearningPath>
                  <LearningPathStep title="Hallo!" detail="Nhận diện lời chào" done />
                  <LearningPathStep title="Guten Tag!" detail="Ngữ cảnh hàng ngày" active />
                  <LearningPathStep title="Wie geht es dir?" detail="Hội thoại ngắn" />
                </LearningPath>
              </div>
              <div className="rounded-xl bg-surface-blue p-5">
                <p className="text-sm font-semibold text-ink-secondary">Lektion 02</p>
                <p className="mt-2 font-display text-2xl font-extrabold">Guten Tag!</p>
                <p className="mt-2 text-sm text-ink-secondary">
                  Một thẻ mẫu có thể liên kết với nội dung học thật ở giai đoạn sau.
                </p>
                <LinkButton
                  className="mt-5"
                  to="/__dev/layouts/learning"
                  variant="outline"
                  size="sm"
                  endIcon={<ArrowRight aria-hidden="true" />}
                >
                  Xem layout bài học
                </LinkButton>
              </div>
            </Card>
          </ShowcaseSection>

          <ShowcaseSection
            id="layouts"
            title="10 · Năm khung bố cục"
            description="Các route dev-only giúp kiểm tra public, auth, checkout, student và learning shell ở nhiều viewport."
          >
            <LayoutPreviewIntro
              title="Preview routes"
              detail="Cấu trúc tách biệt, chưa gắn dữ liệu hoặc nghiệp vụ"
            />
            <ResponsiveGrid minItemWidth="14rem" gap="md">
              {Object.entries({
                public: 'Trang công khai',
                auth: 'Xác thực',
                checkout: 'Thanh toán',
                student: 'Học viên',
                learning: 'Bài học',
              }).map(([route, label]) => (
                <LinkButton
                  key={route}
                  to={`/__dev/layouts/${route}`}
                  variant="outline"
                  className="justify-between"
                >
                  {label}
                  <ArrowRight aria-hidden="true" />
                </LinkButton>
              ))}
            </ResponsiveGrid>
          </ShowcaseSection>

          <ShowcaseSection
            id="utilities"
            title="11 · Tiện ích giao diện"
            description="Stack, responsive grid, empty and error regions, breadcrumbs and semantic helpers."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-lg font-bold">Responsive grid</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Tự điều chỉnh số cột dựa theo bề rộng màn hình.
                </p>
                <ResponsiveGrid minItemWidth="8rem" gap="sm" className="mt-4">
                  {['01', '02', '03', '04'].map((item) => (
                    <div
                      key={item}
                      className="grid h-16 place-items-center rounded-xl bg-surface-muted font-mono text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </ResponsiveGrid>
              </Card>
              <Card className="p-5">
                <h3 className="font-display text-lg font-bold">Stack</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Khoảng cách theo token, có thể truyền qua prop.
                </p>
                <Stack gap="sm" className="mt-4">
                  <div className="rounded-lg bg-surface-blue p-3 text-sm">Stack item</div>
                  <div className="rounded-lg bg-surface-lime p-3 text-sm">Stack item</div>
                  <div className="rounded-lg bg-surface-muted p-3 text-sm">Stack item</div>
                </Stack>
              </Card>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="accessibility"
            title="12 · Hỗ trợ tiếp cận"
            description="Nhãn trường rõ ràng, focus nhìn thấy, skip link, landmark, trạng thái hỗ trợ screen reader và chuyển động giảm."
          >
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <VisuallyHidden>Văn bản chỉ dành cho trình đọc màn hình.</VisuallyHidden>
              <p className="max-w-3xl text-sm leading-6 text-ink-secondary">
                Thử phím Tab để kiểm tra focus ring. Dùng Shift+Tab để đi ngược. Với reduced motion,
                hiệu ứng chuyển động được giảm theo thiết lập hệ thống.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  notifications.info('A11y hint', 'Thông báo được phát qua vùng live region.')
                }
              >
                Thử live region
              </Button>
            </Card>
          </ShowcaseSection>

          <ShowcaseSection
            id="extras"
            title="13 · Tiện ích bổ sung"
            description="Một số thành phần cơ bản thể hiện pattern mở rộng từ primitive có sẵn."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-lg font-bold">Thông báo ngắn</h3>
                <p className="mt-2 text-sm text-ink-secondary">
                  Có thể đặt cạnh nội dung hoặc trong toast.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  startIcon={<Bell aria-hidden="true" />}
                  onClick={() => notifications.info('Đã nhấn nút', 'Tương tác mẫu thành công.')}
                >
                  Hiển thị thông báo
                </Button>
              </Card>
              <Card className="p-5">
                <h3 className="font-display text-lg font-bold">Tiến độ có nhãn</h3>
                <p className="mt-2 text-sm text-ink-secondary">
                  Giá trị được công bố qua aria-valuenow.
                </p>
                <Progress value={76} label="Hoàn thành mẫu" className="mt-5" />
              </Card>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            id="reference"
            title="14 · Tài liệu thành phần"
            description="Component API, token map và kết quả kiểm tra được mô tả trong docs/ui-implementation."
          >
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Implementation notes</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Tài liệu sẽ phản ánh cấu trúc và kết quả kiểm tra thực tế của Phase 1A.
                </p>
              </div>
              <a
                href="/docs/ui-implementation/01-FOUNDATION-SUMMARY.md"
                className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-semibold text-action-primary hover:bg-surface-muted"
              >
                Mở thư mục docs <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </Card>
          </ShowcaseSection>
        </Container>
      </main>
      <footer className="border-t border-border-subtle bg-card-surface py-8">
        <Container className="flex flex-col gap-2 text-sm text-ink-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>Deutsch · UI foundation · Phase 1A</span>
          <span>Demo routes chỉ bật trong môi trường phát triển.</span>
        </Container>
      </footer>
    </div>
  )
}
