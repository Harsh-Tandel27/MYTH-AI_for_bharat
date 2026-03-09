'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CreditCard, Check, Zap, Crown, Star,
  Receipt, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const plans = [
  {
    id: 'free', name: 'Free', price: '$0', period: '/month',
    description: 'For personal projects & experiments',
    features: ['2 products', '5 pages each', '500 MB storage', '50 AI generations/mo', 'Default subdomain'],
    gradient: 'from-gray-600 to-gray-500', current: false,
  },
  {
    id: 'pro', name: 'Pro', price: '$29', period: '/month',
    description: 'For professionals & growing teams',
    features: ['10 products', '50 pages each', '10 GB storage', '500 AI generations/mo', '3 custom domains', '5 team members', 'Real-time collaboration', 'Advanced analytics', '30-day version history'],
    gradient: 'from-violet-500 to-blue-500', current: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$99', period: '/month',
    description: 'For large-scale organizations',
    features: ['Unlimited products', 'Unlimited pages', '100 GB storage', 'Unlimited AI', 'Unlimited domains', 'Unlimited team', 'Priority support', 'White-label', 'Unlimited history', 'SSO & SAML'],
    gradient: 'from-amber-500 to-orange-400', current: false,
  },
];

const invoices = [
  { id: 'INV-2026-02', date: 'Feb 1, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'INV-2026-01', date: 'Jan 1, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'INV-2025-12', date: 'Dec 1, 2025', amount: '$29.00', status: 'Paid' },
];

export default function BillingScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"><ArrowLeft size={17} /></button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <CreditCard size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-gray-200">Billing &amp; Plans</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {/* Current plan banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 mb-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Crown size={22} className="text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Pro Plan</p>
                <p className="text-sm text-gray-400">Renews on March 1, 2026 · $29.00/month</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] transition-colors">
              Manage Subscription
            </button>
          </motion.div>

          {/* Plan cards */}
          <h3 className="text-lg font-semibold text-white mb-5">Available Plans</h3>
          <div className="grid grid-cols-3 gap-5 mb-10">
            {plans.map(plan => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`relative p-6 rounded-xl border transition-all ${plan.current ? 'bg-white/[0.04] border-violet-500/30 ring-1 ring-violet-500/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
              >
                {plan.current && (
                  <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-violet-500 to-blue-500 text-white">
                    CURRENT
                  </span>
                )}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                  {plan.id === 'free' ? <Zap size={16} className="text-white" /> : plan.id === 'pro' ? <Star size={16} className="text-white" /> : <Crown size={16} className="text-white" />}
                </div>
                <h4 className="text-lg font-semibold text-white">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mt-1 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-gray-600">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 mb-5">{plan.description}</p>
                <div className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check size={13} className="text-emerald-400 flex-shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <button className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${plan.current ? 'bg-white/[0.06] text-gray-400 cursor-default' : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90'
                  }`}>
                  {plan.current ? 'Current Plan' : plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Invoices */}
          <h3 className="text-lg font-semibold text-white mb-4">Invoice History</h3>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-xs text-gray-600 font-medium">Invoice</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600 font-medium">Date</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600 font-medium">Amount</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-gray-300 font-mono">{inv.id}</td>
                    <td className="px-5 py-3 text-gray-500">{inv.date}</td>
                    <td className="px-5 py-3 text-white font-medium">{inv.amount}</td>
                    <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{inv.status}</span></td>
                    <td className="px-5 py-3 text-right"><button className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">Download <Receipt size={11} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
