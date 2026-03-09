"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useMotionValueEvent,
  Variants,
} from "framer-motion";
import {
  ArrowDownRight,
  Layout,
  MessageSquare,
  Bot,
  Network,
  Database,
  Smartphone,
  BarChart,
  Users,
  GitBranch,
  LayoutGrid,
  BarChart3,
  Rocket,
  Check,
  Star,
  Shield,
  Twitter,
  Github,
  Linkedin,
  Globe,
  Paintbrush,
  Sparkles,
  Zap,
  Menu,
  X,
  ArrowRight,
  Play,
  MousePointer2
} from "lucide-react";
import NextLink from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import Chatbot from "@/components/Chatbot";
import MichiBot from "@/components/MichiBot";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

/* ============================================================
   ANIMATION VARIANTS
   ============================================================ */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

/* ============================================================
   SECTION WRAPPER — fade-in on scroll
   ============================================================ */
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  useEffect(() => {
    // Hide loading screen after 2.5 seconds to ensure resources are ready
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Lock scroll if menu is open or page is loading
    document.body.style.overflow = (menuOpen || isLoading) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, isLoading]);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
    { label: "Testimonials", href: "#testimonials" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[#3b82f6]/20 antialiased overflow-x-hidden">

      {/* ===========================
          LOADING SCREEN
          =========================== */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] bg-[var(--background)] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Space reserved for MichiBot which animates directly from the hero section */}
            <div className="w-48 h-48 sm:w-[500px] sm:h-[500px] mb-8" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex items-center gap-4"
            >
              <span className="text-4xl font-bold tracking-widest text-[var(--foreground)]">MYTH</span>
              <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-ping" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===========================
          NAVIGATION
          =========================== */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
        <nav
          className={`flex items-center justify-between w-full max-w-5xl px-5 py-3 rounded-[0.625rem] transition-all duration-300 ${scrolled
            ? "bg-[var(--background)]/80 backdrop-blur-xl border border-[var(--border)]"
            : "bg-transparent border border-transparent"
            }`}
        >
          <span className="text-lg font-bold tracking-wider">MYTH</span>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <AnimatedThemeToggler />

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm text-[var(--muted-foreground)]">
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 border border-[var(--border)]",
                      userButtonPopoverCard: "bg-[var(--card)] border border-[var(--border)]",
                      userButtonPopoverActionButton: "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]",
                      userButtonPopoverActionButtonText: "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                      userButtonPopoverFooter: "hidden",
                    },
                  }}
                />
              </div>
            ) : (
              <NextLink href="/sign-up">
                <button className="hidden sm:inline-flex items-center gap-1.5 rounded-[0.625rem] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors duration-200">
                  Get Started
                </button>
              </NextLink>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--background)]/95 backdrop-blur-xl flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-bold tracking-wider">MYTH</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-white" aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center flex-grow gap-8">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl text-[var(--muted-foreground)] hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <NextLink href={isSignedIn ? "/dashboard" : "/sign-up"} onClick={() => setMenuOpen(false)}>
                <button className="mt-4 inline-flex items-center gap-2 rounded-[0.625rem] bg-[#3b82f6] px-8 py-3 text-base font-medium text-white hover:bg-[#2563eb] transition-colors">
                  {isSignedIn ? "Dashboard" : "Get Started"}
                </button>
              </NextLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* ===========================
            HERO
            =========================== */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 px-4">
          {/* WebGL Shader background */}
          <div className="absolute inset-0 z-0">
            <ShaderAnimation />
            <div className="absolute inset-0 bg-[var(--background)]/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_75%)]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-1.5 text-xs font-medium text-[#3b82f6]">
                <Zap className="h-3 w-3" />
                AI-Powered Development
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-balance mb-6"
            >
              Build Websites at the
              <br />
              Speed of Thought
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed mb-10"
            >
              Transform any URL, Figma design, or simple text prompt into clean,
              production-ready code. MYTH is your AI co-pilot for modern web
              development.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12 relative z-20"
            >
              <NextLink href={isSignedIn ? "/dashboard" : "/sign-up"}>
                <button className="inline-flex items-center gap-2 rounded-[0.625rem] bg-[#3b82f6] px-7 py-3 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors duration-200 shadow-[0_0_24px_rgba(59,130,246,0.25)]">
                  {isSignedIn ? "Go to Dashboard" : "Start Building Free"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </NextLink>
              <button className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[var(--border)] bg-[var(--background)] px-7 py-3 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#3b82f6]/40 transition-all duration-200">
                <Play className="h-4 w-4" />
                Watch Demo
              </button>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="flex items-center justify-center gap-3"
            >
              <div className="flex -space-x-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[#050505] bg-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--muted-foreground)]"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-[var(--muted-foreground)]">
                Trusted by <span className="text-[var(--muted-foreground)] font-medium">10,000+</span> developers
              </span>
            </motion.div>
          </div>

          {/* MichiBot Transitioning 3D Component */}
          <motion.div
            initial={{ x: "-50%", y: "-60%", scale: 1.4, zIndex: 201 }}
            animate={
              isLoading
                ? { x: "-50%", y: "-60%", scale: 1.4, zIndex: 201 }
                : { x: "20vw", y: "-50%", scale: 1, transitionEnd: { zIndex: 20 } }
            }
            transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1], delay: isLoading ? 0 : 0.2 }}
            className="hidden lg:block absolute left-1/2 top-1/2 pointer-events-none w-[500px] h-[500px]"
          >
            <MichiBot />
          </motion.div>
        </section>

        {/* ===========================
            LOGO CLOUD
            =========================== */}
        <div className="relative py-12 overflow-hidden border-y border-[var(--border)]">
          <div
            className="absolute inset-y-0 left-0 w-24 z-10"
            style={{ background: "linear-gradient(to right, #050505, transparent)" }}
          />
          <div
            className="absolute inset-y-0 right-0 w-24 z-10"
            style={{ background: "linear-gradient(to left, #050505, transparent)" }}
          />
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-16 mx-8">
                {["Vercel", "Stripe", "Figma", "Linear", "Notion", "Shopify", "GitHub", "Supabase"].map((name) => (
                  <span key={`${setIdx}-${name}`} className="text-lg font-semibold text-[#373737] select-none">
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ===========================
            BUILDER CARDS
            =========================== */}
        <Section id="builders" className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                The Ultimate AI Builder Suite
              </h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                Every path leads to production-ready code. Choose the workflow that fits your project.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                // {
                //   Icon: Bot,
                //   title: "SaaS Copilot",
                //   desc: "Your AI companion for building full-stack applications. Chat, generate, and deploy instantly.",
                //   href: isSignedIn ? "/copilot" : "/sign-up",
                //   isPrimary: true,
                // },
                {
                  Icon: Network,
                  title: "Agent AI",
                  desc: "Build autonomous AI agents using a professional node-based canvas.",
                  href: isSignedIn ? "/agentai" : "/sign-up",
                  isPrimary: true,
                },
                {
                  Icon: Database,
                  title: "Full-Stack MERN",
                  desc: "Multi-Sandbox Provisioning. Atlas-on-the-Fly. Coherence Guard.",
                  href: isSignedIn ? "/fullstackai" : "/sign-up",
                },
                {
                  Icon: Smartphone,
                  title: "Application AI",
                  desc: "The ultimate React Native Expo app builder for mobile-first engineering.",
                  href: isSignedIn ? "/applicationai" : "/sign-up",
                },
                {
                  Icon: BarChart,
                  title: "Data Insight (Streamlit)",
                  desc: "Python Sandboxing with automated Streamlit installation and execution.",
                  href: isSignedIn ? "/datatodashboardai" : "/sign-up",
                },
                {
                  Icon: MessageSquare,
                  title: "Prompt to Code",
                  desc: "High-speed React application generation from natural language prompts.",
                  href: isSignedIn ? "/promptai" : "/sign-up",
                },
                {
                  Icon: Globe,
                  title: "URL AI",
                  desc: "Clone and transform existing websites instantly.",
                  href: isSignedIn ? "/urlai" : "/sign-up",
                },
                {
                  Icon: MousePointer2,
                  title: "Drag Drop AI",
                  desc: "No-code visual builder with drag and drop interactivity.",
                  href: isSignedIn ? "/dragdrop" : "/sign-up",
                },
              ].map((card, i) => (
                <motion.a
                  key={card.title}
                  href={card.href}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  whileHover={{ y: -4 }}
                  className={`group block rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] hover:border-[#3b82f6]/50 transition-all duration-300 ${card.isPrimary ? "md:col-span-3 flex flex-col md:flex-row items-center text-center md:text-left gap-8 p-8 sm:p-12 hover:bg-[#3b82f6]/5 hover:shadow-2xl hover:shadow-[#3b82f6]/10" : "p-8"}`}
                >
                  <div className={`rounded-[0.625rem] bg-[var(--secondary)] border border-[var(--border)] flex items-center justify-center ${card.isPrimary ? "mb-0 shrink-0 w-24 h-24" : "mb-6 w-12 h-12"} group-hover:border-[#3b82f6]/40 transition-colors duration-300`}>
                    <card.Icon className={`${card.isPrimary ? "h-12 w-12" : "h-5 w-5"} text-[#3b82f6]`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${card.isPrimary ? "text-2xl sm:text-3xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-[#3b82f6]" : "text-lg mb-2"}`}>{card.title}</h3>
                    <p className={`text-[var(--muted-foreground)] leading-relaxed ${card.isPrimary ? "text-lg sm:text-xl max-w-2xl" : "text-sm"}`}>{card.desc}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </Section>

        {/* ===========================
            CAPABILITIES
            =========================== */}
        <Section className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-xs font-medium text-[#3b82f6] uppercase tracking-widest">
                Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-5">
                Everything You Need to Ship Faster
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed mb-8 max-w-md">
                MYTH combines intelligent code generation, real-time collaboration, and powerful
                deployment tools into one seamless platform built for speed.
              </p>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium"
              >
                See all features <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { value: "10x", label: "Faster", desc: "Than traditional development" },
                { value: "99.9%", label: "Uptime", desc: "Enterprise-grade reliability" },
                { value: "50+", label: "Frameworks", desc: "React, Vue, Svelte & more" },
                { value: "SOC2", label: "Security", desc: "Enterprise-grade security" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-6 hover:border-[#3b82f6]/30 transition-colors duration-300"
                >
                  <p className="text-2xl sm:text-3xl font-bold text-[#3b82f6] mb-1">{s.value}</p>
                  <p className="text-sm font-semibold mb-1">{s.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===========================
            HOW IT WORKS
            =========================== */}
        <Section className="py-24 sm:py-32 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                How It Works
              </h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                Three simple steps to go from idea to code.
              </p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {/* Connecting dashed lines (desktop only) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px border-t border-dashed border-[var(--border)]" />

              {[
                { step: "01", title: "Choose Your Input", desc: "URL, design file, or text prompt — pick your starting point." },
                { step: "02", title: "AI Processes", desc: "MYTH analyzes your input and generates optimized, clean code." },
                { step: "03", title: "Ship It", desc: "Export, deploy, or integrate directly into your workflow." },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="relative text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5 text-[#3b82f6] font-bold text-sm relative z-10">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] max-w-[260px] mx-auto leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===========================
            FEATURES — BENTO GRID
            =========================== */}
        <Section id="features" className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <span className="text-xs font-medium text-[#3b82f6] uppercase tracking-widest">
                Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3">
                Powerful Features for Modern Teams
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { Icon: Sparkles, title: "AI Code Generation", desc: "Intelligent code generation that understands context, patterns, and best practices to produce clean, maintainable code.", span: "md:col-span-2" },
                { Icon: Users, title: "Real-time Collaboration", desc: "Live multiplayer editing with your team. See changes instantly.", span: "" },
                { Icon: GitBranch, title: "Version Control", desc: "Built-in versioning with branching, merging, and rollback support.", span: "" },
                { Icon: LayoutGrid, title: "Component Library", desc: "Access pre-built, customizable components for rapid development.", span: "" },
                { Icon: BarChart3, title: "Performance Analytics", desc: "Built-in analytics to measure page load, core web vitals, and SEO.", span: "" },
                { Icon: Rocket, title: "Deploy Anywhere", desc: "One-click deployment to Vercel, Netlify, AWS, or any platform. CI/CD pipelines built in.", span: "md:col-span-2" },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  whileHover={{ y: -4 }}
                  className={`rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-7 hover:border-[#3b82f6]/40 transition-all duration-300 ${f.span}`}
                >
                  <div className="w-10 h-10 rounded-[0.625rem] bg-[var(--secondary)] border border-[var(--border)] flex items-center justify-center mb-5">
                    <f.Icon className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===========================
            ABOUT / STATS
            =========================== */}
        <Section id="about" className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-[#3b82f6] uppercase tracking-widest">
                  About
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-5">
                  Built for the Future of Development
                </h2>
                <p className="text-[var(--muted-foreground)] leading-relaxed mb-8">
                  MYTH was born from a simple question: what if design could instantly become code?
                  We believe creativity shouldn&apos;t be bottlenecked by implementation. Our mission is
                  to empower every developer and team to ship stunning, production-ready interfaces
                  in minutes — not weeks.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { val: "10M+", label: "Lines Generated" },
                  { val: "150+", label: "Countries" },
                  { val: "∞", label: "Possibilities" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-4 text-center"
                  >
                    <p className="text-xl sm:text-2xl font-bold text-[#3b82f6]">{s.val}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-8 sm:p-10 flex flex-col justify-center border-l-2 border-l-[#3b82f6]">
              <p className="text-xl sm:text-2xl font-bold leading-snug mb-6">
                &ldquo;We&apos;re not just building a tool — we&apos;re redefining the relationship between
                developers and the code they create.&rdquo;
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">— The MYTH Team</p>
            </div>
          </div>
        </Section>

        {/* ===========================
            PRICING
            =========================== */}
        <Section id="pricing" className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                Pay once, use forever. Buy AI credits and spend them on any builder — no subscriptions, no surprises.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Starter */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0}
                className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-8 hover:border-[#3b82f6]/30 transition-colors duration-300"
              >
                <h3 className="text-lg font-semibold mb-1">Starter</h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-6">For personal projects</p>
                <p className="text-4xl font-bold mb-1">
                  ₹167 <span className="text-base font-normal text-[var(--muted-foreground)]">one-time</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5 mt-2">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  500 credits included
                </p>
                <ul className="mt-8 space-y-3 text-sm text-[var(--muted-foreground)]">
                  {["500 AI Credits", "Prompt-to-website generation", "GSAP animation builder", "Community support"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#3b82f6] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <NextLink
                  href="/pricing"
                  className="block w-full text-center rounded-[0.625rem] border border-[var(--border)] py-2.5 mt-8 text-sm font-medium text-[var(--muted-foreground)] hover:text-white hover:border-[#3b82f6]/50 transition-all duration-200"
                >
                  Buy Starter
                </NextLink>
              </motion.div>

              {/* Pro */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={1}
                className="rounded-[0.625rem] bg-[var(--card)] border-2 border-[#3b82f6] p-8 relative shadow-[0_0_40px_rgba(59,130,246,0.08)]"
              >
                <span className="absolute -top-3 right-6 bg-[#3b82f6] text-white text-[11px] font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
                <h3 className="text-lg font-semibold mb-1">Pro</h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-6">For professionals &amp; teams</p>
                <p className="text-4xl font-bold mb-1">
                  ₹419 <span className="text-base font-normal text-[var(--muted-foreground)]">one-time</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5 mt-2">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  1,500 credits included
                </p>
                <ul className="mt-8 space-y-3 text-sm text-[var(--muted-foreground)]">
                  {[
                    "1,500 AI Credits",
                    "Everything in Starter",
                    "MERN stack generation",
                    "URL cloning",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#3b82f6] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <NextLink
                  href="/pricing"
                  className="block w-full text-center rounded-[0.625rem] bg-[#3b82f6] py-2.5 mt-8 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors duration-200"
                >
                  Buy Pro
                </NextLink>
              </motion.div>

              {/* Power */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={2}
                className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-8 hover:border-[#3b82f6]/30 transition-colors duration-300"
              >
                <h3 className="text-lg font-semibold mb-1">Power</h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-6">For large-scale applications</p>
                <p className="text-4xl font-bold mb-1">
                  ₹839 <span className="text-base font-normal text-[var(--muted-foreground)]">one-time</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5 mt-2">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  4,000 credits included
                </p>
                <ul className="mt-8 space-y-3 text-sm text-[var(--muted-foreground)]">
                  {[
                    "4,000 AI Credits",
                    "Everything in Pro",
                    "Unlimited sandbox creation",
                    "Data dashboard generation",
                    "Early access to new features",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#3b82f6] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <NextLink
                  href="/pricing"
                  className="block w-full text-center rounded-[0.625rem] border border-[var(--border)] py-2.5 mt-8 text-sm font-medium text-[var(--muted-foreground)] hover:text-white hover:border-[#3b82f6]/50 transition-all duration-200"
                >
                  Buy Power
                </NextLink>
              </motion.div>
            </div>
          </div>
        </Section>


        {/* ===========================
            TESTIMONIALS
            =========================== */}
        <Section id="testimonials" className="py-24 sm:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Loved by Developers
              </h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                See what developers and teams are saying about MYTH.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "MYTH turned our week-long landing page build into a single afternoon. The code quality is shockingly clean.",
                  name: "Sarah K.",
                  role: "Lead Frontend Dev, Innovate Co.",
                },
                {
                  quote: "As a designer, this is the tool I've been dreaming of. Figma to code in seconds — perfectly responsive.",
                  name: "Michael B.",
                  role: "Product Designer, QuantumLeap",
                },
                {
                  quote: "The speed is unreal. We use MYTH for initial scaffolding and it's saved us hundreds of hours.",
                  name: "Chen W.",
                  role: "Engineering Manager, DataSphere",
                },
              ].map((t, i) => (
                <motion.div
                  key={t.name}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] p-7"
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
                    <div className="w-9 h-9 rounded-full bg-[var(--secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)]">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===========================
            CTA
            =========================== */}
        <Section className="py-24 sm:py-32 px-4">
          <div className="max-w-3xl mx-auto text-center relative">
            {/* Subtle blue glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_60%)] pointer-events-none" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 relative">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-[var(--muted-foreground)] mb-10 max-w-lg mx-auto relative">
              Join thousands of developers and teams shipping faster with MYTH.
              Start building for free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <NextLink href={isSignedIn ? "/dashboard" : "/sign-up"}>
                <button className="inline-flex items-center gap-2 rounded-[0.625rem] bg-[#3b82f6] px-7 py-3 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors shadow-[0_0_24px_rgba(59,130,246,0.25)]">
                  {isSignedIn ? "Go to Dashboard" : "Start Building Free"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </NextLink>
              <button className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[var(--border)] bg-transparent px-7 py-3 text-sm font-medium text-[var(--muted-foreground)] hover:text-white hover:border-[#3b82f6]/40 transition-all duration-200">
                Schedule Demo
              </button>
            </div>
          </div>
        </Section>
      </main>

      {/* ===========================
          FOOTER
          =========================== */}
      <footer className="border-t border-[var(--border)] mt-8">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-lg font-bold tracking-wider block mb-3">MYTH</span>
              <p className="text-sm text-[var(--muted-foreground)] mb-5">The Smith of Web</p>
              <div className="flex gap-3">
                {[Twitter, Github, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-[0.625rem] bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-white hover:border-[#3b82f6]/40 transition-all duration-200"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-[var(--muted-foreground)]">
                {["Features", "Pricing", "Changelog", "Integrations"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-[var(--foreground)] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-[var(--muted-foreground)]">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-[var(--foreground)] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm text-[var(--muted-foreground)]">
                {["Privacy", "Terms", "Security", "License"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-[var(--foreground)] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[var(--muted-foreground)]">
            <p>&copy; {new Date().getFullYear()} MYTH. All rights reserved.</p>
            <p>Built with MYTH</p>
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}