import { createElement, type ReactNode } from 'react'
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
}: {
  text: string
  level?: HeadingLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const layout = safeCreateLetteringLayout(text)
  const semanticText: ReactNode = layout ? <span className="sr-only">{text}</span> : text
  const scale = size === 'lg' ? 'max-w-xl' : size === 'md' ? 'max-w-lg' : 'max-w-md'
  const headingClass = [
    'w-full text-3xl font-bold tracking-tight sm:text-4xl',
    layout
      ? 'decorative-lettering-heading rounded-3xl border border-brand-pink bg-brand-pink/45 px-4 py-3 shadow-raised sm:px-6 sm:py-4'
      : 'font-display',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(
    `h${level}`,
    { className: headingClass },
    semanticText,
    layout ? (
      <span aria-hidden="true" className={`block w-full ${scale}`}>
        <LetteringSvg layout={layout} />
      </span>
    ) : null,
  )
}
