export const revalidate = 0

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500">Get help with orders, returns, and account issues.</p>
      </section>

      <section id="support-help" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Help Center</h2>
        <p className="text-sm text-gray-500">Browse FAQs or start a support request.</p>
      </section>

      <section id="support-contact" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Contact Us</h2>
        <p className="text-sm text-gray-500">Reach our team for order and product questions.</p>
      </section>

      <section id="support-returns" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Returns Help</h2>
        <p className="text-sm text-gray-500">Need help with a return? Start here.</p>
      </section>
    </div>
  )
}
