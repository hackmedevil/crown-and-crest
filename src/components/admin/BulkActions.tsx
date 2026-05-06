'use client'

import { useState } from 'react'
import { Check, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface BulkActionsProps {
    selectedIds: string[]
    onClearSelection: () => void
    onStatusUpdate: (newStatus: string) => Promise<void>
    onExport: () => void
}

export default function BulkActions({
    selectedIds,
    onClearSelection,
    onStatusUpdate,
    onExport,
}: BulkActionsProps) {
    const [isUpdating, setIsUpdating] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState('')

    const handleStatusUpdate = async () => {
        if (!selectedStatus) {
            toast.error('Please select a status')
            return
        }

        setIsUpdating(true)
        try {
            await onStatusUpdate(selectedStatus)
            setShowStatusModal(false)
            setSelectedStatus('')
            toast.success(`Updated ${selectedIds.length} orders`)
        } catch (error) {
            toast.error('Failed to update orders')
        } finally {
            setIsUpdating(false)
        }
    }

    if (selectedIds.length === 0) return null

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span className="font-semibold text-gray-900">
                    {selectedIds.length} order{selectedIds.length !== 1 ? 's' : ''} selected
                </span>
                <button
                    onClick={onClearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                >
                    Clear
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-gray-900 font-semibold text-sm"
                >
                    Update Status
                </button>

                <button
                    onClick={onExport}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold text-sm flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Update Order Status
                        </h3>

                        <p className="text-sm text-gray-600 mb-4">
                            Update {selectedIds.length} order{selectedIds.length !== 1 ? 's' : ''} to:
                        </p>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4"
                        >
                            <option value="">Select Status</option>
                            <option value="PAID">Paid</option>
                            <option value="SENT_TO_PROVIDER">Sent to Provider</option>
                            <option value="IN_PRODUCTION">In Production</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                disabled={isUpdating}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStatusUpdate}
                                disabled={isUpdating || !selectedStatus}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-gray-900 font-semibold text-sm disabled:opacity-50"
                            >
                                {isUpdating ? 'Updating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
