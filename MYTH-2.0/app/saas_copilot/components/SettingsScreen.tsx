'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft, Settings, Building2, Palette, Globe, Link2, Key,
  AlertTriangle, Save, Upload,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"><ArrowLeft size={17} /></button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <Settings size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-200">Organization Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-8 py-8 space-y-10">
          {/* General */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-5">
              <Building2 size={16} className="text-violet-400" />
              <h2 className="text-lg font-semibold text-white">General</h2>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/[0.06] flex items-center justify-center text-xl font-bold text-violet-400">A</div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] transition-colors">
                  <Upload size={14} /> Upload Logo
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Organization Name</label>
                  <input defaultValue="Acme Innovations" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/40 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Slug</label>
                  <input defaultValue="acme-innovations" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 font-mono outline-none focus:border-violet-500/40 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Industry</label>
                  <select className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/40 transition-colors">
                    <option>Software / SaaS</option><option>E-Commerce</option><option>Agency</option><option>Education</option><option>Healthcare</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tagline</label>
                  <input defaultValue="Ship 10x faster with AI" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/40 transition-colors" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Branding defaults */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="flex items-center gap-2 mb-5">
              <Palette size={16} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Default Branding</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Applied to all new products by default.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Primary', value: '#8b5cf6' },
                { label: 'Secondary', value: '#06b6d4' },
                { label: 'Accent', value: '#f59e0b' },
              ].map(c => (
                <div key={c.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg" style={{ background: c.value }} />
                    <div>
                      <p className="text-xs text-gray-400">{c.label}</p>
                      <p className="text-[11px] text-gray-600 font-mono">{c.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Domain */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-5">
              <Globe size={16} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Domains</h2>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3">
              <p className="text-sm text-white font-medium">acme-innovations.myth.dev</p>
              <p className="text-xs text-gray-600">Your default MYTH subdomain</p>
            </div>
          </motion.section>

          {/* Integrations */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center gap-2 mb-5">
              <Link2 size={16} className="text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'GitHub', status: 'Connected', connected: true },
                { name: 'Vercel', status: 'Not connected', connected: false },
                { name: 'Stripe', status: 'Connected', connected: true },
                { name: 'SendGrid', status: 'Not connected', connected: false },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <p className="text-sm text-white font-medium">{int.name}</p>
                    <p className={`text-xs ${int.connected ? 'text-emerald-400' : 'text-gray-600'}`}>{int.status}</p>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs ${int.connected ? 'text-gray-500 border border-white/[0.06] hover:border-white/[0.12]' : 'text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90'} transition-all`}>
                    {int.connected ? 'Manage' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </motion.section>

          {/* API Keys */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-5">
              <Key size={16} className="text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">API Keys</h2>
            </div>
            <div className="space-y-2">
              {[{ name: 'Production', key: 'sk_prod_••••••••••••X4kF', created: 'Jan 5, 2026' },
              { name: 'Development', key: 'sk_dev_••••••••••••R7mN', created: 'Feb 1, 2026' }].map(k => (
                <div key={k.name} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{k.name}</p>
                    <p className="text-xs text-gray-600 font-mono">{k.key}</p>
                  </div>
                  <span className="text-xs text-gray-600">{k.created}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Danger zone */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={16} className="text-red-400" />
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            </div>
            <div className="p-5 rounded-xl border border-red-500/15 bg-red-500/[0.03] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Transfer Ownership</p>
                  <p className="text-xs text-gray-500">Transfer this organization to another user.</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] transition-colors">Transfer</button>
              </div>
              <div className="border-t border-red-500/10" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Delete Organization</p>
                  <p className="text-xs text-gray-500">Permanently delete this organization and all its data.</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">Delete</button>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
