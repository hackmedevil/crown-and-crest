import { Metadata } from 'next'
import CheckoutClient from './CheckoutClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Checkout | Crown & Crest',
  description: 'Complete your purchase securely at Crown & Crest.',
}

export default function CheckoutPage() {
  return <CheckoutClient />
}
