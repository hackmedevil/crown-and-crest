import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Cancellation Policy | Crown & Crest',
  description: 'Review order cancellation eligibility, timelines, and refund handling for cancelled orders at Crown & Crest.',
}

export default function CancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Cancellation Policy"
      description="This policy covers when an order can be cancelled, how cancellation requests are handled, and what refund outcome you should expect."
      lastUpdated="April 1, 2026"
      sections={[
        {
          title: 'Customer-initiated cancellation',
          bullets: [
            'You can request cancellation before the order is packed or handed to the logistics partner.',
            'Once shipment is dispatched, cancellation may not be possible and return flow will apply after delivery.',
            'High-risk, bulk, or custom orders may need additional verification before cancellation is approved.'
          ]
        },
        {
          title: 'Seller-initiated cancellation',
          bullets: [
            'We may cancel orders due to stock mismatch, address verification failure, payment risk, or operational constraints.',
            'If an order is cancelled by us after payment, the applicable refund is initiated automatically to the eligible source.',
            'Where possible, support may offer replacement options before final cancellation.'
          ]
        },
        {
          title: 'Refund impact of cancellations',
          paragraphs: [
            'Approved prepaid cancellations are usually refunded to the original payment source. Processing and settlement timelines depend on the bank or payment rail.',
            'For COD cancellations before dispatch, no payment capture is made. For edge cases, support will guide the exact next step.'
          ]
        },
        {
          title: 'How to request cancellation',
          bullets: [
            'Contact support as soon as possible with your order ID and registered mobile number.',
            'Use the same account details used at checkout to help us verify ownership quickly.',
            'If the cancellation window is missed, use the return policy after delivery.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Cancellation Support',
          items: [
            { label: 'Support Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'Refund Policy', value: 'Refund processing details', href: '/refund-policy' },
            { label: 'Return Policy', value: 'Post-delivery return flow', href: '/returns' }
          ]
        }
      ]}
      callToAction={{
        title: 'Need urgent cancellation help?',
        description: 'Reach out immediately with your order ID so our team can check whether your order is still in cancellable state.',
        links: [
          { label: 'Contact support', href: '/contact' },
          { label: 'Read return policy', href: '/returns' }
        ]
      }}
    />
  )
}