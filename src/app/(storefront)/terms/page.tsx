import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Crown & Crest',
  description: 'Read the terms governing the use of the Crown & Crest website, checkout, and related services.',
}

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Terms and Conditions"
      description="These terms govern your use of our website, the purchase of products from Crown & Crest, and your interactions with our services."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Using the website',
          bullets: [
            'By using this website, you agree to use it only for lawful purposes and in a way that does not interfere with other users or platform operations.',
            'We may update product pages, features, content, and pricing at any time without prior notice where needed for accuracy or operational reasons.',
            'You are responsible for ensuring the details you provide during account use or checkout are complete and accurate.'
          ]
        },
        {
          title: 'Orders and payments',
          bullets: [
            'All orders are subject to acceptance, stock availability, address verification, and fraud screening.',
            'Prices listed on the website are displayed in INR unless otherwise stated and may change without prior notice.',
            'If a payment is authorised but the order cannot be fulfilled, we will cancel the order and process a refund in line with the original payment method.'
          ]
        },
        {
          title: 'Product information and availability',
          paragraphs: [
            'We aim to display accurate descriptions, pricing, and imagery. Small variations in colour, print placement, or finish can occur due to screen settings, batch production, or lighting conditions.',
            'Availability may change quickly during promotional periods. Adding an item to cart does not reserve stock until the order is placed successfully.'
          ]
        },
        {
          title: 'Returns, refunds, cancellation, liability, and intellectual property',
          bullets: [
            'Returns and exchanges are governed by our return policy, including item condition and timeline requirements.',
            'Refund settlement and refund method rules are governed by our refund policy.',
            'Order cancellation eligibility is governed by our cancellation policy and dispatch state at the time of request.',
            'Our liability is limited to the amount paid for the relevant order except where a longer obligation is required by law.',
            'All branding, product photography, graphics, text, and website design assets remain the property of Crown & Crest or the relevant rights holder and may not be reused without permission.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Related Policies',
          items: [
            { label: 'Privacy', value: 'How we handle data', href: '/privacy' },
            { label: 'Returns', value: 'Eligibility and refund flow', href: '/returns' },
            { label: 'Refunds', value: 'Settlement timelines and payment source', href: '/refund-policy' },
            { label: 'Cancellation', value: 'When cancellation is allowed', href: '/cancellation-policy' },
            { label: 'Shipping', value: 'Dispatch and delivery details', href: '/shipping' }
          ]
        }
      ]}
    />
  )
}