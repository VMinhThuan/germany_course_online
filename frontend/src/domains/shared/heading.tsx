import { createElement, type HTMLAttributes, type ReactNode } from 'react'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export function SemanticHeading({
  level,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level: HeadingLevel; children: ReactNode }) {
  return createElement(`h${level}`, props, children)
}
