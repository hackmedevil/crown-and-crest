'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Settings, CreditCard, Bell, Truck, TrendingUp, Search } from 'lucide-react'
import StoreBrandingSection from './StoreBrandingSection'
import AIConfigurationTab from './ai/AIConfigurationTab'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general')

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your store preferences and AI configuration</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100/80 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'general'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Settings className="w-4 h-4" />
                    General Settings
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'ai'
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    AI Configuration
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* General Settings Tab */}
                {activeTab === 'general' && (
                    <>
                        {/* Store Branding - NEW */}
                        <div className="lg:col-span-2">
                            <StoreBrandingSection />
                        </div>

                        {/* Store Information */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Store Information</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Store Email</label>
                                    <input
                                        type="email"
                                        defaultValue="contact@crownandcrest.com"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Currency</label>
                                    <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                                        <option>INR (₹)</option>
                                        <option>USD ($)</option>
                                        <option>EUR (€)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Search Logs */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Search className="w-5 h-5 text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Search Logs</h2>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Review admin search queries, zero-result searches, and top products.
                            </p>
                            <Link
                                href="/admin/search-analytics"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                            >
                                Open Search Analytics
                            </Link>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">Order notifications</span>
                                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">Low stock alerts</span>
                                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">Customer messages</span>
                                    <input type="checkbox" className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300" />
                                </label>
                            </div>
                        </div>

                        {/* Payment Settings */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Payment Settings</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Razorpay Key ID</label>
                                    <input
                                        type="text"
                                        placeholder="rzp_test_xxxxxxxxxxxx"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Razorpay Key Secret</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••••••••••"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shipping */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Truck className="w-5 h-5 text-gray-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Shipping</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Standard Shipping Fee</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-serif">₹</span>
                                        <input
                                            type="number"
                                            defaultValue="0"
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Free Shipping Above</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-serif">₹</span>
                                        <input
                                            type="number"
                                            defaultValue="1000"
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}


                {/* AI Configuration Tab */}
                {activeTab === 'ai' && (
                    <div className="col-span-1 lg:col-span-2">
                        <AIConfigurationTab />
                    </div>
                )}
            </div>

            {/* Sticky Save Button */}
            <div className="fixed bottom-6 right-6 z-20">
                <button className="px-8 py-3 bg-gray-900 text-white font-bold rounded-full shadow-2xl hover:bg-black transform hover:-translate-y-1 transition-all flex items-center gap-2">
                    Save Changes
                </button>
            </div>
        </div>
    )
}
