import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Container } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function QuickEntrySection() {
  const { quickEntry } = homepageContent

  return (
    <Container>
      <section id="quick-entry" aria-labelledby="quick-entry-title" className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-action-primary">
            {quickEntry.eyebrow}
          </p>
          <h2
            id="quick-entry-title"
            className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl"
          >
            {quickEntry.title}
          </h2>
          <p className="mt-3 leading-6 text-ink-secondary">{quickEntry.description}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {quickEntry.items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.title}
                to={item.href}
                className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border-subtle bg-card-surface p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-action-primary/40 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus motion-reduce:transform-none motion-reduce:transition-none sm:p-5"
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.tone === 'blue' ? 'bg-surface-blue text-action-primary' : 'bg-surface-lime text-action-primary'}`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-action-primary">
                    {item.eyebrow}
                  </span>
                  <span className="mt-1 block font-display text-lg font-extrabold text-ink-primary">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-ink-secondary">
                    {item.description}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-action-primary">
                    {item.action}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            )
          })}
        </div>
      </section>
    </Container>
  )
}
