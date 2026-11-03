import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Container,
  LinkButton,
} from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function FAQSection() {
  const { faq } = homepageContent

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-24 bg-surface-blue/55 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-action-primary">
              {faq.eyebrow}
            </p>
            <h2
              id="faq-title"
              className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
            >
              {faq.title}
            </h2>
            <p className="mt-4 leading-7 text-ink-secondary">{faq.description}</p>
            <LinkButton
              to="/courses/tieng-duc-a1-1/preview"
              size="md"
              endIcon={<ArrowRight aria-hidden="true" />}
              className="mt-6"
            >
              Học thử miễn phí
            </LinkButton>
            <p className="mt-4 text-sm text-ink-secondary">
              Cần trợ giúp?{' '}
              <Link
                to="/help"
                className="rounded-sm font-semibold text-action-primary underline underline-offset-4 hover:text-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
              >
                Xem trang trợ giúp
              </Link>
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="divide-y divide-border-subtle border-y border-border-subtle"
          >
            {faq.questions.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-0">
                <AccordionTrigger
                  headingLevel={3}
                  className="min-h-[4.5rem] px-3 py-5 text-base sm:px-4 sm:text-lg data-[state=open]:text-action-primary"
                >
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-5 pt-1 text-base leading-7 text-ink-secondary sm:px-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  )
}
