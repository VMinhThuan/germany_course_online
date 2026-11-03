export function PhotographicFeatureTile({
  title,
  description,
  image,
  imageAlt,
}: {
  title: string
  description: string
  image: string
  imageAlt: string
}) {
  return (
    <article className="homepage-feature-tile relative isolate overflow-hidden rounded-2xl bg-surface-muted">
      <img
        src={image}
        alt={imageAlt}
        width="1500"
        height="1000"
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-primary/85 via-ink-primary/10 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
        <h3 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-5 text-white/90 sm:text-base">{description}</p>
      </div>
    </article>
  )
}
