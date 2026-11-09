import { createElement, type HTMLAttributes, type ReactNode } from 'react'
import { DecorativeHeading } from './decorative-heading'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export function SemanticHeading({
  level,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level: HeadingLevel; children: ReactNode }) {
  if (level === 1 && typeof children === 'string') {
    return <DecorativeHeading text={children} level={1} size="md" {...props} />
  }
  return createElement(`h${level}`, props, children)
}
