'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import ProductDetail from './components/ProductDetail';
import TeamScreen from './components/TeamScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import BillingScreen from './components/BillingScreen';
import SettingsScreen from './components/SettingsScreen';
import VapiCallScreen from './components/VapiCallScreen';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './lib/theme-context';
import { BlueprintData, generatePrompt } from './lib/prompt-generator';

const OpenClawChat = dynamic(() => import('./components/OpenClawChat'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-[#06060a] flex items-center justify-center">
      <div className="text-gray-600 text-sm">Loading OpenClaw Chat...</div>
    </div>
  ),
});
import {
  Sparkles,
  Layers,
  Globe,
  ShoppingCart,
  BarChart3,
  Bot,
  LayoutDashboard,
  Plus,
  ArrowLeft,
  ChevronRight,
  Zap,
  Code2,
  MousePointerClick,
  Building2,
  User,
  Users,
  Star,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  Package,
  Search,
  Settings,
  Send,
  Grip,
  Database,
  Shield,
  Workflow,
  Play,
  Eye,
  Rocket,
  CreditCard,
} from 'lucide-react';

/* ─── Types ───────────────────────────────────── */
type BuildMode = 'drag-drop' | 'ai-complete' | null;
type ViewScreen = 'home' | 'mode-select' | 'drag-drop-builder' | 'ai-builder' | 'vapi-call' | 'product-detail' | 'team' | 'analytics' | 'billing' | 'settings' | 'openclaw-chat';
type ProductType = 'landing' | 'ecommerce' | 'dashboard' | 'agent' | 'saas' | 'blog';

interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  status: 'live' | 'draft' | 'building';
  updatedAt: string;
  progress?: number;
  url?: string;
}

interface OrgProfile {
  name: string;
  tagline: string;
  industry: string;
  website: string;
  founded: string;
  teamSize: string;
  plan: 'Hobby' | 'Pro' | 'Enterprise';
}

/* ─── Mock Data ───────────────────────────────── */
const mockOrg: OrgProfile = {
  name: 'Acme Innovations',
  tagline: 'Cutting-edge SaaS tools that help teams ship 10x faster.',
  industry: 'Software / SaaS',
  website: 'acme.io',
  founded: '2022',
  teamSize: '12',
  plan: 'Pro',
};

const mockProducts: Product[] = [
  { id: '1', name: 'Acme Landing Page', type: 'landing', description: 'Marketing & conversion site', status: 'live', updatedAt: '2 days ago', progress: 100, url: '#' },
  { id: '2', name: 'Acme Store', type: 'ecommerce', description: 'Full e-commerce with Stripe', status: 'live', updatedAt: '5 days ago', progress: 100, url: '#' },
  { id: '3', name: 'Analytics Dashboard', type: 'dashboard', description: 'Real-time metrics & charts', status: 'draft', updatedAt: '1 week ago', progress: 65 },
  { id: '4', name: 'Support Bot Agent', type: 'agent', description: 'AI-powered customer support', status: 'building', updatedAt: 'Just now', progress: 30 },
  { id: '5', name: 'Internal SaaS Portal', type: 'saas', description: 'Team management platform', status: 'draft', updatedAt: '2 weeks ago', progress: 45 },
];

const typeConfig: Record<ProductType, { icon: React.ElementType; gradient: string; label: string }> = {
  landing: { icon: Globe, gradient: 'from-blue-500 to-cyan-400', label: 'Landing Page' },
  ecommerce: { icon: ShoppingCart, gradient: 'from-emerald-500 to-green-400', label: 'E-Commerce' },
  dashboard: { icon: BarChart3, gradient: 'from-amber-500 to-orange-400', label: 'Dashboard' },
  agent: { icon: Bot, gradient: 'from-violet-500 to-purple-400', label: 'AI Agent' },
  saas: { icon: Layers, gradient: 'from-rose-500 to-pink-400', label: 'SaaS App' },
  blog: { icon: Package, gradient: 'from-sky-500 to-blue-400', label: 'Blog' },
};

const statusStyles: Record<Product['status'], { dot: string; bg: string; text: string; label: string }> = {
  live: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Live' },
  draft: { dot: 'bg-gray-400', bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Draft' },
  building: { dot: 'bg-blue-400 animate-pulse', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Building' },
};

/* ─── Shared Topbar ───────────────────────────── */
function Topbar({ breadcrumbs, onBack }: { breadcrumbs: string[]; onBack?: () => void }) {
  const { user } = useUser();
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 lg:px-10 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="mr-1 p-2 -ml-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <NextLink href="/" className="text-lg font-black tracking-[0.2em] bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
          MYTH
        </NextLink>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2.5 text-sm">
            <ChevronRight size={14} className="text-gray-700" />
            <span className={i === breadcrumbs.length - 1 ? 'text-gray-200 font-medium' : 'text-gray-500'}>{crumb}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-gray-600">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress}</span>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8 ring-1 ring-white/10', userButtonPopoverCard: 'bg-gray-950 border border-white/10' } }} />
      </div>
    </header>
  );
}

/* ─── Product Card ────────────────────────────── */
function ProductCard({ product, delay = 0, onClick }: { product: Product; delay?: number; onClick?: () => void }) {
  const cfg = typeConfig[product.type];
  const status = statusStyles[product.status];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      onClick={onClick}
      className="group relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-6 hover:border-white/[0.12] hover:from-white/[0.06] transition-all duration-300 cursor-pointer"
    >
      {/* Actions on hover */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button onClick={e => { e.stopPropagation(); }} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.08] transition-colors"><Pencil size={14} /></button>
        {product.url && <button onClick={e => { e.stopPropagation(); }} className="p-2 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><ExternalLink size={14} /></button>}
        <button onClick={e => { e.stopPropagation(); }} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
      </div>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mb-4 shadow-lg shadow-black/30`}>
        <Icon size={22} className="text-white" />
      </div>

      {/* Info */}
      <h3 className="text-base font-semibold text-white mb-1 truncate pr-16">{product.name}</h3>
      <p className="text-sm text-gray-500 mb-4 truncate">{product.description}</p>

      {/* Progress bar */}
      {product.progress !== undefined && product.progress < 100 && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${product.progress}%` }}
              transition={{ duration: 0.8, delay: delay + 0.2 }}
              className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient}`}
            />
          </div>
          <span className="text-xs text-gray-600 mt-1.5 block">{product.progress}% complete</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${status.bg}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
        </div>
        <span className="text-xs text-gray-600 flex items-center gap-1.5"><Clock size={12} />{product.updatedAt}</span>
      </div>
    </motion.div>
  );
}

/* ─── New Product Card ────────────────────────── */
function NewProductCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.35 }}
      onClick={onClick}
      className="group rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[220px] cursor-pointer"
    >
      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-white/[0.12] group-hover:border-violet-500/50 flex items-center justify-center transition-all group-hover:scale-110 duration-300">
        <Plus size={24} className="text-gray-600 group-hover:text-violet-400 transition-colors" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 group-hover:text-violet-400 transition-colors">Create New</p>
        <p className="text-xs text-gray-700 mt-0.5">Product or Infrastructure</p>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════
   SCREEN 1 — HOME
   ═══════════════════════════════════════════════════ */
function HomeScreen({ onNewProject, onNavigate, onProductClick }: { onNewProject: () => void; onNavigate: (s: ViewScreen) => void; onProductClick: (p: Product) => void }) {
  const [search, setSearch] = useState('');
  const filtered = mockProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/[0.06] blur-[150px]" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.06] blur-[150px]" />
      </div>

      <Topbar breadcrumbs={['SaaS Copilot']} />

      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14 py-10">
        {/* Hero */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs text-gray-500 mb-5">
            <Star size={14} className="text-amber-400" /> SaaS Infrastructure Copilot
          </div>
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-tight text-white/90 mb-3">
            Build your entire{' '}
            <span className="font-medium bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">SaaS universe</span>
          </h1>
          <p className="text-base text-gray-500 max-w-2xl leading-relaxed">
            Manage your products — landing pages, dashboards, e-commerce, AI agents — and spin up new ones with drag-and-drop or full AI autopilot.
          </p>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Org Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
              className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-7"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-violet-500/20">
                  {mockOrg.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">{mockOrg.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">{mockOrg.plan}</span>
                    <span className="text-xs text-gray-600">{mockOrg.industry}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{mockOrg.tagline}</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {[
                  { icon: Globe, label: 'Website', value: mockOrg.website },
                  { icon: User, label: 'Team', value: `${mockOrg.teamSize} people` },
                  { icon: Clock, label: 'Founded', value: mockOrg.founded },
                  { icon: Building2, label: 'Industry', value: mockOrg.industry },
                ].map(({ icon: Ic, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <Ic size={15} className="text-gray-600 flex-shrink-0" />
                    <span className="text-gray-400 truncate">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* New Project CTA */}
            <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
              onClick={onNewProject}
              className="w-full group rounded-2xl relative overflow-hidden border border-violet-500/20 hover:border-violet-500/40 p-7 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-500/[0.08]"
            >
              {/* BG gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Plus size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">New Project</p>
                    <p className="text-sm text-gray-500">Drag & drop or AI autopilot</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  Choose your workflow to create landing pages, dashboards, stores, AI agents, or entire SaaS platforms.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                  Get Started <ChevronRight size={16} />
                </div>
              </div>
            </motion.button>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-6 grid grid-cols-3 divide-x divide-white/[0.06]"
            >
              {[
                { label: 'Total', value: mockProducts.length, color: 'text-white' },
                { label: 'Live', value: mockProducts.filter(p => p.status === 'live').length, color: 'text-emerald-400' },
                { label: 'Building', value: mockProducts.filter(p => p.status === 'building').length, color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center py-1">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-600 mt-1">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-8">
            {/* Section header + search */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Your Products</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 focus-within:border-violet-500/30 transition-colors">
                  <Search size={16} className="text-gray-600" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-40"
                  />
                </div>
                <span className="text-sm text-gray-600">{filtered.length} items</span>
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} delay={i * 0.06} onClick={() => onProductClick(product)} />
              ))}
              <NewProductCard onClick={onNewProject} />
            </div>

            {/* Capabilities row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] p-7"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">What you can build</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  { icon: Globe, label: 'Landing Pages', desc: 'Marketing & hero sites', gradient: 'from-blue-500 to-cyan-400' },
                  { icon: ShoppingCart, label: 'E-Commerce', desc: 'Store, cart & checkout', gradient: 'from-emerald-500 to-green-400' },
                  { icon: BarChart3, label: 'Dashboards', desc: 'Admin & analytics UIs', gradient: 'from-amber-500 to-orange-400' },
                  { icon: Bot, label: 'AI Agents', desc: 'Chatbots & automations', gradient: 'from-violet-500 to-purple-400' },
                  { icon: Code2, label: 'APIs & Backend', desc: 'REST endpoints & DBs', gradient: 'from-rose-500 to-pink-400' },
                  { icon: Layers, label: 'Full SaaS', desc: 'End-to-end platforms', gradient: 'from-sky-500 to-blue-400' },
                ].map(({ icon: Ic, label, desc, gradient }) => (
                  <div key={label} className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md shadow-black/20`}>
                      <Ic size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">{label}</p>
                      <p className="text-xs text-gray-600">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick navigation */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-6 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] p-7"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">Quick Access</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { icon: BarChart3, label: 'Analytics', screen: 'analytics' as ViewScreen, gradient: 'from-amber-500 to-orange-400' },
                  { icon: Users, label: 'Team', screen: 'team' as ViewScreen, gradient: 'from-violet-500 to-purple-400' },
                  { icon: CreditCard, label: 'Billing', screen: 'billing' as ViewScreen, gradient: 'from-emerald-500 to-green-400' },
                  { icon: Settings, label: 'Settings', screen: 'settings' as ViewScreen, gradient: 'from-gray-400 to-gray-500' },
                  { icon: Bot, label: 'OpenClaw Chat', screen: 'openclaw-chat' as ViewScreen, gradient: 'from-cyan-500 to-blue-400' },
                ].map(({ icon: Ic, label, screen, gradient }) => (
                  <button
                    key={label}
                    onClick={() => onNavigate(screen)}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                      <Ic size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCREEN 2 — MODE SELECT
   ═══════════════════════════════════════════════════ */
function ModeSelectScreen({ onSelect, onBack }: { onSelect: (m: BuildMode) => void; onBack: () => void }) {
  const modes = [
    {
      id: 'drag-drop' as BuildMode,
      icon: MousePointerClick,
      title: 'Drag & Drop Builder',
      subtitle: 'VISUAL INFRASTRUCTURE',
      description: 'Design your complete SaaS infrastructure by dragging and connecting components — pages, APIs, databases, agents, and integrations — on a visual canvas.',
      features: [
        { icon: Grip, text: 'Visual component canvas' },
        { icon: Workflow, text: 'Connect blocks with wires' },
        { icon: Eye, text: 'Real-time preview' },
        { icon: Rocket, text: 'One-click deploy' },
      ],
      gradient: 'from-violet-600 to-blue-600',
      bgGlow: 'bg-violet-500/[0.08]',
      border: 'hover:border-violet-500/30',
    },
    {
      id: 'ai-complete' as BuildMode,
      icon: Sparkles,
      title: 'AI Autopilot',
      subtitle: 'FULL AI-POWERED BUILD',
      description: 'Describe your SaaS idea in plain English. MYTH\'s AI Copilot will design, generate, and deploy your entire infrastructure automatically.',
      features: [
        { icon: Send, text: 'Natural language input' },
        { icon: Code2, text: 'Full-stack code generation' },
        { icon: Database, text: 'Auto database & API setup' },
        { icon: Shield, text: 'Auth & payments built-in' },
      ],
      gradient: 'from-cyan-500 to-emerald-500',
      bgGlow: 'bg-cyan-500/[0.08]',
      border: 'hover:border-cyan-500/30',
    },
  ];

  return (
    <div className="min-h-screen bg-[#06060a] text-white flex flex-col">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-violet-600/[0.04] blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] rounded-full bg-cyan-600/[0.04] blur-[180px]" />
      </div>

      <Topbar breadcrumbs={['SaaS Copilot', 'New Project']} onBack={onBack} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs text-gray-500 mb-6">
            <Zap size={14} className="text-amber-400" /> Choose your workflow
          </div>
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-tight text-white/90 mb-4">How would you like to build?</h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto">Pick the approach that suits you. You can always switch between modes later.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[900px]">
          {modes.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                onClick={() => onSelect(mode.id)}
                className={`group text-left relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] ${mode.border} backdrop-blur-sm p-8 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 overflow-hidden`}
              >
                {/* Glow blob */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full ${mode.bgGlow} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-6 shadow-xl shadow-black/30`}>
                    <Icon size={26} className="text-white" />
                  </div>

                  <p className="text-xs font-semibold tracking-[0.15em] text-gray-600 mb-2">{mode.subtitle}</p>
                  <h2 className="text-2xl font-semibold text-white mb-3">{mode.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-7">{mode.description}</p>

                  <div className="space-y-3 mb-7">
                    {mode.features.map(({ icon: Ic, text }) => (
                      <div key={text} className="flex items-center gap-3 text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                        <Ic size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                        {text}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-base font-medium text-white/70 group-hover:text-white transition-colors">
                    Get Started <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCREEN 3 — DRAG & DROP BUILDER
   ═══════════════════════════════════════════════════ */
function DragDropBuilder({ onBack }: { onBack: () => void }) {
  const blocks = [
    { icon: Globe, label: 'Landing Page', color: 'from-blue-500 to-cyan-400' },
    { icon: ShoppingCart, label: 'E-Commerce', color: 'from-emerald-500 to-green-400' },
    { icon: LayoutDashboard, label: 'Dashboard', color: 'from-amber-500 to-orange-400' },
    { icon: Bot, label: 'AI Agent', color: 'from-violet-500 to-purple-400' },
    { icon: BarChart3, label: 'Analytics', color: 'from-rose-500 to-pink-400' },
    { icon: Code2, label: 'API Layer', color: 'from-sky-500 to-blue-400' },
    { icon: Database, label: 'Database', color: 'from-teal-500 to-emerald-400' },
    { icon: Shield, label: 'Auth & Perms', color: 'from-orange-500 to-red-400' },
  ];

  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between h-14 px-5 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft size={17} />
          </button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <Grip size={16} className="text-violet-400" />
          <span className="text-sm font-medium text-gray-300">Drag & Drop Builder</span>
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
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 border-r border-white/[0.06] bg-[#08080d] overflow-y-auto">
          <div className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-gray-600 font-medium mb-4 px-2">Components</p>
            <div className="space-y-1.5">
              {blocks.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  draggable
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-all cursor-grab active:cursor-grabbing group"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm shadow-black/20`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundColor: '#08080d',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Center hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center">
              <div className="w-16 h-16 rounded-full border border-dashed border-white/[0.08] flex items-center justify-center mx-auto mb-5">
                <MousePointerClick size={26} className="text-gray-700" />
              </div>
              <p className="text-base text-gray-700">Drag components here to start building</p>
              <p className="text-sm text-gray-800 mt-1.5">Connect blocks to define your infrastructure</p>
            </motion.div>
          </div>

          {/* Sample nodes */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.4 }}
            className="absolute top-20 left-32 w-56 rounded-xl bg-[#0e0e14] border border-violet-500/20 p-4 shadow-2xl shadow-violet-500/[0.06] cursor-move"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Globe size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300">Landing Page</span>
              <span className="ml-auto w-6 h-6 rounded flex items-center justify-center bg-emerald-500/15"><Play size={11} className="text-emerald-400" /></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="w-[85%] h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
            </div>
            <p className="text-xs text-gray-600 mt-2">85% — Hero, navbar, CTA done</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.4 }}
            className="absolute top-56 left-[320px] w-56 rounded-xl bg-[#0e0e14] border border-purple-500/20 p-4 shadow-2xl shadow-purple-500/[0.06] cursor-move"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300">AI Agent</span>
              <span className="ml-auto w-6 h-6 rounded flex items-center justify-center bg-blue-500/15"><Settings size={11} className="text-blue-400 animate-spin" style={{ animationDuration: '3s' }} /></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="w-[40%] h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400" />
            </div>
            <p className="text-xs text-gray-600 mt-2">40% — Configuring prompts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.4 }}
            className="absolute top-32 right-52 w-56 rounded-xl bg-[#0e0e14] border border-emerald-500/20 p-4 shadow-2xl shadow-emerald-500/[0.06] cursor-move"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center">
                <Database size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300">Database</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="w-full h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
            </div>
            <p className="text-xs text-gray-600 mt-2">100% — PostgreSQL ready</p>
          </motion.div>

          {/* Connector SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
            <defs>
              <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M 236 112 C 290 112, 290 220, 348 220" stroke="url(#line1)" strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
          </svg>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCREEN 4 — AI BUILDER
   ═══════════════════════════════════════════════════ */
function AIBuilder({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Hi! I\'m your MYTH SaaS Copilot. Describe what you want to build and I\'ll generate the entire infrastructure — landing page, dashboard, e-commerce, AI agents — automatically.' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const suggestedPrompts = [
    'Build me a project management SaaS',
    'Create a landing page with pricing',
    'Set up an e-commerce store with Stripe',
    'Build a customer support chatbot',
  ];

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'ai', content: 'Analyzing your requirements... I\'ll start generating your infrastructure. Components will appear in the panel as they\'re built.' },
    ]);
    setInput('');
  };

  const chips = [
    { icon: Globe, label: 'Landing', color: 'from-blue-500 to-cyan-400' },
    { icon: ShoppingCart, label: 'E-Commerce', color: 'from-emerald-500 to-green-400' },
    { icon: BarChart3, label: 'Dashboard', color: 'from-amber-500 to-orange-400' },
    { icon: Bot, label: 'Agent', color: 'from-violet-500 to-purple-400' },
  ];

  const buildSteps = [
    { icon: Globe, label: 'Landing Page', status: 'Awaiting', color: 'from-blue-500 to-cyan-400' },
    { icon: BarChart3, label: 'Dashboard', status: 'Awaiting', color: 'from-amber-500 to-orange-400' },
    { icon: Database, label: 'Database', status: 'Awaiting', color: 'from-emerald-500 to-green-400' },
    { icon: Shield, label: 'Auth & Payments', status: 'Awaiting', color: 'from-rose-500 to-pink-400' },
    { icon: Bot, label: 'AI Agent', status: 'Awaiting', color: 'from-violet-500 to-purple-400' },
  ];

  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between h-14 px-5 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft size={17} />
          </button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <Sparkles size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">AI Copilot Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI Ready
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                )}
                <div className={`max-w-lg rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/10'
                  : 'bg-white/[0.04] border border-white/[0.06] text-gray-400'
                  }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Suggested prompts - only show if no user messages */}
            {messages.length === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-5">
                <p className="text-xs uppercase tracking-wider text-gray-700 mb-3">Try one of these</p>
                <div className="flex flex-col gap-2.5">
                  {suggestedPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="text-left text-sm text-gray-500 hover:text-gray-300 px-4 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all"
                    >
                      &quot;{prompt}&quot;
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick chips */}
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {chips.map(({ icon: Ic, label, color }) => (
              <button
                key={label}
                onClick={() => setInput(`Build me a ${label.toLowerCase()} for my SaaS`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] text-xs text-gray-500 hover:text-gray-300 transition-all"
              >
                <div className={`w-4 h-4 rounded bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Ic size={10} className="text-white" />
                </div>
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-6 pb-6">
            <div className="flex gap-3 items-end bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 focus-within:border-violet-500/30 transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Describe your SaaS — e.g. 'Build a project management tool with dashboard, Stripe billing, and AI chat support'"
                rows={2}
                className="flex-1 bg-transparent text-base text-gray-300 placeholder-gray-700 resize-none outline-none"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/15"
              >
                <Send size={17} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-72 flex-shrink-0 border-l border-white/[0.06] bg-[#08080d] overflow-y-auto">
          <div className="p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-gray-600 font-medium mb-5">Build Pipeline</p>
            <div className="space-y-2.5">
              {buildSteps.map(({ icon: Ic, label, status, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 opacity-40`}>
                    <Ic size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
                    <p className="text-xs text-gray-700">{status}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                </motion.div>
              ))}
            </div>

            <div className="mt-7 p-4 rounded-xl bg-gradient-to-br from-cyan-500/[0.06] to-emerald-500/[0.06] border border-cyan-500/10 text-center">
              <Sparkles size={18} className="text-cyan-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Describe your SaaS to</p>
              <p className="text-sm text-cyan-400 font-medium">activate the pipeline</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ROOT — Page Controller
   ═══════════════════════════════════════════════════ */
export default function SaaSCopilotPage() {
  const [screen, setScreen] = useState<ViewScreen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  const handleModeSelect = (mode: BuildMode) => {
    if (mode === 'drag-drop') setScreen('drag-drop-builder');
    else if (mode === 'ai-complete') setScreen('vapi-call');
  };

  const handleBlueprintReady = (data: BlueprintData) => {
    const prompt = generatePrompt(data);
    setGeneratedPrompt(prompt);
    setScreen('openclaw-chat');
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setScreen('product-detail');
  };

  return (
    <ThemeProvider>
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <HomeScreen onNewProject={() => setScreen('mode-select')} onNavigate={setScreen} onProductClick={handleProductClick} />
          </motion.div>
        )}
        {screen === 'mode-select' && (
          <motion.div key="mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ModeSelectScreen onSelect={handleModeSelect} onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'drag-drop-builder' && (
          <motion.div key="dd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <DragDropBuilder onBack={() => setScreen('mode-select')} />
          </motion.div>
        )}
        {screen === 'ai-builder' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AIBuilder onBack={() => setScreen('mode-select')} />
          </motion.div>
        )}
        {screen === 'vapi-call' && (
          <motion.div key="vapi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <VapiCallScreen onBack={() => setScreen('mode-select')} onBlueprintReady={handleBlueprintReady} />
          </motion.div>
        )}
        {screen === 'product-detail' && selectedProduct && (
          <motion.div key="pd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ProductDetail product={selectedProduct} onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'team' && (
          <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <TeamScreen onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AnalyticsScreen onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'billing' && (
          <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <BillingScreen onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SettingsScreen onBack={() => setScreen('home')} />
          </motion.div>
        )}
        {screen === 'openclaw-chat' && (
          <motion.div key="openclaw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <OpenClawChat onBack={() => setScreen('home')} initialPrompt={generatedPrompt || undefined} />
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeProvider>
  );
}
