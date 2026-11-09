import { createElement, type HTMLAttributes, type ReactNode } from 'react'
import { createLetteringLayout, type LetteringLayout } from './lettering-engine'
import type { HeadingLevel } from './heading'

function safeCreateLetteringLayout(text: string) {
  try {
    return createLetteringLayout(text)
  } catch {
    return null
  }
}

function LetteringSvg({ layout }: { layout: LetteringLayout }) {
  return (
    <svg
      aria-hidden="true"
      className="block h-auto w-full overflow-visible"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      focusable="false"
      role="presentation"
    >
      {layout.glyphs.map((glyph, index) =>
        glyph.character === ' ' ? null : (
          <g key={`${glyph.character}-${index}`}>
            <path
              d={glyph.outlinePath}
              fill="var(--lettering-shadow)"
              fillRule="evenodd"
              opacity="0.22"
              transform={`translate(${glyph.x + 12} ${glyph.y + 18})`}
            />
            <path
              d={glyph.outlinePath}
              fill="var(--lettering-outline)"
              fillRule="evenodd"
              transform={`translate(${glyph.x} ${glyph.y})`}
            />
            <path
              d={glyph.bodyPath}
              fill="var(--lettering-fill)"
              fillRule="evenodd"
              transform={`translate(${glyph.x} ${glyph.y})`}
            />
          </g>
        ),
      )}
    </svg>
  )
}

export function DecorativeHeading({
  text,
  level = 1,
  size = 'lg',
  className,
  ...headingProps
}: {
  text: string
  level?: HeadingLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string | undefined
} & Omit<HTMLAttributes<HTMLHeadingElement>, 'children'>) {
  const layout = safeCreateLetteringLayout(text)
  const semanticText: ReactNode = <span className="sr-only">{text}</span>
  const width = size === 'lg' ? '36rem' : size === 'md' ? '32rem' : '28rem'
  const headingClass = [
    'min-w-0 max-w-full',
    layout ? 'decorative-lettering-heading' : 'font-display decorative-heading-fallback',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(
    `h${level}`,
    { ...headingProps, className: headingClass },
    semanticText,
    <span
      aria-hidden="true"
      className="decorative-heading-card mt-1 inline-flex w-fit max-w-full items-center rounded-3xl border border-brand-pink bg-brand-pink/45 px-2 py-2 shadow-raised sm:px-5 sm:py-3"
    >
      {layout ? (
        <span className="block max-w-full" style={{ width, maxWidth: 'calc(100vw - 6rem)' }}>
          <LetteringSvg layout={layout} />
        </span>
      ) : (
        <span className="block max-w-full">{text}</span>
      )}
    </span>,
  )
}
