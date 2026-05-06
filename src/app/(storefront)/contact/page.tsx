import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Contact Us | Crown & Crest',
  description: 'Get in touch with Crown & Crest for order support, product questions, returns, and business inquiries.',
}

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to a real person when you need order or product support."
      description="Use the details below for customer support, order help, returns guidance, or general business enquiries."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Customer support',
          paragraphs: [
            'For order status questions, exchange support, damaged items, refund timelines, or payment concerns, email our support desk with your order ID and a short summary of the issue.',
            'We aim to respond to all standard support requests within 1 business day. Requests sent on weekends or public holidays are handled on the next working day.'
          ]
        },
        {
          title: 'Business hours',
          bullets: [
            'Monday to Saturday: 10:00 AM - 7:00 PM IST',
            'Sunday: Closed for phone support, email queue remains active',
            'Order and delivery notifications continue automatically outside support hours'
          ]
        },
        {
          title: 'Before you write in',
          bullets: [
            'For order help, include your order number and the mobile number or email used during checkout.',
            'For damaged or incorrect items, attach clear photos of the parcel and the product received.',
            'For return requests, review the return policy first to confirm the item is eligible.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Direct Contacts',
          items: [
            { label: 'Support Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'General Email', value: 'hello@crownandcrest.com', href: 'mailto:hello@crownandcrest.com' },
            { label: 'Phone', value: '1800-123-4567', href: 'tel:18001234567' }
          ]
        },
        {
          title: 'Office',
          items: [
            { label: 'Location', value: '123 Fashion Street, Mumbai, Maharashtra, India' },
            { label: 'Support Page', value: 'Browse help resources', href: '/help' },
            { label: 'Returns', value: 'Start with the return policy', href: '/returns' }
          ]
        }
      ]}
      callToAction={{
        title: 'Need faster answers?',
        description: 'Most questions about delivery, refunds, COD, and exchanges are already covered in our public policies and FAQs.',
        links: [
          { label: 'Open Help Center', href: '/help' },
          { label: 'View shipping policy', href: '/shipping' }
        ]
      }}
    />
  )
}