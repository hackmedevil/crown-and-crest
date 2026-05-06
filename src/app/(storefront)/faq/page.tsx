import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'FAQs | Crown & Crest',
  description: 'Find answers to common questions about orders, shipping, returns, payments, and sizing.',
}

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Frequently Asked Questions"
      description="These are the most common questions we receive before and after purchase. If you do not find your answer here, contact support."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'When will my order ship?',
          paragraphs: [
            'Most orders are dispatched within 24 to 48 business hours. Tracking information is shared once the shipment is booked with the courier.'
          ]
        },
        {
          title: 'Can I return or exchange an item?',
          paragraphs: [
            'Yes, eligible items can be returned or exchanged within 15 days of delivery if they are unused and in original condition. Review the returns page for complete conditions.'
          ]
        },
        {
          title: 'Do you offer Cash on Delivery?',
          paragraphs: [
            'Cash on Delivery is available on selected pin codes, products, and order values. The option appears at checkout only when available for your order.'
          ]
        },
        {
          title: 'How do I choose the right size?',
          paragraphs: [
            'Use the product size chart where available and review our sizing-help page for fit guidance, measurement tips, and what to do if you are between sizes.'
          ]
        },
        {
          title: 'How long do refunds take?',
          paragraphs: [
            'Once a return is approved and inspected, refunds usually reflect within 5 to 10 business days depending on the payment provider and bank processing time.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Quick Links',
          items: [
            { label: 'Shipping', value: 'Delivery and dispatch details', href: '/shipping' },
            { label: 'Returns', value: 'Eligibility and timelines', href: '/returns' },
            { label: 'Sizing', value: 'Fit guidance', href: '/sizing-help' }
          ]
        }
      ]}
    />
  )
}