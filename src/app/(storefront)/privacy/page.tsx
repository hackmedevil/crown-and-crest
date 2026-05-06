import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Privacy Policy | Crown & Crest',
  description: 'Review how Crown & Crest collects, uses, stores, and protects customer information.',
}

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Privacy Policy"
      description="This policy explains what information we collect, how we use it, and the choices available to you when you shop with Crown & Crest."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Information we collect',
          bullets: [
            'Identity and contact details such as your name, mobile number, email address, shipping address, and billing address.',
            'Order data such as purchased items, payment method, transaction identifiers, return requests, and support interactions.',
            'Technical and usage information such as device type, browser details, pages viewed, and interactions used to improve storefront performance and product discovery.'
          ]
        },
        {
          title: 'How we use your data',
          bullets: [
            'To process orders, deliver products, issue refunds, and provide customer support.',
            'To send operational updates including order confirmations, shipping updates, return statuses, and security notifications.',
            'To improve merchandising, product recommendations, website performance, fraud prevention, and customer experience.'
          ]
        },
        {
          title: 'Sharing and storage',
          paragraphs: [
            'We share only the information required to fulfil your order or operate the service, including with payment processors, logistics partners, support tools, analytics providers, and cloud infrastructure vendors. We do not sell your personal information.',
            'We retain information only for as long as needed for order management, legal compliance, fraud prevention, dispute resolution, and legitimate business operations.'
          ]
        },
        {
          title: 'Your choices',
          bullets: [
            'You may request access, correction, or deletion of your personal information by contacting our support team.',
            'You can opt out of non-essential promotional communication through the unsubscribe link in marketing messages.',
            'You can manage cookie preferences through your browser settings and review more detail on our cookies page.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Privacy Contacts',
          items: [
            { label: 'Email', value: 'privacy@crownandcrest.com', href: 'mailto:privacy@crownandcrest.com' },
            { label: 'Support', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'Terms', value: 'Review legal usage terms', href: '/terms' },
            { label: 'Refund Policy', value: 'Payment reversal and settlement', href: '/refund-policy' },
            { label: 'Cancellation Policy', value: 'Order cancellation rules', href: '/cancellation-policy' },
            { label: 'Cookies', value: 'Review cookie usage', href: '/cookies' }
          ]
        }
      ]}
    />
  )
}