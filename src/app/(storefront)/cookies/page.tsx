import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Cookie Policy | Crown & Crest',
  description: 'Learn how Crown & Crest uses cookies and similar technologies across the website.',
}

export default function CookiesPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Cookie Policy"
      description="We use cookies and similar technologies to keep the website functional, understand performance, and improve the shopping experience."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'What cookies do',
          paragraphs: [
            'Cookies are small text files stored on your device that help websites recognise sessions, remember preferences, and measure how pages are used.'
          ]
        },
        {
          title: 'How we use them',
          bullets: [
            'Essential cookies to keep sessions, authentication, and cart interactions working correctly.',
            'Performance and analytics cookies to understand how visitors use the storefront and where we need to improve speed or navigation.',
            'Preference cookies to remember settings and streamline repeat visits where technically appropriate.'
          ]
        },
        {
          title: 'Managing cookies',
          paragraphs: [
            'You can control or delete cookies through your browser settings. Disabling some cookies may reduce functionality for login, cart, checkout, or personalisation features.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Related Policies',
          items: [
            { label: 'Privacy Policy', value: 'How data is used', href: '/privacy' },
            { label: 'Contact', value: 'Ask a policy question', href: '/contact' }
          ]
        }
      ]}
    />
  )
}