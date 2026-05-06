import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Returns and Exchanges | Crown & Crest',
  description: 'Understand return eligibility, exchange windows, refund timelines, and non-returnable item rules.',
}

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Returns and Exchanges"
      description="We keep the return process straightforward when an item arrives damaged, incorrect, or does not work for you within the approved policy window."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Eligibility window',
          bullets: [
            'Return or exchange requests must be raised within 15 days from the date of delivery.',
            'Items must be unused, unwashed, and returned with original tags, packaging, and accessories where applicable.',
            'Products showing signs of wear, alteration, washing, or misuse may be rejected after inspection.'
          ]
        },
        {
          title: 'Items that cannot be returned',
          bullets: [
            'Final sale or clearance items clearly marked as non-returnable.',
            'Items customised, altered, or produced specifically on request.',
            'Gift cards, promotional freebies, or hygiene-sensitive categories where return is restricted by policy or law.'
          ]
        },
        {
          title: 'Refunds and exchanges',
          paragraphs: [
            'Approved refunds are processed back to the original payment method after the returned item passes inspection. Bank and payment timelines can vary, but most refunds reflect within 5 to 10 business days after approval.',
            'If an exchange is available for your requested size or approved replacement item, we will confirm the exchange option during support handling. If the requested replacement is unavailable, we may offer store credit or a refund depending on the case.'
          ]
        },
        {
          title: 'How to start a request',
          bullets: [
            'Email support with your order ID, product name, and reason for the request.',
            'Attach photos if the item is damaged, incorrect, or received with a packaging issue.',
            'Wait for the support team to confirm pickup, self-ship instructions, or next steps before dispatching the item.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Returns Support',
          items: [
            { label: 'Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'Phone', value: '1800-123-4567', href: 'tel:18001234567' },
            { label: 'Refund Policy', value: 'How refund settlement works', href: '/refund-policy' },
            { label: 'Cancellation Policy', value: 'When cancellation is allowed', href: '/cancellation-policy' },
            { label: 'Help Center', value: 'Open returns help', href: '/help#returns' }
          ]
        }
      ]}
      callToAction={{
        title: 'Still unsure if your item qualifies?',
        description: 'Contact support before raising a return if you want a quick confirmation on eligibility, timeline, or next steps.',
        links: [
          { label: 'Contact support', href: '/contact' },
          { label: 'Open FAQs', href: '/faq' }
        ]
      }}
    />
  )
}