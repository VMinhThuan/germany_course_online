import { Link } from 'react-router'
import { brandConfig } from '@/config/brand'
import { siteContact } from '@/config/site-contact'
import { BrandLogo } from '@/shared/brand/BrandLogo'
import { homepageContent } from '../content/homepage-content'

function FooterLinkGroup({
  title,
  items,
}: {
  title: string
  items: readonly { label: string; href: string }[]
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className="inline-flex min-h-9 items-center rounded-sm text-sm text-white/75 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function HomepageFooter({ signedIn = false }: { signedIn?: boolean }) {
  const { footer } = homepageContent
  const supportLinks = [
    ...footer.support,
    {
      label: signedIn ? 'Khu vực học viên' : 'Đăng nhập',
      href: signedIn ? '/student/courses' : '/login',
    },
  ]
  const hasContact = Boolean(
    siteContact.email ||
    siteContact.phone ||
    siteContact.address ||
    siteContact.businessHours ||
    siteContact.socialLinks?.length,
  )

  return (
    <footer id="footer-contact" className="homepage-footer scroll-mt-24 bg-ink-primary text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-9 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.9fr_1fr] lg:gap-10 lg:px-8">
        <div>
          <BrandLogo to="/" variant="light" className="-ml-2" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
            {brandConfig.tagline}. Khám phá các lộ trình tiếng Đức qua bài học và phần thực hành.
          </p>
        </div>

        <FooterLinkGroup title="Khám phá" items={footer.discovery} />

        <FooterLinkGroup title="Hỗ trợ" items={supportLinks} />

        <section aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title" className="text-sm font-bold text-white">
            Liên hệ
          </h2>
          {hasContact ? (
            <ul className="mt-4 grid gap-2 text-sm text-white/75">
              {siteContact.email && (
                <li>
                  <a
                    className="hover:text-white hover:underline"
                    href={`mailto:${siteContact.email}`}
                  >
                    {siteContact.email}
                  </a>
                </li>
              )}
              {siteContact.phone && (
                <li>
                  <a className="hover:text-white hover:underline" href={`tel:${siteContact.phone}`}>
                    {siteContact.phone}
                  </a>
                </li>
              )}
              {siteContact.address && <li>{siteContact.address}</li>}
              {siteContact.businessHours && <li>{siteContact.businessHours}</li>}
              {siteContact.socialLinks?.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white hover:underline"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
              Thông tin liên hệ sẽ được bổ sung khi đã được xác nhận.
            </p>
          )}
        </section>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/65 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} {brandConfig.name}
          </p>
          <p>Học tiếng Đức trực tuyến</p>
        </div>
      </div>
    </footer>
  )
}
