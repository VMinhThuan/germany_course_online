import { cn } from '@/shared/ui/cn'

export function BilingualSectionHeading({
  title,
  german,
  description,
  as = 'h2',
  align = 'center',
  id,
  className,
}: {
  title: string
  german: string
  description?: string
  as?: 'h1' | 'h2'
  align?: 'left' | 'center'
  id?: string
  className?: string
}) {
  const Heading = as

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      <p
        lang="de"
        className="inline-flex rounded-full bg-brand-pink px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-ink-primary sm:text-sm"
      >
        {german}
      </p>
      <Heading
        id={id}
        className={cn(
          'font-display font-extrabold tracking-[-0.04em] text-ink-primary',
          as === 'h1'
            ? 'text-4xl leading-[1.08] sm:text-5xl lg:text-[3.75rem]'
            : 'text-3xl leading-tight sm:text-4xl',
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="text-base leading-7 text-ink-secondary sm:text-lg sm:leading-8">
          {description}
        </p>
      )}
    </div>
  )
}
