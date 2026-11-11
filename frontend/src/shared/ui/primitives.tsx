import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  createContext,
  useContext,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from './cn'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'

const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-hover',
        secondary: 'bg-brand-blue text-pastel-blue-ink hover:bg-[#b3deee] active:bg-[#a8d8e9]',
        outline:
          'border border-border-strong bg-card-surface text-ink-primary hover:bg-surface-muted',
        ghost: 'bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink-primary',
        destructive: 'bg-danger-foreground text-white hover:bg-[#991b12] active:bg-[#7f1911]',
        link: 'min-h-0 rounded-sm p-0 text-action-primary underline-offset-4 hover:text-action-primary-hover hover:underline',
      },
      size: {
        sm: 'min-h-9 px-3 text-sm',
        md: 'min-h-11 px-4 text-base',
        lg: 'min-h-12 px-5 text-base',
        icon: 'size-11 min-h-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonStyles>

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  loading?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  startIcon,
  endIcon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size }), className)}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        startIcon
      )}
      {children}
      {!loading && endIcon}
    </button>
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <Button {...props} size="icon" aria-label={label} className={className}>
      {icon}
    </Button>
  )
}

export interface LinkButtonProps extends Omit<LinkProps, 'className'>, ButtonVariantProps {
  className?: string
  startIcon?: ReactNode
  endIcon?: ReactNode
  children: ReactNode
}

export function LinkButton({
  className,
  variant,
  size,
  startIcon,
  endIcon,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link {...props} className={cn(buttonStyles({ variant, size }), className)}>
      {startIcon}
      {children}
      {endIcon}
    </Link>
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('rounded-card border border-border-subtle bg-card-surface', className)}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('space-y-1.5 p-5 sm:p-6', className)} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 {...props} className={cn('font-display text-lg font-semibold tracking-tight', className)} />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn('text-sm leading-6 text-ink-secondary', className)} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('flex items-center gap-3 px-5 pb-5 sm:px-6 sm:pb-6', className)}
    />
  )
}

const badgeStyles = cva(
  'inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-ink-secondary',
        brand: 'bg-brand-lime text-pastel-lime-ink',
        pink: 'bg-brand-pink text-pastel-pink-ink',
        preview: 'bg-brand-blue text-pastel-blue-ink',
        success: 'bg-success-surface text-success-foreground',
        warning: 'bg-warning-surface text-warning-foreground',
        danger: 'bg-danger-surface text-danger-foreground',
        info: 'bg-info-surface text-info-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>) {
  return <span {...props} className={cn(badgeStyles({ tone }), className)} />
}

export function Separator({
  className,
  decorative = true,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      {...props}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border-subtle',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  )
}

export function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      {...props}
      className={cn(
        'relative flex size-10 shrink-0 overflow-hidden rounded-full bg-surface-blue',
        className,
      )}
    />
  )
}

export function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      {...props}
      className={cn('aspect-square size-full object-cover', className)}
    />
  )
}

export function AvatarFallback({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      {...props}
      className={cn(
        'grid size-full place-items-center font-display text-sm font-bold text-pastel-blue-ink',
        className,
      )}
    />
  )
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-lg bg-ink-primary px-3 py-2 text-sm text-white shadow-raised"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-ink-primary" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export function Popover({
  trigger,
  children,
  align = 'start',
  open,
  onOpenChange,
  title,
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: ComponentProps<typeof PopoverPrimitive.Content>['align']
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  className?: string
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-50 w-72 rounded-xl border border-border-subtle bg-card-surface p-4 text-sm text-ink-primary shadow-raised outline-none',
            className,
          )}
        >
          {title && (
            <PopoverPrimitive.Title className="mb-2 font-semibold">{title}</PopoverPrimitive.Title>
          )}
          {children}
          <PopoverPrimitive.Arrow className="fill-card-surface" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export const Accordion = AccordionPrimitive.Root

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      {...props}
      className={cn('border-b border-border-subtle last:border-b-0', className)}
    />
  )
}

export function AccordionTrigger({
  className,
  children,
  headingLevel = 3,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger> & { headingLevel?: 2 | 3 | 4 | 5 | 6 }) {
  const HeadingTag = `h${headingLevel}` as `h${2 | 3 | 4 | 5 | 6}`
  return (
    <AccordionPrimitive.Header asChild>
      <HeadingTag className="flex">
        <AccordionPrimitive.Trigger
          {...props}
          className={cn(
            'group flex min-h-12 flex-1 items-center justify-between gap-4 py-3 text-left font-semibold text-ink-primary focus-visible:outline-offset-2',
            className,
          )}
        >
          {children}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-ink-secondary transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </AccordionPrimitive.Trigger>
      </HeadingTag>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      {...props}
      className={cn(
        'overflow-hidden pb-4 text-sm leading-6 text-ink-secondary data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        className,
      )}
    >
      {children}
    </AccordionPrimitive.Content>
  )
}

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-xl bg-surface-muted p-1',
        className,
      )}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      {...props}
      className={cn(
        'min-h-9 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-secondary transition-colors hover:text-ink-primary focus-visible:outline-offset-1 data-[state=active]:bg-card-surface data-[state=active]:text-ink-primary data-[state=active]:shadow-soft',
        className,
      )}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      {...props}
      className={cn('mt-4 focus-visible:outline-offset-2', className)}
    />
  )
}

export function Progress({
  value,
  label,
  className,
  indicatorClassName,
}: {
  value: number
  label: string
  className?: string
  indicatorClassName?: string
}) {
  const normalized = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink-primary">{label}</span>
        <span className="tabular-nums text-ink-secondary">{Math.round(normalized)}%</span>
      </div>
      <ProgressPrimitive.Root
        value={normalized}
        aria-label={`${label}: ${Math.round(normalized)}%`}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full rounded-full bg-action-primary transition-[width] duration-300 ease-out motion-reduce:transition-none',
            indicatorClassName,
          )}
          style={{ width: `${normalized}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export type BreadcrumbItem = { label: string; href?: string }

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Đường dẫn hiện tại" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink-secondary">
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
              )}
              {item.href && !current ? (
                <Link
                  className="truncate rounded-sm underline-offset-4 hover:underline"
                  to={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? 'page' : undefined}
                  className={cn('truncate', current && 'font-semibold text-ink-primary')}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Pagination({
  page,
  pages,
  onPageChange,
}: {
  page: number
  pages: number
  onPageChange: (page: number) => void
}) {
  const current = Math.max(1, Math.min(page, pages))
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        startIcon={<ChevronLeft aria-hidden="true" />}
      >
        Trang trước
      </Button>
      <span aria-current="page" className="text-sm tabular-nums text-ink-secondary">
        Trang {current} / {Math.max(1, pages)}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={current >= pages}
        onClick={() => onPageChange(current + 1)}
        endIcon={<ChevronRight aria-hidden="true" />}
      >
        Trang sau
      </Button>
    </nav>
  )
}

export type MenuAction = {
  label: string
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

export function DropdownMenu({
  label,
  items,
  trigger,
  modal = true,
}: {
  label: string
  items: MenuAction[]
  trigger?: ReactNode
  modal?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Root modal={modal}>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger ?? (
          <Button variant="outline" endIcon={<ChevronDown aria-hidden="true" />}>
            {label}
          </Button>
        )}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-48 rounded-xl border border-border-subtle bg-card-surface p-1.5 shadow-raised outline-none"
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                'flex min-h-10 cursor-default select-none items-center rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                item.destructive && 'text-danger-foreground data-[highlighted]:bg-danger-surface',
              )}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} />
  )
}

export function PageHeader({
  eyebrow,
  title,
  heading,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  heading?: ReactNode
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className={cn('max-w-3xl space-y-2', heading && 'w-full')}>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
            {eyebrow}
          </p>
        )}
        {heading ?? <DecorativeHeading text={title} level={1} size="md" />}
        {description && (
          <p className="max-w-2xl text-base leading-7 text-ink-secondary sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-ink-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Stack({
  className,
  gap = 'md',
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col',
        gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4',
        className,
      )}
    />
  )
}

export function ResponsiveGrid({
  className,
  columns = 'three',
  minItemWidth,
  gap = 'md',
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  columns?: 'two' | 'three' | 'four'
  minItemWidth?: string
  gap?: 'sm' | 'md' | 'lg'
}) {
  const layout = {
    two: 'grid-cols-1 sm:grid-cols-2',
    three: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    four: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns]
  const gridStyle = minItemWidth
    ? { gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))`, ...style }
    : style
  return (
    <div
      {...props}
      style={gridStyle}
      className={cn(
        'grid',
        gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4 sm:gap-5 lg:gap-6',
        minItemWidth ? undefined : layout,
        className,
      )}
    />
  )
}

export function ContentSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={cn('space-y-6 py-10 sm:py-14', className)} />
}

export function AspectRatioMedia({
  ratio = 16 / 9,
  className,
  children,
}: {
  ratio?: number
  className?: string
  children: ReactNode
}) {
  return (
    <AspectRatioPrimitive.Root
      ratio={ratio}
      className={cn('overflow-hidden rounded-card bg-surface-blue', className)}
    >
      {children}
    </AspectRatioPrimitive.Root>
  )
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-[100] rounded-control bg-card-surface px-4 py-3 font-semibold text-ink-primary shadow-raised focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Bỏ qua điều hướng
    </a>
  )
}

const LearningPathContext = createContext(false)

export function LearningPath({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <LearningPathContext.Provider value>
      <ol
        className={cn(
          'relative flex list-none flex-col gap-3 pl-7 before:absolute before:bottom-5 before:left-[0.6875rem] before:top-5 before:w-px before:bg-border-subtle',
          className,
        )}
      >
        {children}
      </ol>
    </LearningPathContext.Provider>
  )
}

export function LearningPathStep({
  title,
  detail,
  active = false,
  done = false,
}: {
  title: string
  detail?: string
  active?: boolean
  done?: boolean
}) {
  const inPath = useContext(LearningPathContext)
  if (!inPath) throw new Error('LearningPathStep must be rendered inside LearningPath.')
  return (
    <li className="relative min-h-10">
      <span
        className={cn(
          'absolute -left-7 top-1 grid size-4 place-items-center rounded-full border-2 border-card-surface bg-border-strong ring-1 ring-border-subtle',
          active && 'bg-action-primary ring-action-primary',
          done && 'bg-success-foreground ring-success-foreground',
        )}
        aria-hidden="true"
      >
        {(active || done) && <span className="size-1.5 rounded-full bg-white" />}
      </span>
      <div className="space-y-0.5">
        <p className={cn('font-semibold', active && 'text-action-primary')}>{title}</p>
        {detail && <p className="text-sm text-ink-secondary">{detail}</p>}
      </div>
    </li>
  )
}

export function MenuIcon() {
  return <MoreHorizontal aria-hidden="true" className="size-5" />
}
