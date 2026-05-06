'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, Shield, RotateCcw, User2, Package, Star } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import FlashSalesBanner from '@/components/FlashSalesBanner'
import ProductCard from '@/components/ProductCard'
import TrustAndFeaturesBadges from '@/components/TrustAndFeaturesBadges'
import StylingContentSection from '@/components/StylingContentSection'

interface Product {
    id: string
    name: string
    slug: string
    base_price: number
    image_url: string | null
    category: string | null
}

interface HomeClientProps {
    newArrivals: Product[]
    bestsellers: Product[]
}

export default function HomeClient({ newArrivals, bestsellers }: HomeClientProps) {
    return (
        <div className="min-h-screen bg-white">
            {/* HERO CAROUSEL */}
            <HeroCarousel />

            {/* FLASH SALES BANNER */}
            <FlashSalesBanner />

            {/* TRUST METRICS */}
            <section className="py-8 bg-white border-b border-neutral-100">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">98%</p>
                            <p className="text-xs text-gray-600 mt-1">Fit Satisfaction</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">50%</p>
                            <p className="text-xs text-gray-600 mt-1">Lower Returns</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">Premium</p>
                            <p className="text-xs text-gray-600 mt-1">Fabrics Only</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">10K+</p>
                            <p className="text-xs text-gray-600 mt-1">Happy Customers</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CATEGORY QUICK NAVIGATION */}
            <section className="py-12 bg-white border-b border-neutral-100">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
                        {[
                            { name: 'Men', href: '/shop?gender=men', icon: '👔' },
                            { name: 'Women', href: '/shop?gender=women', icon: '👗' },
                            { name: 'New Arrivals', href: '/new', icon: '✨' },
                            { name: 'Collections', href: '/collections', icon: '📦' },
                            { name: 'Sale', href: '/sale', icon: '🏷️' },
                            { name: 'Size Book', href: '/account/size-profile', icon: '📏' },
                        ].map((category) => (
                            <Link
                                key={category.name}
                                href={category.href}
                                className="group block relative overflow-hidden rounded-lg transition-all hover:shadow-lg"
                            >
                                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                    <span className="text-4xl mb-2">{category.icon}</span>
                                    <span className="text-sm font-semibold text-gray-900 text-center px-2">{category.name}</span>
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* SIZE BOOK EXPLANATION */}
            <section className="py-20 bg-neutral-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Guessing Your Size</h2>
                        <p className="text-lg text-gray-600">
                            Create your Size Book once. Get perfect recommendations for every shirt.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="bg-white p-8 rounded-xl border border-neutral-200">
                            <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                                1
                            </div>
                            <h3 className="font-bold text-lg mb-2">Add Your Measurements</h3>
                            <p className="text-sm text-gray-600">
                                Enter your measurements or body type. Takes 2 minutes. Saved forever.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-xl border border-neutral-200">
                            <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                                2
                            </div>
                            <h3 className="font-bold text-lg mb-2">Get Fit Recommendations</h3>
                            <p className="text-sm text-gray-600">
                                Every product shows "Recommended for You" based on your Size Book.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-xl border border-neutral-200">
                            <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                                3
                            </div>
                            <h3 className="font-bold text-lg mb-2">Order With Confidence</h3>
                            <p className="text-sm text-gray-600">
                                Same perfect fit, every time. No returns. No exchanges.
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href="/account/size-profile"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-all shadow-lg"
                        >
                            Create Your Size Book
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* SHIRT COLLECTIONS */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Collections</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {[
                            { name: 'Formal Shirts', desc: 'Office & occasions', href: '/shop?category=Formal' },
                            { name: 'Casual Shirts', desc: 'Everyday comfort', href: '/shop?category=Casual' },
                            { name: 'Oxford Shirts', desc: 'Timeless classics', href: '/shop?category=Oxford' },
                            { name: 'Linen Shirts', desc: 'Breathable luxury', href: '/shop?category=Linen' },
                        ].map((collection, idx) => (
                            <Link
                                key={collection.name}
                                href={collection.href}
                                className="group block p-6 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200 hover:border-neutral-300"
                            >
                                <div className="aspect-square bg-gradient-to-br from-neutral-200 to-neutral-300 rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Package className="w-16 h-16 text-neutral-400" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">{collection.name}</h3>
                                <p className="text-sm text-gray-600">{collection.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* NEW ARRIVALS */}
            <section className="py-20 bg-neutral-50">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-12 max-w-6xl mx-auto">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold">
                                {newArrivals.length > 0 ? 'New Arrivals' : 'Our Shirts'}
                            </h2>
                            <p className="text-gray-600 mt-2">Fresh designs and timeless classics</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {newArrivals.length > 0 ? (
                            newArrivals.slice(0, 8).map((product, idx) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    name={product.name}
                                    slug={product.slug}
                                    price={product.base_price}
                                    imageUrl={product.image_url}
                                    category={product.category}
                                    rating={4.5 + (idx % 2) * 0.5}
                                    reviewCount={120 + idx * 20}
                                    isNew={idx < 4}
                                />
                            ))
                        ) : (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="group">
                                    <div className="relative aspect-square mb-3 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center">
                                        <Package className="w-20 h-20 text-neutral-300" />
                                    </div>
                                    <h3 className="text-sm font-semibold mb-1 text-gray-400">Premium Shirt {idx + 1}</h3>
                                    <p className="text-lg font-bold text-gray-400">Coming Soon</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-all shadow-lg"
                        >
                            View All Shirts
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* BESTSELLERS */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-12 max-w-6xl mx-auto">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold">Bestsellers</h2>
                            <p className="text-gray-600 mt-2">Customer favorites loved by thousands</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {bestsellers.length > 0 ? (
                            bestsellers.slice(0, 8).map((product, idx) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    name={product.name}
                                    slug={product.slug}
                                    price={product.base_price}
                                    imageUrl={product.image_url}
                                    category={product.category}
                                    rating={4.5 + (idx % 5) * 0.1}
                                    reviewCount={200 + idx * 50}
                                    isBestseller={true}
                                />
                            ))
                        ) : (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="group">
                                    <div className="relative aspect-square mb-3 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center">
                                        <Package className="w-20 h-20 text-neutral-300" />
                                    </div>
                                    <h3 className="text-sm font-semibold mb-1 text-gray-400">Bestseller {idx + 1}</h3>
                                    <p className="text-lg font-bold text-gray-400">Coming Soon</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-all shadow-lg"
                        >
                            Explore All Bestsellers
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* CURATED COLLECTIONS BY OCCASION */}
            <section className="py-20 bg-neutral-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12 max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Shop By Occasion</h2>
                        <p className="text-gray-600">Find the perfect shirt for every moment of your day</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {[
                            { 
                                occasion: 'Office Formal', 
                                emoji: '🏢',
                                href: '/shop?category=Formal',
                                desc: 'Professional & polished',
                                bgColor: 'bg-blue-100'
                            },
                            { 
                                occasion: 'Weekend Casual', 
                                emoji: '☀️',
                                href: '/shop?category=Casual',
                                desc: 'Comfort & style',
                                bgColor: 'bg-yellow-100'
                            },
                            { 
                                occasion: 'Date Night', 
                                emoji: '🌙',
                                href: '/shop?category=Premium',
                                desc: 'Elegant & sophisticated',
                                bgColor: 'bg-purple-100'
                            },
                            { 
                                occasion: 'Beach Getaway', 
                                emoji: '🌊',
                                href: '/shop?category=Linen',
                                desc: 'Light & breathable',
                                bgColor: 'bg-cyan-100'
                            },
                        ].map((collection) => (
                            <Link
                                key={collection.occasion}
                                href={collection.href}
                                className="group block p-6 rounded-lg transition-all hover:shadow-lg"
                            >
                                <div className={`aspect-square ${collection.bgColor} rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                    <span className="text-5xl">{collection.emoji}</span>
                                </div>
                                <h3 className="font-bold text-lg mb-1">{collection.occasion}</h3>
                                <p className="text-sm text-gray-600">{collection.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* STYLING CONTENT SECTION */}
            <StylingContentSection />

            {/* TRUST & FEATURES BADGES */}
            <TrustAndFeaturesBadges />

            {/* WHY CHOOSE US */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Crown & Crest</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                icon: User2,
                                title: 'Size Book System',
                                desc: 'Save your fit once, never guess again'
                            },
                            {
                                icon: RotateCcw,
                                title: '50% Fewer Returns',
                                desc: 'Perfect fit means confident purchases'
                            },
                            {
                                icon: Shield,
                                title: 'Premium Fabrics',
                                desc: 'Tested for durability and comfort'
                            },
                            {
                                icon: Star,
                                title: 'Consistent Fit',
                                desc: 'Same size works across all our shirts'
                            },
                        ].map((value) => (
                            <div key={value.title} className="text-center">
                                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                                    <value.icon className="w-8 h-8 text-gray-900" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                                <p className="text-sm text-gray-600">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SOCIAL PROOF */}
            <section className="py-20 bg-neutral-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Our Customers Say</h2>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                quote: "Finally, shirts that fit perfectly every time. The Size Book changed everything for me.",
                                author: "Amit S.",
                                role: "Regular Customer",
                                location: "Mumbai"
                            },
                            {
                                quote: "No more returns. No more exchanges. Just perfect fit from the first order.",
                                author: "Priya K.",
                                role: "Marketing Manager",
                                location: "Bangalore"
                            },
                            {
                                quote: "Premium quality and consistent sizing. I've ordered 6 shirts and every one fits the same.",
                                author: "Rahul M.",
                                role: "Business Owner",
                                location: "Delhi"
                            },
                        ].map((testimonial, idx) => (
                            <div key={idx} className="p-6 bg-white rounded-xl border border-neutral-200">
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-gray-700 mb-4 leading-relaxed">"{testimonial.quote}"</p>
                                <div className="border-t border-neutral-200 pt-4">
                                    <p className="font-bold text-sm text-gray-900">{testimonial.author}</p>
                                    <p className="text-xs text-gray-500">{testimonial.role} · {testimonial.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-20 bg-gray-900 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for Perfect Fit?</h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Create your Size Book today. Never guess your shirt size again.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/account/size-profile"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-xl"
                        >
                            <User2 className="w-5 h-5" />
                            Create Size Book
                        </Link>
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                        >
                            Browse Shirts
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
