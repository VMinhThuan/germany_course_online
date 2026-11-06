import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Container,
} from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function FAQSection() {
  const { faq } = homepageContent

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-24 bg-surface-pink py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            {faq.eyebrow}
          </p>
          <h2
            id="faq-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
          >
            {faq.title}
          </h2>
          <p className="mt-3 leading-7 text-ink-secondary">{faq.description}</p>
        </header>

        <Accordion
          type="single"
          collapsible
          className="mx-auto max-w-3xl divide-y divide-border-subtle border-y border-border-subtle"
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
      </Container>
    </section>
  )
}
