/* ─── SaaS Copilot Types & Mock Data ───────────── */

export type BuildMode = 'drag-drop' | 'ai-complete' | null;
export type ViewScreen =
    | 'home'
    | 'mode-select'
    | 'drag-drop-builder'
    | 'ai-builder'
    | 'product-detail'
    | 'team'
    | 'analytics'
    | 'billing'
    | 'settings';

export type ProductType = 'landing' | 'ecommerce' | 'dashboard' | 'agent' | 'saas' | 'blog';

export interface Product {
    id: string;
    name: string;
    type: ProductType;
    description: string;
    status: 'live' | 'draft' | 'building';
    updatedAt: string;
    progress?: number;
    url?: string;
}

export interface OrgProfile {
    name: string;
    tagline: string;
    industry: string;
    website: string;
    founded: string;
    teamSize: string;
    plan: 'Hobby' | 'Pro' | 'Enterprise';
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'editor' | 'developer' | 'viewer';
    status: 'active' | 'invited';
    avatar?: string;
    lastActive: string;
}

export interface ActivityItem {
    id: string;
    user: string;
    action: string;
    target: string;
    time: string;
}
