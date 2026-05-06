import Link from 'next/link'

type InfoSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

type SidebarCard = {
  title: string
  items: Array<{
    label: string
    value: string
    href?: string
  }>
}

type CallToAction = {
  title: string
  description: string
  links: Array<{
    label: string
    href: string
  }>
}

type InfoPageProps = {
  eyebrow: string
  title: string
  description: string
  lastUpdated: string
  sections: InfoSection[]
  sidebarCards?: SidebarCard[]
  callToAction?: CallToAction
}

export default function InfoPage({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
  sidebarCards = [],
  callToAction,
}: InfoPageProps) {
  return (
    <main className="bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
            {description}
          </p>
          <p className="mt-6 text-sm text-stone-500">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-16">
        <div className="space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">{section.title}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
                  {paragraph}
                </p>
              ))}

              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-700 sm:text-base">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-stone-950" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          {callToAction ? (
            <section className="rounded-3xl bg-stone-950 p-6 text-white shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">{callToAction.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
                {callToAction.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {callToAction.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white hover:text-stone-950"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {sidebarCards.map((card) => (
            <section key={card.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">{card.title}</h2>
              <div className="mt-5 space-y-4">
                {card.items.map((item) => (
                  <div key={`${card.title}-${item.label}`} className="border-b border-stone-100 pb-4 last:border-b-0 last:pb-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="mt-2 block text-sm leading-6 text-stone-800 transition hover:text-stone-500">
                        {item.value}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-stone-700">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </aside>
      </section>
    </main>
  )
}