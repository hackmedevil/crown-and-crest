import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Refund Policy | Crown & Crest',
  description: 'Understand refund processing timelines, payment mode rules, and refund status tracking at Crown & Crest.',
}

export default function RefundPolicyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Refund Policy"
      description="This policy explains when refunds are approved, where the amount is credited, and how long settlement typically takes."
      lastUpdated="April 1, 2026"
      sections={[
        {
          title: 'When refunds are approved',
          bullets: [
            'Refunds are issued for approved returns, cancelled prepaid orders, duplicate payments, and fulfilment failures where shipment cannot be completed.',
            'The product must pass quality inspection where a physical return is required.',
            'If return eligibility conditions are not met, the refund request may be declined with a reason shared by support.'
          ]
        },
        {
          title: 'How refunds are processed',
          bullets: [
            'Prepaid orders are refunded to the original payment source whenever technically possible.',
            'COD orders are refunded to a verified bank account, UPI ID, or store credit flow shared by support.',
            'If the original method is unavailable, an alternate compliant method may be used after customer confirmation.'
          ]
        },
        {
          title: 'Refund timelines',
          paragraphs: [
            'Once approved, we initiate the refund promptly. Banks, card issuers, and payment partners usually complete settlement within 5 to 10 business days, though some methods may take longer.',
            'If you do not see the amount within the expected window, contact support with your order ID and refund reference so we can escalate with the payment partner.'
          ]
        },
        {
          title: 'Partial and non-refundable components',
          bullets: [
            'Shipping charges, convenience fees, or platform fees may be non-refundable unless refund is due to a seller-side failure.',
            'Promotional discounts are adjusted proportionally when partial returns are processed.',
            'Refunds are not provided for items marked non-returnable unless the delivered product is damaged, defective, or incorrect.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Refund Support',
          items: [
            { label: 'Support Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'Return Policy', value: 'Check item eligibility first', href: '/returns' },
            { label: 'Cancellation Policy', value: 'Order cancellation rules', href: '/cancellation-policy' }
          ]
        }
      ]}
      callToAction={{
        title: 'Need refund tracking help?',
        description: 'Share your order ID and payment details with support and we will verify the current status with our payment partner.',
        links: [
          { label: 'Contact support', href: '/contact' },
          { label: 'Open Help Center', href: '/help' }
        ]
      }}
    />
  )
}