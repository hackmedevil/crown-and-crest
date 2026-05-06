import type { Metadata } from 'next'
import InfoPage from '@/components/legal/InfoPage'

export const metadata: Metadata = {
  title: 'Sizing Help | Crown & Crest',
  description: 'Use fit and measurement guidance to choose the right size before ordering.',
}

export default function SizingHelpPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Sizing Help"
      description="Use this page alongside product size charts if you want a quicker way to choose the right fit before placing an order."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: 'How to measure',
          bullets: [
            'Chest: measure around the fullest part of the chest while keeping the tape level and relaxed.',
            'Shoulder: measure edge to edge across the back from one shoulder point to the other.',
            'Length: measure from the highest shoulder point down to the desired hem position.',
            'Sleeve: measure from the shoulder seam to the sleeve opening where relevant.'
          ]
        },
        {
          title: 'If you are between sizes',
          bullets: [
            'Choose the larger size if you prefer a relaxed or oversized fit.',
            'Choose the smaller size only if the garment is meant to sit closer to the body and the size chart supports it.',
            'Compare the listed garment measurements against a similar item you already own for the best result.'
          ]
        },
        {
          title: 'Need more help?',
          paragraphs: [
            'If you are still unsure, contact support before placing the order and mention the product name, your usual size, and the fit you prefer. We can guide you based on the available chart and product cut.'
          ]
        }
      ]}
      sidebarCards={[
        {
          title: 'Support',
          items: [
            { label: 'Email', value: 'support@crownandcrest.com', href: 'mailto:support@crownandcrest.com' },
            { label: 'FAQ', value: 'Read common sizing questions', href: '/faq' },
            { label: 'Contact', value: 'Talk to support', href: '/contact' }
          ]
        }
      ]}
    />
  )
}