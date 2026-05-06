import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Shipping Policy | Crown & Crest',
  description: 'Review dispatch timelines, estimated delivery windows, shipping charges, and COD information.',
}

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Shipping Policy"
      description="This page covers how long dispatch takes, what delivery timelines to expect, and how shipping charges are handled across orders."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Dispatch timelines',
          bullets: [
            'Most in-stock orders are dispatched within 24 to 48 business hours after payment confirmation.',
            'Orders placed during major sales, launch events, or high-volume periods may take longer to process.',
            'If we need additional verification for payment, address accuracy, or stock issues, dispatch may be held until the review is complete.'
          ]
        },
        {
          title: 'Estimated delivery',
          bullets: [
            'Metro cities: typically 2 to 5 business days after dispatch.',
            'Tier 2 and Tier 3 locations: typically 4 to 8 business days after dispatch.',
            'Remote or special-service pin codes may require additional transit time depending on courier coverage.'
          ]
        },
        {
          title: 'Shipping charges',
          paragraphs: [
            'Standard shipping charges are shown at checkout based on the order, product configuration, and delivery location. We currently promote free shipping on orders above Rs. 999 where applicable on the storefront.',
            'If an item includes product-specific shipping fees, that information may be displayed directly on the product page or applied during checkout.'
          ]
        },
        {
          title: 'Cash on Delivery and delivery issues',
          bullets: [
            'Cash on Delivery may be available only on selected pin codes, products, and order values.',
            'If a shipment is delayed, returned by the courier, or marked undeliverable due to an incorrect address, our support team will coordinate the next available resolution.',
            'Customers are responsible for providing a complete address and a reachable mobile number for courier coordination.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Shipping Help',
          items: [
            { label: 'Support Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'Refund Policy', value: 'Refund timelines and method', href: '/refund-policy' },
            { label: 'Cancellation Policy', value: 'Cancel before dispatch', href: '/cancellation-policy' },
            { label: 'FAQ', value: 'Common delivery questions', href: '/faq' },
            { label: 'Help Center', value: 'Shipping and payment help', href: '/help#payment' }
          ]
        }
      ]}
    />
  )
}