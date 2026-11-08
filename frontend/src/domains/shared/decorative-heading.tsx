import { createElement, type ReactNode } from 'react'
import { createLetteringLayout } from './lettering-engine'
import type { HeadingLevel } from './heading'

const TONE_MARKS = {
  '\u0300': (x: number, raised: boolean) => {
    const y = raised ? 0 : 7
    return `M${x + 8} ${y} Q${x + 19} ${y + 3} ${x + 31} ${y + 14} L${x + 37} ${y + 21} Q${x + 25} ${y + 12} ${x + 15} ${y + 7} Z`
  },
  '\u0301': (x: number, raised: boolean) => {
    const y = raised ? 0 : 7
    return `M${x + 14} ${y + 21} Q${x + 23} ${y + 10} ${x + 32} ${y} L${x + 41} ${y + 5} Q${x + 34} ${y + 17} ${x + 21} ${y + 27} Z`
  },
} as const

function renderMark(mark: string, x: number, anchorX: number, raised: boolean, key: string) {
  const center = x + anchorX
  if (mark === '\u0302') {
    const path = `M${center - 23} 31 L${center - 8} 15 Q${center} 7 ${center + 8} 15 L${center + 23} 31 Q${center + 25} 35 ${center + 20} 35 H${center + 17} Q${center + 14} 35 ${center + 11} 32 L${center} 22 L${center - 11} 32 Q${center - 14} 35 ${center - 17} 35 H${center - 20} Q${center - 25} 35 ${center - 23} 31 Z`
    return <path key={key} d={path} />
  }
  if (mark === '\u0300' || mark === '\u0301') {
    return <path key={key} d={TONE_MARKS[mark](center, raised)} />
  }
  if (mark === '\u0323') {
    return <circle key={key} cx={center} cy="112" r="7" />
  }
  return null
}

function LetteringSvg({ text, title }: { text: string; title: string }) {
  const layout = createLetteringLayout(text)
  if (!layout) return null

  return (
    <svg
      aria-hidden="true"
      className="block h-auto w-full overflow-visible"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      focusable="false"
      role="presentation"
    >
      <title>{title}</title>
      {layout.glyphs.map((glyph, index) =>
        glyph.character === ' ' ? null : (
          <g key={`${glyph.character}-${index}`}>
            <path
              d={glyph.path}
              fill="var(--lettering-shadow)"
              fillRule="evenodd"
              opacity="0.15"
              transform={`translate(${glyph.x} 3)`}
            />
            <path
              d={glyph.path}
              fill="var(--lettering-fill)"
              fillRule="evenodd"
              stroke="var(--lettering-outline)"
              strokeLinecap="round"
              strokeLinejoin="round"
              paintOrder="stroke fill"
              strokeWidth="8"
              transform={`translate(${glyph.x} 0)`}
            />
            {glyph.marks.map((mark, markIndex) => {
              const raised = glyph.marks.includes('\u0302')
              const shape = renderMark(mark, glyph.x, glyph.anchorX, raised, `${mark}-${markIndex}`)
              if (!shape) return null
              return (
                <g
                  key={`${glyph.character}-${index}-${mark}-${markIndex}`}
                  fill="var(--lettering-fill)"
                  stroke="var(--lettering-outline)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  strokeWidth="5"
                >
                  {shape}
                </g>
              )
            })}
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
  const layout = createLetteringLayout(text)
  const semanticText: ReactNode = layout ? <span className="sr-only">{text}</span> : text
  const scale = size === 'lg' ? 'max-w-xl' : size === 'md' ? 'max-w-lg' : 'max-w-md'
  const headingClass = [
    'w-full text-3xl font-bold tracking-tight sm:text-4xl',
    layout ? 'decorative-lettering-heading' : 'font-display',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(
    `h${level}`,
    { className: headingClass },
    semanticText,
    layout ? (
      <span aria-hidden="true" className={`mt-1 block w-full ${scale}`}>
        <LetteringSvg text={text} title={text} />
      </span>
    ) : null,
  )
}
