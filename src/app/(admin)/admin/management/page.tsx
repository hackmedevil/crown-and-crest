'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, Tag, Settings, Palette, Ruler, Activity } from 'lucide-react'

export default function ManagementPage() {
  const sections = [
    {
      title: 'Brand Management',
      description: 'Create and manage brands for product categorization and SKU generation',
      icon: Building2,
      href: '/admin/management/brands',
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'SKU Manager',
      description: 'Search for SKUs, view product details, and manage inventory',
      icon: Tag,
      href: '/admin/management/sku-manager',
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      title: 'Inventory Health',
      description: 'Monitor stock reservations, detect stuck locks, and track TTL breaches',
      icon: Activity,
      href: '/admin/management/inventory-health',
      color: 'bg-rose-50 text-rose-600 border-rose-200'
    },
    {
      title: 'Color Profiles',
      description: 'Manage reusable color profiles for product variants',
      icon: Palette,
      href: '/admin/colors',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      title: 'Size Profiles',
      description: 'Manage reusable size profiles for variant generation',
      icon: Ruler,
      href: '/admin/size-guides',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      title: 'Services',
      description: 'Configure services and integrations',
      icon: Settings,
      href: '/admin/services',
      color: 'bg-gray-50 text-gray-600 border-gray-200'
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage brands, SKUs, color profiles, size profiles, and operational settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`block p-6 border rounded-lg hover:shadow-lg transition-shadow ${section.color}`}
            >
              <div className="flex items-start gap-4">
                <Icon className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">{section.title}</h3>
                  <p className="text-sm opacity-75 mt-1">{section.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
