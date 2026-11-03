export const brandConfig = {
  name: 'PAniverseDeutsch',
  courseName: 'Tiếng Đức A1.1',
  tagline: 'Học tiếng Đức theo từng bước',
  description:
    'PAniverseDeutsch giới thiệu lộ trình học tiếng Đức A1.1 qua bài học trực tuyến, phần thực hành và nội dung học thử.',
  logos: {
    primary: '/assets/brand/logo-primary.svg',
    mark: '/assets/brand/logo-mark.svg',
    light: '/assets/brand/logo-light.svg',
    dark: '/assets/brand/logo-dark.svg',
  },
} as const

export function formatDocumentTitle(pageTitle?: string) {
  return pageTitle
    ? `${pageTitle} | ${brandConfig.name}`
    : `${brandConfig.name} | Học tiếng Đức A1.1`
}

export function setBrandPageTitle(pageTitle: string) {
  document.title = formatDocumentTitle(pageTitle)
}
