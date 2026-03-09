'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Globe, FileText, Palette, Navigation, Database, Bot,
  GlobeLock, Settings, BarChart3, Code2, Eye, Rocket, Plus, ChevronRight,
  Image, Type, Layout, Columns, AlignLeft, Star, MessageSquare,
  CreditCard, Shield, Pencil, Trash2, Clock, ExternalLink, Check,
  Copy, RefreshCw, Server, Layers, Upload,
} from 'lucide-react';
import type { Product, ProductType } from '../lib/types';
import { typeConfig, statusStyles } from '../lib/data';

const tabs = [
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'theme', label: 'Theme & Brand', icon: Palette },
  { id: 'navigation', label: 'Navigation', icon: Navigation },
  { id: 'cms', label: 'Content CMS', icon: AlignLeft },
  { id: 'backend', label: 'Backend', icon: Code2 },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'domain', label: 'Domain & Deploy', icon: GlobeLock },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

/* Mock pages */
const mockPages = [
  { id: '1', title: 'Home', route: '/', status: 'published' as const, updatedAt: '2 days ago' },
  { id: '2', title: 'About', route: '/about', status: 'published' as const, updatedAt: '5 days ago' },
  { id: '3', title: 'Pricing', route: '/pricing', status: 'draft' as const, updatedAt: '1 week ago' },
  { id: '4', title: 'Blog', route: '/blog', status: 'published' as const, updatedAt: '3 days ago' },
  { id: '5', title: 'Contact', route: '/contact', status: 'draft' as const, updatedAt: '2 weeks ago' },
];

const mockDeploys = [
  { id: '1', version: 'v1.4.2', date: 'Feb 20, 2026 14:32', status: 'success' as const, url: 'acme-landing.myth.dev' },
  { id: '2', version: 'v1.4.1', date: 'Feb 18, 2026 09:15', status: 'success' as const, url: 'acme-landing.myth.dev' },
  { id: '3', version: 'v1.4.0', date: 'Feb 15, 2026 22:01', status: 'failed' as const, url: '—' },
  { id: '4', version: 'v1.3.9', date: 'Feb 12, 2026 16:44', status: 'success' as const, url: 'acme-landing.myth.dev' },
];

export default function ProductDetail({ product, onBack }: { product: Product; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('pages');
  const cfg = typeConfig[product.type];
  const Icon = cfg.icon;
  const st = statusStyles[product.status];

  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft size={17} />
          </button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
            <Icon size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-200">{product.name}</span>
          <span className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors">
            <Eye size={15} /> Preview
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20">
            <Rocket size={15} /> Deploy
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#08080d] overflow-y-auto py-3">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'text-white bg-white/[0.06] border-r-2 border-violet-500'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
              >
                <TabIcon size={16} className={isActive ? 'text-violet-400' : ''} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'pages' && <PagesTab />}
          {activeTab === 'theme' && <ThemeTab />}
          {activeTab === 'navigation' && <NavigationTab />}
          {activeTab === 'cms' && <CMSTab />}
          {activeTab === 'backend' && <BackendTab />}
          {activeTab === 'agents' && <AgentsTab />}
          {activeTab === 'domain' && <DomainTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

/* ── Pages Tab ───────────────────────────────────── */
function PagesTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Pages</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your website pages and their content.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity">
          <Plus size={15} /> Add Page
        </button>
      </div>
      <div className="space-y-2">
        {mockPages.map(page => (
          <div key={page.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <FileText size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{page.title}</p>
                <p className="text-xs text-gray-600">{page.route}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {page.status}
              </span>
              <span className="text-xs text-gray-600">{page.updatedAt}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"><Pencil size={13} /></button>
                <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Theme Tab ───────────────────────────────────── */
function ThemeTab() {
  const colors = [
    { label: 'Primary', value: '#8b5cf6' },
    { label: 'Secondary', value: '#06b6d4' },
    { label: 'Accent', value: '#f59e0b' },
    { label: 'Background', value: '#06060a' },
    { label: 'Surface', value: '#0e0e14' },
    { label: 'Text', value: '#e5e7eb' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-semibold text-white mb-1">Theme & Branding</h2>
      <p className="text-sm text-gray-500 mb-8">Customize your website&apos;s visual identity.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">Color Palette</h3>
          <div className="grid grid-cols-3 gap-3">
            {colors.map(c => (
              <div key={c.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-full h-12 rounded-lg mb-2" style={{ background: c.value }} />
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-[11px] text-gray-600 font-mono">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">Typography</h3>
          <div className="space-y-3">
            {['Inter', 'Space Grotesk', 'JetBrains Mono'].map((font, i) => (
              <div key={font} className={`p-4 rounded-xl border transition-colors cursor-pointer ${i === 0 ? 'bg-violet-500/[0.06] border-violet-500/20' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'}`}>
                <p className="text-sm text-white font-medium">{font}</p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: font }}>The quick brown fox jumps over the lazy dog</p>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-medium text-gray-300 mt-8 mb-4">Logo & Favicon</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-6 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1] flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-500/30 transition-colors">
              <Upload size={20} className="text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">Upload Logo</p>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1] flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-500/30 transition-colors">
              <Image size={20} className="text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">Upload Favicon</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Navigation Tab ──────────────────────────────── */
function NavigationTab() {
  const navItems = [
    { label: 'Home', route: '/', order: 1 },
    { label: 'Features', route: '/features', order: 2 },
    { label: 'Pricing', route: '/pricing', order: 3 },
    { label: 'Blog', route: '/blog', order: 4 },
    { label: 'Contact', route: '/contact', order: 5 },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-semibold text-white mb-1">Navigation</h2>
      <p className="text-sm text-gray-500 mb-6">Configure your website&apos;s menu structure. Drag to reorder.</p>
      <div className="space-y-2 max-w-lg">
        {navItems.map(item => (
          <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-grab">
            <div className="text-gray-700 cursor-grab"><Layers size={14} /></div>
            <span className="text-sm text-white flex-1">{item.label}</span>
            <span className="text-xs text-gray-600 font-mono">{item.route}</span>
            <button className="p-1 rounded hover:bg-white/[0.06] text-gray-600 hover:text-white transition-colors"><Pencil size={12} /></button>
          </div>
        ))}
        <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/[0.08] text-sm text-gray-500 hover:text-white hover:border-white/[0.15] transition-colors">
          <Plus size={14} /> Add Menu Item
        </button>
      </div>
    </motion.div>
  );
}

/* ── CMS Tab ─────────────────────────────────────── */
function CMSTab() {
  const posts = [
    { title: 'Getting Started with Acme', type: 'Blog Post', date: 'Feb 18, 2026', status: 'published' },
    { title: 'New Feature Announcement', type: 'Blog Post', date: 'Feb 15, 2026', status: 'draft' },
    { title: 'Winter Collection', type: 'Product', date: 'Feb 10, 2026', status: 'published' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Content Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage blog posts, products, and media assets.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity">
          <Plus size={15} /> New Content
        </button>
      </div>
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.title} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <AlignLeft size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{p.title}</p>
                <p className="text-xs text-gray-600">{p.type} · {p.date}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{p.status}</span>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Media Library</h3>
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-video rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Image size={20} className="text-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Backend Tab ─────────────────────────────────── */
function BackendTab() {
  const endpoints = [
    { method: 'GET', path: '/api/products', status: 'active' },
    { method: 'POST', path: '/api/products', status: 'active' },
    { method: 'GET', path: '/api/users', status: 'active' },
    { method: 'POST', path: '/api/checkout', status: 'inactive' },
    { method: 'GET', path: '/api/analytics', status: 'active' },
  ];
  const methodColors: Record<string,string> = { GET: 'text-emerald-400 bg-emerald-500/10', POST: 'text-blue-400 bg-blue-500/10', PUT: 'text-amber-400 bg-amber-500/10', DELETE: 'text-red-400 bg-red-500/10' };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-semibold text-white mb-1">Backend</h2>
      <p className="text-sm text-gray-500 mb-6">API routes, database, and environment variables.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">API Endpoints</h3>
          <div className="space-y-2">
            {endpoints.map(e => (
              <div key={e.path+e.method} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${methodColors[e.method]}`}>{e.method}</span>
                <span className="text-sm text-gray-300 font-mono flex-1">{e.path}</span>
                <span className={`w-2 h-2 rounded-full ${e.status === 'active' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">Database</h3>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-3">
              <Database size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm text-white font-medium">MongoDB — acme_landing_db</p>
                <p className="text-xs text-gray-600">3 collections · 2.4 MB</p>
              </div>
              <span className="ml-auto text-xs text-emerald-400">Connected</span>
            </div>
            <div className="flex gap-2 text-xs">
              {['products', 'users', 'orders'].map(col => (
                <span key={col} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-400">{col}</span>
              ))}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-300 mt-6 mb-4">Environment Variables</h3>
          <div className="space-y-2">
            {['DATABASE_URL', 'STRIPE_SECRET_KEY', 'NEXT_PUBLIC_URL'].map(v => (
              <div key={v} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-xs text-gray-400 font-mono flex-1">{v}</span>
                <span className="text-xs text-gray-700">••••••••</span>
                <button className="p-1 rounded hover:bg-white/[0.06] text-gray-600"><Copy size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Agents Tab ──────────────────────────────────── */
function AgentsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Agents</h2>
          <p className="text-sm text-gray-500 mt-1">Chatbots and AI agents attached to this product.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-90 transition-opacity">
          <Plus size={15} /> Add Agent
        </button>
      </div>
      <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center">
            <Bot size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">Support Assistant</p>
            <p className="text-sm text-gray-500">Customer support chatbot · GPT-4o</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Conversations', '1,284'], ['Avg Response', '1.2s'], ['Satisfaction', '94%']].map(([l,v]) => (
            <div key={l} className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-lg font-bold text-white">{v}</p>
              <p className="text-[11px] text-gray-600">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Domain Tab ──────────────────────────────────── */
function DomainTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-semibold text-white mb-1">Domain & Deployment</h2>
      <p className="text-sm text-gray-500 mb-6">Manage domains and deploy your website.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">Domains</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white font-medium">acme-landing.myth.dev</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Default</span>
              </div>
              <p className="text-xs text-gray-600">MYTH subdomain · Always active</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white font-medium">www.acme.io</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Verifying</span>
              </div>
              <p className="text-xs text-gray-600">Custom domain · DNS propagating</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/[0.08] text-sm text-gray-500 hover:text-white hover:border-white/[0.15] transition-colors">
              <Plus size={14} /> Add Custom Domain
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-4">Deployment History</h3>
          <div className="space-y-2">
            {mockDeploys.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d.status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {d.status === 'success' ? <Check size={14} className="text-emerald-400" /> : <RefreshCw size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{d.version}</p>
                  <p className="text-xs text-gray-600">{d.date}</p>
                </div>
                {d.status === 'success' && <ExternalLink size={13} className="text-gray-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Product Settings Tab ────────────────────────── */
function SettingsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-semibold text-white mb-1">Product Settings</h2>
      <p className="text-sm text-gray-500 mb-8">SEO, tracking, and advanced configuration.</p>
      <div className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Page Title (SEO)</label>
          <input defaultValue="Acme Landing Page — Build Faster" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/40 transition-colors" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Meta Description</label>
          <textarea defaultValue="Acme helps teams ship 10x faster with AI-powered SaaS tools." rows={3} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/40 transition-colors resize-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Analytics Tracking ID</label>
          <input defaultValue="G-XXXXXXXXXX" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 font-mono outline-none focus:border-violet-500/40 transition-colors" />
        </div>
        <div className="pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] transition-colors">Archive Product</button>
            <button className="px-4 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">Delete Product</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
