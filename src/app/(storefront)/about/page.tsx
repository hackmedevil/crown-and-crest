import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'About Us | Crown & Crest',
  description: 'Learn about Crown & Crest, our quality standards, and how we serve customers across India.',
}

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Company"
      title="Built for everyday confidence, designed with a premium point of view."
      description="Crown & Crest creates elevated essentials and graphic-led streetwear for customers who want comfort, fit, and detail without the noise."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'Who we are',
          paragraphs: [
            'Crown & Crest is an India-first fashion label focused on premium basics, graphic tees, and versatile wardrobe staples. We balance clean silhouettes, durable fabrics, and accessible pricing so the pieces work hard in real life.',
            'Every collection is selected with wearability in mind. We care about how the garment feels on first wear, how it holds up after repeat washes, and whether it still belongs in rotation months later.'
          ]
        },
        {
          title: 'What we value',
          bullets: [
            'Clarity in product information, pricing, shipping expectations, and post-purchase support.',
            'Fit and comfort over trend-chasing, with styles meant to work across everyday use cases.',
            'Reliable support for exchanges, returns, and order-related questions when something goes wrong.',
            'A storefront experience that is fast, transparent, and easy to navigate on mobile and desktop.'
          ]
        },
        {
          title: 'How we support customers',
          paragraphs: [
            'Our support team helps with product questions, delivery updates, returns, exchanges, payment concerns, and damaged-item resolutions. The fastest way to reach us is by email, but we also maintain phone support during business hours.',
            'If you need a size recommendation, shipping clarification, or help after delivery, use the Help Center, FAQs, or contact page and we will route you to the right flow.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Head Office',
          items: [
            { label: 'Address', value: '123 Fashion Street, Mumbai, Maharashtra, India' },
            { label: 'Email', value: 'hello@crownandcrest.com', href: 'mailto:hello@crownandcrest.com' },
            { label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' }
          ]
        },
        {
          title: 'Useful Links',
          items: [
            { label: 'Help Center', value: 'Visit support resources', href: '/help' },
            { label: 'Contact', value: 'Reach our team', href: '/contact' },
            { label: 'Shipping', value: 'Review delivery timelines', href: '/shipping' }
          ]
        }
      ]}
      callToAction={{
        title: 'Need something specific?',
        description: 'If you want help before placing an order, our support pages are structured around the most common questions customers ask before and after checkout.',
        links: [
          { label: 'Contact us', href: '/contact' },
          { label: 'Read FAQs', href: '/faq' }
        ]
      }}
    />
  )
}