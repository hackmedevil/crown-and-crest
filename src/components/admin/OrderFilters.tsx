'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'

interface FilterState {
    payment_method?: string
    risk_tier?: string
    status?: string
    courier?: string
    pincode?: string
    date_from?: string
    date_to?: string
}

interface OrderFiltersProps {
    onApply: (filters: FilterState) => void
    onReset: () => void
}

export default function OrderFilters({ onApply, onReset }: OrderFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({})
    const [isOpen, setIsOpen] = useState(false)

    const handleApply = () => {
        onApply(filters)
    }

    const handleReset = () => {
        setFilters({})
        onReset()
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 font-semibold text-gray-900 mb-4"
            >
                <Filter className="w-4 h-4" />
                Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
            </button>

            {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                        </label>
                        <select
                            value={filters.payment_method || ''}
                            onChange={(e) => setFilters({ ...filters, payment_method: e.target.value || undefined })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                            <option value="COD">COD</option>
                            <option value="PREPAID">Prepaid</option>
                        </select>
                    </div>

                    {/* Risk Tier */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Risk Tier
                        </label>
                        <select
                            value={filters.risk_tier || ''}
                            onChange={(e) => setFilters({ ...filters, risk_tier: e.target.value || undefined })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                            <option value="CREATED">Created</option>
                            <option value="PAID">Paid</option>
                            <option value="SENT_TO_PROVIDER">Sent to Provider</option>
                            <option value="IN_PRODUCTION">In Production</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                    </div>

                    {/* Courier */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Courier
                        </label>
                        <input
                            type="text"
                            value={filters.courier || ''}
                            onChange={(e) => setFilters({ ...filters, courier: e.target.value || undefined })}
                            placeholder="e.g., Delhivery"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>

                    {/* Pincode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pincode
                        </label>
                        <input
                            type="text"
                            value={filters.pincode || ''}
                            onChange={(e) => setFilters({ ...filters, pincode: e.target.value || undefined })}
                            placeholder="6-digit pincode"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date From
                        </label>
                        <input
                            type="date"
                            value={filters.date_from || ''}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date To
                        </label>
                        <input
                            type="date"
                            value={filters.date_to || ''}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleApply}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-gray-900 font-semibold text-sm"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold text-sm flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Reset
                    </button>
                </div>
            )}
        </div>
    )
}
