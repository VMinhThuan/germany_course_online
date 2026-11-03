import { ArrowRight } from 'lucide-react'
import { LinkButton, Container } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function ValuePropositionSection() {
  const { value } = homepageContent

  return (
    <Container>
      <section
        id="learning-benefits"
        aria-labelledby="learning-benefits-title"
        className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-16 lg:py-24"
      >
        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-action-primary">
            {value.eyebrow}
          </p>
          <h2
            id="learning-benefits-title"
            className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-4xl"
          >
            {value.title}
          </h2>
          <p className="mt-4 leading-7 text-ink-secondary">
            Xem thử cách khóa học được trình bày trước khi tự mình mở bài mẫu.
          </p>
          <LinkButton
            to="/courses/tieng-duc-a1-1/preview"
            variant="link"
            endIcon={<ArrowRight aria-hidden="true" />}
            className="mt-5"
          >
            Mở học thử
          </LinkButton>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {value.items.map((item, index) => {
            const Icon = item.icon
            return (
              <li
                key={item.title}
                className={`rounded-2xl border border-border-subtle p-5 sm:p-6 ${index === 0 ? 'bg-surface-blue sm:row-span-2 sm:flex sm:flex-col sm:justify-between' : 'bg-card-surface'} ${index === 2 ? 'sm:col-start-2' : ''}`}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-card-surface text-action-primary shadow-soft">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {index === 0 ? (
                  <figure className="my-auto hidden rounded-xl border border-border-subtle bg-card-surface/85 px-5 py-4 shadow-soft sm:block">
                    <figcaption className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-action-primary">
                      Ví dụ trong bài mẫu · A1.1
                    </figcaption>
                    <blockquote
                      lang="de"
                      className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary"
                    >
                      “Guten Tag!”
                    </blockquote>
                    <p className="mt-1 text-sm text-ink-secondary">Xin chào! (lịch sự, ban ngày)</p>
                  </figure>
                ) : null}
                <div className="mt-5">
                  <h3 className="font-display text-lg font-extrabold text-ink-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </Container>
  )
}
