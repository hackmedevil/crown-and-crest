'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react'

type Address = {
  id: string
  fullName: string
  phone: string
  email: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  pincode: string
  country: string
  isDefault: boolean
  createdAt: string
}

type AddressForm = {
  fullName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  country: string
  isDefault: boolean
}

const emptyForm: AddressForm = {
  fullName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  isDefault: false,
}

function toForm(address: Address): AddressForm {
  return {
    fullName: address.fullName,
    phone: address.phone,
    email: address.email || '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || 'India',
    isDefault: address.isDefault,
  }
}

export default function AccountAddressesClient() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressForm>(emptyForm)

  const isEditing = useMemo(() => Boolean(editingAddressId), [editingAddressId])

  const loadAddresses = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/account/addresses', { cache: 'no-store' })
      const payload = (await response.json()) as { addresses?: Address[]; error?: string }
      if (!response.ok) {
        setError(payload.error || 'Failed to load addresses')
        setAddresses([])
        return
      }
      setAddresses(payload.addresses || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load addresses')
      setAddresses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAddresses()
  }, [])

  const resetForm = () => {
    setEditingAddressId(null)
    setForm(emptyForm)
  }

  const submitAddress = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        editingAddressId ? `/api/account/addresses/${editingAddressId}` : '/api/account/addresses',
        {
          method: editingAddressId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || 'Failed to save address')
        return
      }

      setSuccess(editingAddressId ? 'Address updated successfully.' : 'Address added successfully.')
      resetForm()
      await loadAddresses()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const deleteAddress = async (addressId: string) => {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, { method: 'DELETE' })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || 'Failed to delete address')
        return
      }

      if (editingAddressId === addressId) {
        resetForm()
      }

      setSuccess('Address deleted successfully.')
      await loadAddresses()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete address')
    }
  }

  const markAsDefault = async (address: Address) => {
    if (address.isDefault) return

    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toForm(address), isDefault: true }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || 'Failed to set default address')
        return
      }

      setSuccess('Default address updated.')
      await loadAddresses()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default address')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white px-8 py-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">My Addresses</h1>
        <p className="text-gray-600">Create and manage multiple delivery addresses linked to your account.</p>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{success}</div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {isEditing ? 'Edit Address' : 'Add New Address'}
          </h2>
          {isEditing ? (
            <button
              onClick={resetForm}
              className="text-sm font-semibold text-gray-500 hover:text-gray-900"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form onSubmit={submitAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="Full Name"
            required
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="Contact Number"
            required
          />
          <input
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm sm:col-span-2"
            placeholder="Email (optional)"
          />
          <input
            value={form.addressLine1}
            onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm sm:col-span-2"
            placeholder="Address Line 1"
            required
          />
          <input
            value={form.addressLine2}
            onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm sm:col-span-2"
            placeholder="Address Line 2 (optional)"
          />
          <input
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="City"
            required
          />
          <input
            value={form.state}
            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="State"
            required
          />
          <input
            value={form.pincode}
            onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="Pincode"
            required
          />
          <input
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            placeholder="Country"
            required
          />

          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            />
            Set as default address
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Addresses</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            No saved addresses yet. Add your first address above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{address.fullName}</p>
                    <p className="text-xs text-gray-600 mt-1">{address.phone}</p>
                    {address.email ? <p className="text-xs text-gray-600">{address.email}</p> : null}
                  </div>
                  {address.isDefault ? (
                    <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Default
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 text-sm text-gray-700 leading-relaxed">
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                  <p>{address.city}, {address.state} - {address.pincode}</p>
                  <p>{address.country}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {!address.isDefault ? (
                    <button
                      onClick={() => void markAsDefault(address)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Set Default
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setEditingAddressId(address.id)
                      setForm(toForm(address))
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => void deleteAddress(address.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
