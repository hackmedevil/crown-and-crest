import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6" itemScope itemType="https://schema.org/BreadcrumbList">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-black transition-colors" itemProp="item">
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span className={isLast ? 'text-gray-900 font-medium' : ''} itemProp="name">{item.label}</span>
              )}
              <meta itemProp="position" content={String(index + 1)} />
              {!isLast && <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
