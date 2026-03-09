'use client';

import { useUser } from '@clerk/nextjs';
import { useWallet, CREDIT_PACKS, CREDIT_COSTS } from '@/lib/wallet-context';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Wallet, Zap, TrendingUp, TrendingDown, Gift,
    CreditCard, Sparkles, ArrowUpRight, ArrowDownRight, Clock,
    ChevronRight, Shield, Loader2
} from 'lucide-react';
import { useState } from 'react';

export default function WalletPage() {
    const { user, isLoaded } = useUser();
    const { credits, isLoading, transactions, buyCredits, error } = useWallet();
    const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);

    const handleBuyCredits = async (packId: string) => {
        setPurchaseLoading(packId);
        setPurchaseSuccess(false);
        try {
            await buyCredits(packId);
            setPurchaseSuccess(true);
            setTimeout(() => setPurchaseSuccess(false), 3000);
        } catch (err) {
            console.error('Purchase failed:', err);
        } finally {
            setPurchaseLoading(null);
        }
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-gray-400">Loading wallet...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="text-center">
                    <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Sign in to access your wallet</h1>
                    <p className="text-gray-400 mb-6">You need to be signed in to view your credits</p>
                    <Link href="/sign-in" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'purchase': return <ArrowUpRight className="h-4 w-4 text-green-400" />;
            case 'deduction': return <ArrowDownRight className="h-4 w-4 text-red-400" />;
            case 'bonus': return <Gift className="h-4 w-4 text-purple-400" />;
            case 'refund': return <ArrowUpRight className="h-4 w-4 text-yellow-400" />;
            default: return <Zap className="h-4 w-4 text-gray-400" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'purchase': return 'text-green-400';
            case 'deduction': return 'text-red-400';
            case 'bonus': return 'text-purple-400';
            case 'refund': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-blue-500/20">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12)_0%,transparent_60%)] pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Wallet</h1>
                            <p className="text-sm text-gray-500">Manage your MYTH credits</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <Shield className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-gray-400">Razorpay Secured</span>
                    </div>
                </header>

                {/* Success Toast */}
                <AnimatePresence>
                    {purchaseSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-green-500/15 border border-green-500/30 rounded-xl backdrop-blur-xl"
                        >
                            <Sparkles className="h-5 w-5 text-green-400" />
                            <span className="text-green-300 font-medium">Credits added successfully!</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-white/10 rounded-2xl p-6 sm:p-8 mb-8"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Wallet className="h-4 w-4" />
                            <span className="text-sm font-medium uppercase tracking-wider">Available Credits</span>
                        </div>
                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-5xl sm:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                {credits.toLocaleString()}
                            </span>
                            <span className="text-xl text-gray-500 mb-2">credits</span>
                        </div>

                        {error && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">
                                {error}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Credit Packs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        <h2 className="text-lg font-bold">Buy Credits</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {CREDIT_PACKS.map((pack, i) => (
                            <motion.div
                                key={pack.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 + i * 0.05 }}
                                className={`relative group bg-white/[0.03] border rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 ${pack.popular ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-white/10'
                                    }`}
                            >
                                {pack.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-white">{pack.name}</h3>
                                    <p className="text-sm text-gray-500">{pack.perCredit} / credit</p>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">₹{pack.price}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Zap className="h-3.5 w-3.5 text-yellow-400" />
                                        <span className="text-sm text-gray-400">{pack.credits.toLocaleString()} credits</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleBuyCredits(pack.id)}
                                    disabled={!!purchaseLoading}
                                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${pack.popular
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/10 hover:bg-white/15 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {purchaseLoading === pack.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Buy Now
                                            <ChevronRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Credit Costs Reference */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <h2 className="text-lg font-bold">Credit Costs</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(CREDIT_COSTS).map(([key, cost]) => (
                            <div key={key} className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl">
                                <span className="text-sm text-gray-400">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-sm font-bold text-white">{cost} cr</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Transaction History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-bold">Transaction History</h2>
                    </div>

                    {transactions.length > 0 ? (
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                            {transactions.map((txn, i) => (
                                <div
                                    key={txn.id}
                                    className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.03] ${i < transactions.length - 1 ? 'border-b border-white/5' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg">
                                            {getTransactionIcon(txn.type)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{txn.description}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${getTransactionColor(txn.type)}`}>
                                            {txn.amount > 0 ? '+' : ''}{txn.amount}
                                        </p>
                                        <p className="text-xs text-gray-500">Balance: {txn.balance}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-2xl">
                            <TrendingUp className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No transactions yet</p>
                            <p className="text-sm text-gray-600">Your credit history will appear here</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
