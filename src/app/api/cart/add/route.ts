import { NextResponse } from 'next/server'
import { addToCart as serverAddToCart } from '@/lib/cart/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const formData = new FormData()
    formData.append('productId', body.productId || '')
    formData.append('variantId', body.variantId || '')
    formData.append('quantity', String(body.quantity || 1))

    const result = await serverAddToCart(null, formData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('API /api/cart/add error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
