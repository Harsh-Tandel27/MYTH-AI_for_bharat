import {
    Globe, ShoppingCart, BarChart3, Bot, Layers, Package,
} from 'lucide-react';
import type { ProductType, Product, OrgProfile, TeamMember, ActivityItem } from './types';

/* ─── Type configs ─────────────────────────────── */
export const typeConfig: Record<ProductType, { icon: React.ElementType; gradient: string; label: string }> = {
    landing: { icon: Globe, gradient: 'from-blue-500 to-cyan-400', label: 'Landing Page' },
    ecommerce: { icon: ShoppingCart, gradient: 'from-emerald-500 to-green-400', label: 'E-Commerce' },
    dashboard: { icon: BarChart3, gradient: 'from-amber-500 to-orange-400', label: 'Dashboard' },
    agent: { icon: Bot, gradient: 'from-violet-500 to-purple-400', label: 'AI Agent' },
    saas: { icon: Layers, gradient: 'from-rose-500 to-pink-400', label: 'SaaS App' },
    blog: { icon: Package, gradient: 'from-sky-500 to-blue-400', label: 'Blog' },
};

export const statusStyles: Record<Product['status'], { dot: string; bg: string; text: string; label: string }> = {
    live: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Live' },
    draft: { dot: 'bg-gray-400', bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Draft' },
    building: { dot: 'bg-blue-400 animate-pulse', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Building' },
};

/* ─── Mock data ────────────────────────────────── */
export const mockOrg: OrgProfile = {
    name: 'Acme Innovations',
    tagline: 'Cutting-edge SaaS tools that help teams ship 10x faster.',
    industry: 'Software / SaaS',
    website: 'acme.io',
    founded: '2022',
    teamSize: '12',
    plan: 'Pro',
};

export const mockProducts: Product[] = [
    { id: '1', name: 'Acme Landing Page', type: 'landing', description: 'Marketing & conversion site', status: 'live', updatedAt: '2 days ago', progress: 100, url: '#' },
    { id: '2', name: 'Acme Store', type: 'ecommerce', description: 'Full e-commerce with Stripe', status: 'live', updatedAt: '5 days ago', progress: 100, url: '#' },
    { id: '3', name: 'Analytics Dashboard', type: 'dashboard', description: 'Real-time metrics & charts', status: 'draft', updatedAt: '1 week ago', progress: 65 },
    { id: '4', name: 'Support Bot Agent', type: 'agent', description: 'AI-powered customer support', status: 'building', updatedAt: 'Just now', progress: 30 },
    { id: '5', name: 'Internal SaaS Portal', type: 'saas', description: 'Team management platform', status: 'draft', updatedAt: '2 weeks ago', progress: 45 },
];

export const mockTeam: TeamMember[] = [
    { id: '1', name: 'Jane Cooper', email: 'jane@acme.io', role: 'owner', status: 'active', lastActive: 'Now' },
    { id: '2', name: 'Alex Morgan', email: 'alex@acme.io', role: 'admin', status: 'active', lastActive: '2h ago' },
    { id: '3', name: 'Sam Rivera', email: 'sam@acme.io', role: 'editor', status: 'active', lastActive: '1d ago' },
    { id: '4', name: 'Chris Lee', email: 'chris@acme.io', role: 'developer', status: 'active', lastActive: '3h ago' },
    { id: '5', name: 'Pat Kim', email: 'pat@acme.io', role: 'viewer', status: 'invited', lastActive: 'Pending' },
];

export const mockActivity: ActivityItem[] = [
    { id: '1', user: 'Jane Cooper', action: 'deployed', target: 'Acme Landing Page', time: '2 hours ago' },
    { id: '2', user: 'Alex Morgan', action: 'edited page in', target: 'Acme Store', time: '5 hours ago' },
    { id: '3', user: 'Sam Rivera', action: 'updated content on', target: 'Analytics Dashboard', time: '1 day ago' },
    { id: '4', user: 'Chris Lee', action: 'pushed code to', target: 'Support Bot Agent', time: '1 day ago' },
    { id: '5', user: 'Jane Cooper', action: 'created project', target: 'Internal SaaS Portal', time: '2 weeks ago' },
];
