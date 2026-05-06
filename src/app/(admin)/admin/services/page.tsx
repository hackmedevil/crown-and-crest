import Link from 'next/link'

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">Services</h1>
        <p className="text-sm text-gray-500 mt-1">Manage third-party services and integrations.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <p className="text-gray-500">No services available at this time.</p>
      </section>
    </div>
  )
}
