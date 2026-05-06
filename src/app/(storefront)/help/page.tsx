import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Help Center | Crown & Crest',
  description: 'Find support for orders, shipping, payments, returns, sizing, and customer contact details.',
}

const helpCards = [
  {
    id: 'orders',
    title: 'Orders and support',
    description: 'For order tracking, address issues, delivery delays, or assistance after purchase.',
    links: [
      { label: 'Contact support', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
    ],
  },
  {
    id: 'returns',
    title: 'Returns and exchanges',
    description: 'Review the return window, item condition rules, refund timing, and exchange guidance.',
    links: [
      { label: 'Return policy', href: '/returns' },
      { label: 'Contact returns support', href: '/contact' },
    ],
  },
  {
    id: 'payment',
    title: 'Payments and COD',
    description: 'Understand payment processing, COD availability, refund routing, and checkout support.',
    links: [
      { label: 'Terms and conditions', href: '/terms' },
      { label: 'Shipping policy', href: '/shipping' },
    ],
  },
  {
    id: 'sizing',
    title: 'Sizing and fit',
    description: 'Use size charts and fit guidance to choose the best option before you order.',
    links: [
      { label: 'Sizing help', href: '/sizing-help' },
      { label: 'FAQs', href: '/faq' },
    ],
  },
]

export default function HelpPage() {
  return (
    <main className="bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Help</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            Help Center
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
            Everything customers usually need before or after purchase, organised by topic.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {helpCards.map((card) => (
            <article id={card.id} key={card.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Support topic</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">{card.title}</h2>
              <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">{card.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {card.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:border-stone-900 hover:bg-stone-900 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-3xl bg-stone-950 p-6 text-white shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Need direct support?</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Email</p>
              <a href="mailto:support@crownandcrest.com" className="mt-2 block text-sm text-white/90 hover:text-white">
                support@crownandcrest.com
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Phone</p>
              <a href="tel:18001234567" className="mt-2 block text-sm text-white/90 hover:text-white">
                1800-123-4567
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Hours</p>
              <p className="mt-2 text-sm text-white/90">Mon-Sat, 10:00 AM - 7:00 PM IST</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}