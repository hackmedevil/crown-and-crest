'use client'

import Link from 'next/link'
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    shop: [
      { label: 'Men', href: '/shop?category=Mens' },
      { label: 'Women', href: '/shop?category=Womens' },
      { label: 'New Arrivals', href: '/shop?new=true' },
      { label: 'Bestsellers', href: '/shop?bestseller=true' },
      { label: 'Sale', href: '/shop?sale=true' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Help Center', href: '/help' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Sizing Help', href: '/sizing-help' },
    ],
    policies: [
      { label: 'Returns & Exchanges', href: '/returns' },
      { label: 'Refund Policy', href: '/refund-policy' },
      { label: 'Cancellation Policy', href: '/cancellation-policy' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
    help: [
      { label: 'Order Support', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Help Center', href: '/help' },
      { label: 'Sizing Help', href: '/sizing-help' },
      { label: 'Contact Support', href: '/contact' },
    ],
  }

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/crownandcrest', label: 'Facebook' },
    { icon: Instagram, href: 'https://instagram.com/crownandcrest', label: 'Instagram' },
    { icon: Twitter, href: 'https://twitter.com/crownandcrest', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/crownandcrest', label: 'LinkedIn' },
  ]

  const paymentMethods = [
    { name: 'Visa', icon: '💳' },
    { name: 'Mastercard', icon: '💳' },
    { name: 'RuPay', icon: '💳' },
    { name: 'UPI', icon: '📱' },
    { name: 'NetBanking', icon: '🏦' },
    { name: 'Wallets', icon: '💰' },
  ]

  return (
    <footer className="bg-stone-950 text-stone-100">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-20">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Crown & Crest</h2>
              <p className="text-sm text-stone-400">Premium essentials, graphic tees, and dependable service for everyday wear.</p>
            </div>
            <div className="space-y-3 text-sm text-stone-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>123 Fashion Street, Mumbai, India</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4" />
                <a href="tel:+919876543210" className="hover:text-white transition">+91 98765 43210</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@crownandcrest.com" className="hover:text-white transition">hello@crownandcrest.com</a>
              </div>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Shop</h3>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-white transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-white transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies Links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Policies</h3>
            <ul className="space-y-3">
              {footerLinks.policies.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-white transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Help</h3>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-white transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-800 py-8">
          {/* Payment Methods */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Payment Methods</h3>
            <div className="flex flex-wrap gap-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="px-3 py-2 bg-stone-900 rounded text-sm text-stone-300 flex items-center gap-2"
                >
                  <span className="text-lg">{method.icon}</span>
                  {method.name}
                </div>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Follow Us</h3>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const IconComponent = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-stone-900 hover:bg-stone-800 rounded-full flex items-center justify-center transition"
                    aria-label={social.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-400">
          <p>&copy; {currentYear} Crown & Crest. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white transition">Refunds</Link>
            <Link href="/cancellation-policy" className="hover:text-white transition">Cancellation</Link>
            <Link href="/cookies" className="hover:text-white transition">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
