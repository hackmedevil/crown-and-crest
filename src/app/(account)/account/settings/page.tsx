export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white px-8 py-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Update your account details and preferences.</p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white px-8 py-7 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Details</h2>
        <p className="text-sm text-gray-500">Keep your profile information up to date.</p>
      </section>

      <section id="payments" className="rounded-3xl border border-gray-200 bg-white px-8 py-7 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Methods</h2>
        <p className="text-sm text-gray-500">Manage saved payment options for faster checkout.</p>
      </section>
    </div>
  )
}
