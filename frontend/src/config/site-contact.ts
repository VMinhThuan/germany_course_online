export interface SiteContactConfig {
  email?: string
  phone?: string
  address?: string
  businessHours?: string
  socialLinks?: readonly { label: string; href: string }[]
}

// Populate only after the owner confirms public contact details and profile URLs.
export const siteContact: SiteContactConfig = {}
