export const revalidate = 0

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500">Share feedback on your purchases.</p>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
        <p className="text-sm text-gray-500">Items awaiting your review will appear here.</p>
      </section>
    </div>
  )
}
