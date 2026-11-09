import { Link } from 'react-router'
import { brandConfig } from '@/config/brand'
import { cn } from '@/shared/ui/cn'

export function BrandLogo({
  to = '/',
  compact = false,
  variant = 'primary',
  className,
  imageClassName,
}: {
  to?: string
  compact?: boolean
  variant?: 'primary' | 'light' | 'dark'
  className?: string
  imageClassName?: string
}) {
  const src = compact ? brandConfig.logos.mark : brandConfig.logos[variant]

  return (
    <Link to={to} className={cn('inline-flex min-w-0 items-center rounded-lg', className)}>
      <img
        src={src}
        alt={brandConfig.name}
        width={compact ? 40 : 236}
        height={compact ? 40 : 40}
        className={cn(
          'shrink-0 object-contain',
          compact ? 'size-10' : 'h-10 w-[14.75rem]',
          imageClassName,
        )}
      />
    </Link>
  )
}
