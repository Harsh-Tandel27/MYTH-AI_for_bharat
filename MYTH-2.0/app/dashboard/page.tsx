"use client";

import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Code, Sparkles, Link as LinkIcon, Trash2, Clock, ExternalLink, Plus, Search, Loader2, Bot, Globe, MessageSquare, Layout, Network, Database, Smartphone, BarChart, Wallet, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  type: 'url' | 'prompt' | 'mern';
  sourceUrl?: string;
  sandboxId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'url' | 'prompt' | 'mern'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        if (data.success) {
          setProjects(data.projects);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchProjects();
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || project.type === filter;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">Access Denied</h1>
          <p className="text-[var(--muted-foreground)] mb-6">Please sign in to access your dashboard.</p>
          <Link href="/sign-in" className="inline-flex items-center px-6 py-3 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const heroFeatures = [
    // {
    //   title: "SaaS Copilot",
    //   description: "Your AI companion for building full-stack applications. Chat, generate, and deploy instantly.",
    //   icon: <Bot className="h-10 w-10 text-[#3b82f6]" />,
    //   href: "/copilot",
    // },
    {
      title: "Drag & Drop Builder",
      description: "Build stunning websites visually by dragging and dropping pre-built sections. No code required.",
      icon: <GripVertical className="h-10 w-10 text-[#3b82f6]" />,
      href: "/drag-drop",
    },
  ];

  const features = [
    {
      title: "Agent AI",
      description: "Build autonomous AI agents using a professional node-based canvas.",
      icon: <Network className="h-8 w-8 text-[#3b82f6]" />,
      href: "/agentai",
    },
    {
      title: "Full-Stack MERN",
      description: "Multi-Sandbox Provisioning. Atlas-on-the-Fly. Coherence Guard.",
      icon: <Database className="h-8 w-8 text-[#3b82f6]" />,
      href: "/fullstackai",
    },
    {
      title: "Application AI",
      description: "The ultimate React Native Expo app builder for mobile-first engineering.",
      icon: <Smartphone className="h-8 w-8 text-[#3b82f6]" />,
      href: "/applicationai",
    },
    {
      title: "Data Insight (Streamlit)",
      description: "Python Sandboxing with automated Streamlit installation and execution.",
      icon: <BarChart className="h-8 w-8 text-[#3b82f6]" />,
      href: "/datatodashboardai",
    },
    {
      title: "Prompt to Code",
      description: "High-speed React application generation from natural language prompts.",
      icon: <MessageSquare className="h-8 w-8 text-[#3b82f6]" />,
      href: "/promptai",
    },
    {
      title: "URL AI",
      description: "Clone and transform existing websites instantly.",
      icon: <Globe className="h-8 w-8 text-[#3b82f6]" />,
      href: "/urlai",
    },
  ];


  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[#3b82f6]/20">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="w-[calc(100%-2rem)] md:w-full sticky top-4 z-50 bg-[var(--card)]/60 backdrop-blur-xl border border-[var(--border)] rounded-2xl transition-all duration-500 hover:bg-[var(--card)]/80 mx-auto max-w-6xl mt-4">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-extrabold tracking-widest text-[var(--foreground)] drop-shadow-sm">
                MYTH
              </Link>
              <span className="text-[var(--muted-foreground)]">/</span>
              <span className="text-[var(--foreground)] font-medium">Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-[var(--muted-foreground)] text-sm">
                Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
              <Link href="/wallet" className="flex items-center gap-2 px-3 py-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6]/20 rounded-lg transition-colors text-sm font-medium">
                <Wallet className="h-3.5 w-3.5" />
                <span>Wallet</span>
              </Link>
              <Link href="/" className="flex items-center gap-2 px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:block">Back to Home</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Your Workspace
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Build, create, and manage your AI-powered websites in one place.
            </p>
          </motion.div>

          {/* Hero Features Row — SaaS Copilot + Drag & Drop Builder */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {heroFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Link href={feature.href} className="block h-full">
                  <div className="h-full bg-[var(--card)]/40 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 md:p-8 hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5 transition-all duration-300 transform group-hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#3b82f6]/10 flex flex-col items-center justify-center text-center py-10">
                    <div className="mb-5 rounded-2xl bg-[var(--background)] border border(--border)] shadow-sm group-hover:scale-110 group-hover:border-[#3b82f6]/30 transition-all duration-300 flex items-center justify-center w-20 h-20">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-[#3b82f6]">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--muted-foreground)] leading-relaxed text-base max-w-sm">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Other Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (index + 2) * 0.1 }}
                className="group col-span-1"
              >
                <Link href={feature.href} className="block h-full">
                  <div className="h-full bg-[var(--card)]/40 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 md:p-8 hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5 transition-all duration-300 transform group-hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#3b82f6]/10 flex flex-col items-start">
                    <div className="mb-5 rounded-2xl bg-[var(--background)] border border-[var(--border)] shadow-sm group-hover:scale-110 group-hover:border-[#3b82f6]/30 transition-all duration-300 flex items-center justify-center w-16 h-16">
                      {feature.icon}
                    </div>
                    <h3 className="text-[var(--foreground)] text-xl group-hover:text-[#3b82f6] transition-colors font-bold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--muted-foreground)] leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>


          {/* Projects Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-[var(--card)]/40 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 md:p-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Your Projects</h2>

              {/* Search and Filter */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-[0.625rem] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'url' | 'prompt' | 'mern')}
                  className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-[0.625rem] text-[var(--foreground)] focus:outline-none focus:border-[#3b82f6] transition-colors"
                >
                  <option value="all">All</option>
                  <option value="url">URL</option>
                  <option value="prompt">Prompt</option>
                  <option value="mern">MERN</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[#3b82f6]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-[#3b82f6]/10`}>
                            {project.type === 'url' ? (
                              <LinkIcon className="h-4 w-4 text-[#3b82f6]" />
                            ) : project.type === 'mern' ? (
                              <Database className="h-4 w-4 text-[#3b82f6]" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
                            )}
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
                            {project.type === 'url' ? 'URL' : project.type === 'mern' ? 'MERN' : 'Prompt'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={deletingId === project.id}
                          className="p-2 text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 truncate" title={project.name}>
                        {project.name}
                      </h3>

                      {project.sourceUrl && (
                        <p className="text-sm text-[var(--muted-foreground)] truncate mb-3" title={project.sourceUrl}>
                          {project.sourceUrl}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(project.updatedAt)}</span>
                        </div>

                        <Link
                          href={project.type === 'mern' ? `/fullstackai?projectId=${project.id}` : `/${project.type}ai?project=${project.id}`}
                          className="flex items-center gap-1 text-sm text-[#3b82f6] hover:text-blue-400 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
                <Code className="h-16 w-16 text-[var(--muted-foreground)]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {searchQuery ? 'No matching projects' : 'No projects yet'}
                </h3>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {searchQuery ? 'Try a different search term.' : 'Start building your first project to see it here.'}
                </p>
                {!searchQuery && (
                  <Link href="/promptai" className="inline-flex items-center gap-2 px-6 py-3 bg-[#3b82f6] text-white rounded-[0.625rem] hover:bg-[#2563eb] transition-all duration-300">
                    <Plus className="h-5 w-5" />
                    Create Your First Project
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}