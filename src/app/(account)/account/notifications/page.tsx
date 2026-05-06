export const revalidate = 0

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">Stay up to date on order and account updates.</p>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Updates</h2>
        <p className="text-sm text-gray-500">You are all caught up.</p>
      </section>
    </div>
  )
}
