"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

interface WalletContextType {
    credits: number;
    isLoading: boolean;
    error: string | null;
    transactions: Transaction[];
    refreshWallet: () => Promise<void>;
    deductCredits: (amount: number, description: string) => Promise<boolean>;
    buyCredits: (packId: string) => Promise<void>;
    hasEnoughCredits: (amount: number) => boolean;
}

interface Transaction {
    id: string;
    type: 'purchase' | 'deduction' | 'bonus' | 'refund';
    amount: number;
    balance: number;
    description: string;
    createdAt: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Credit costs for different AI actions
export const CREDIT_COSTS = {
    PROMPT_GENERATION: 10,
    MERN_BUILD: 25,
    CHAT_EDIT: 5,
    SANDBOX_CREATION: 3,
    URL_CLONE: 8,
    DATA_DASHBOARD: 7,
} as const;

// Credit packs for purchase — INR PRICES
export const CREDIT_PACKS = [
    { id: 'starter', name: 'Starter', credits: 500, price: 167, perCredit: '₹0.33', popular: false },
    { id: 'pro', name: 'Pro', credits: 1500, price: 419, perCredit: '₹0.28', popular: true },
    { id: 'power', name: 'Power', credits: 4000, price: 839, perCredit: '₹0.21', popular: false },
];


declare global {
    interface Window {
        Razorpay: any;
    }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    const [credits, setCredits] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshWallet = useCallback(async () => {
        try {
            const res = await fetch('/api/wallet');
            if (!res.ok) throw new Error('Failed to fetch wallet');
            const data = await res.json();
            if (data.success) {
                setCredits(data.wallet.credits);
                setTransactions(data.transactions || []);
                // Show a soft warning if DB was temporarily unavailable (not a hard error)
                if (data.warning) {
                    setError(data.warning);
                } else {
                    setError(null);
                }
            }
        } catch (err) {
            console.error('[Wallet] Error fetching:', err);
            setError('Failed to load wallet');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load wallet when user is authenticated
    useEffect(() => {
        if (isLoaded && user) {
            refreshWallet();
        } else if (isLoaded && !user) {
            setIsLoading(false);
        }
    }, [isLoaded, user, refreshWallet]);

    const hasEnoughCredits = useCallback((amount: number) => {
        return credits >= amount;
    }, [credits]);

    const deductCredits = useCallback(async (amount: number, description: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/wallet/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description }),
            });

            if (res.status === 402) {
                setError('Insufficient credits. Please purchase more.');
                return false;
            }

            if (!res.ok) throw new Error('Deduction failed');

            const data = await res.json();
            if (data.success) {
                setCredits(data.wallet.credits);
                setError(null);
                return true;
            }
            return false;
        } catch (err) {
            console.error('[Wallet] Deduction error:', err);
            setError('Failed to deduct credits');
            return false;
        }
    }, []);

    const buyCredits = useCallback(async (packId: string) => {
        try {
            // Load Razorpay script if not loaded
            if (!window.Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Razorpay'));
                    document.head.appendChild(script);
                });
            }

            // Create order
            const orderRes = await fetch('/api/wallet/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId }),
            });

            if (!orderRes.ok) throw new Error('Failed to create order');
            const { order, pack } = await orderRes.json();

            // Open Razorpay checkout
            return new Promise<void>((resolve, reject) => {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency, // INR
                    name: 'MYTH Credits',
                    description: `${pack.name} — ${pack.credits} credits`,
                    order_id: order.id,
                    config: {
                        display: {
                            // Show all payment methods including international ones
                            hide: [],
                            preferences: {
                                show_default_blocks: true,
                            },
                        },
                    },
                    handler: async (response: any) => {
                        try {
                            // Verify payment
                            const verifyRes = await fetch('/api/wallet/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    packId,
                                    credits: pack.credits,
                                }),
                            });

                            if (!verifyRes.ok) throw new Error('Verification failed');
                            const data = await verifyRes.json();
                            if (data.success) {
                                setCredits(data.wallet.credits);
                                await refreshWallet();
                                resolve();
                            }
                        } catch (err) {
                            reject(err);
                        }
                    },
                    prefill: {
                        name: user?.fullName || '',
                        email: user?.primaryEmailAddress?.emailAddress || '',
                    },
                    theme: {
                        color: '#7c3aed',
                    },
                    modal: {
                        ondismiss: () => resolve(),
                        // Allow closing the modal
                        escape: true,
                        backdropclose: false,
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            });
        } catch (err) {
            console.error('[Wallet] Purchase error:', err);
            setError('Failed to initiate payment');
            throw err;
        }
    }, [user, refreshWallet]);

    const value: WalletContextType = {
        credits,
        isLoading,
        error,
        transactions,
        refreshWallet,
        deductCredits,
        buyCredits,
        hasEnoughCredits,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
