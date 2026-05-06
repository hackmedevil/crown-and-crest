import { ShieldCheck, Truck, RotateCcw } from 'lucide-react'

export default function ShippingInfo() {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Free shipping above Rs.999
        </li>
        <li className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          7-day easy returns
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Secure checkout
        </li>
      </ul>
    </div>
  )
}
