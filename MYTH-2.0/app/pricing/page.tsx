"use client";

import { motion } from "framer-motion";
import { useWallet, CREDIT_PACKS, CREDIT_COSTS } from "@/lib/wallet-context";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import {
  Zap,
  Shield,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Star,
  Lock,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

const FEATURES: Record<string, string[]> = {
  starter: [
    "500 AI Credits",
    "Prompt-to-website generation",
    "GSAP animation builder",
    "Community support",
  ],
  pro: [
    "1,500 AI Credits",
    "Everything in Starter",
    "MERN stack generation",
    "URL cloning",
    "Priority support",
  ],
  power: [
    "4,000 AI Credits",
    "Everything in Pro",
    "Unlimited sandbox creation",
    "Data dashboard generation",
    "Early access to new features",
  ],
};

export default function PricingPage() {
  const { user, isLoaded } = useUser();
  const { buyCredits, error } = useWallet();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const handleBuyCredits = async (packId: string) => {
    if (!user) return;
    setPurchaseLoading(packId);
    setPurchaseSuccess(false);
    try {
      await buyCredits(packId);
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 4000);
    } catch (err) {
      console.error("Purchase failed:", err);
    } finally {
      setPurchaseLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src="/background-video2.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/25 via-black to-indigo-900/25 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,255,0.18),transparent)] pointer-events-none" />

      {/* Animated orbs */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />

      {/* Success Toast */}
      <AnimatePresence>
        {purchaseSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-green-500/15 border border-green-500/30 rounded-2xl backdrop-blur-xl shadow-2xl"
          >
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="text-green-300 font-semibold">Credits added successfully! 🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-full text-purple-300 text-sm font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Pay-as-you-go AI Credits
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-blue-300 to-indigo-300 text-transparent bg-clip-text mb-5">
            Power Up Your Builds
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Buy credits once, use them forever. No subscriptions, no surprises — just pure AI-powered creation.
          </p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 max-w-md mx-auto text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4"
          >
            {error}
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 mb-16">
          {CREDIT_PACKS.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${pack.popular
                ? "bg-gradient-to-b from-purple-900/40 to-blue-900/20 border-2 border-purple-500/50 ring-1 ring-purple-500/20 scale-[1.03] shadow-2xl shadow-purple-500/15"
                : "bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                } hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Popular badge */}
              {pack.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/30">
                  <Star className="h-3 w-3 fill-white" />
                  Most Popular
                </div>
              )}

              {/* Plan name & price */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">{pack.name}</h2>
                <p className="text-xs text-gray-500">{pack.perCredit} per credit</p>
              </div>

              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-white">₹{pack.price}</span>
                <span className="text-gray-500 mb-1 text-sm">one-time</span>
              </div>
              <div className="flex items-center gap-1.5 mb-6">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-300">{pack.credits.toLocaleString()} credits included</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {FEATURES[pack.id]?.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {user ? (
                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  disabled={!!purchaseLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${pack.popular
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/10 hover:bg-white/15 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {purchaseLoading === pack.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Buy {pack.name}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all duration-200 ${pack.popular
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/10 hover:bg-white/15 text-white"
                    }`}
                >
                  <Lock className="h-4 w-4" />
                  Sign In to Buy
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Credit Costs Section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-16"
        >
          <h3 className="text-center text-xl font-bold text-white mb-2">How credits are used</h3>
          <p className="text-center text-sm text-gray-500 mb-7">
            Each AI action costs a set number of credits from your balance.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {Object.entries(CREDIT_COSTS).map(([key, cost]) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl"
              >
                <span className="text-sm text-gray-400">
                  {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-400" />
                  {cost}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span>Secured by Razorpay</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <span>Credits never expire</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span>Instant top-up after payment</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
