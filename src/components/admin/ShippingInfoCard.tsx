import { Truck, Calendar, ExternalLink } from 'lucide-react'

interface ShippingInfoCardProps {
    courierName?: string | null
    trackingId?: string | null
    shipmentStatus?: string | null
    estimatedDeliveryDate?: string | null
    actualDeliveryDate?: string | null
    actualShippingFee?: number | null
}

export default function ShippingInfoCard({
    courierName,
    trackingId,
    shipmentStatus,
    estimatedDeliveryDate,
    actualDeliveryDate,
    actualShippingFee,
}: ShippingInfoCardProps) {
    // If no shipping data, show not created state
    if (!courierName && !trackingId) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-gray-700" />
                    <h2 className="font-semibold text-gray-900">Shipping Information</h2>
                </div>
                <p className="text-sm text-gray-500 italic">Shipment not created yet</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">Shipping Information</h2>
            </div>

            <div className="space-y-3 text-sm">
                {/* Courier */}
                {courierName && (
                    <div className="flex justify-between">
                        <span className="text-gray-600">Courier</span>
                        <span className="font-medium text-gray-900">{courierName}</span>
                    </div>
                )}

                {/* Tracking ID */}
                {trackingId && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tracking ID</span>
                        <a
                            href={`https://shiprocket.co/tracking/${trackingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            {trackingId}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}

                {/* Shipment Status */}
                {shipmentStatus && (
                    <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${shipmentStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                            shipmentStatus === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                                shipmentStatus === 'RTO_INITIATED' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                            }`}>
                            {shipmentStatus.replace(/_/g, ' ')}
                        </span>
                    </div>
                )}

                {/* Estimated Delivery */}
                {estimatedDeliveryDate && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estimated Delivery</span>
                        <span className="flex items-center gap-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            {new Date(estimatedDeliveryDate).toLocaleDateString()}
                        </span>
                    </div>
                )}

                {/* Actual Delivery */}
                {actualDeliveryDate && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivered On</span>
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                            <Calendar className="w-3 h-3" />
                            {new Date(actualDeliveryDate).toLocaleDateString()}
                        </span>
                    </div>
                )}

                {/* Shipping Fee */}
                {actualShippingFee !== null && actualShippingFee !== undefined && (
                    <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Shipping Fee</span>
                        <span className="font-medium text-gray-900">₹{actualShippingFee}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
