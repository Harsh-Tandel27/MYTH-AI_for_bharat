"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface BillingContextType {
  isBillingEnabled: boolean;
  currentPlan: any;
  availablePlans: any[];
  isLoading: boolean;
  subscribeToPlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateSubscription: (planId: string) => Promise<void>;
  refreshBillingData: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

// Fallback plans data
const fallbackPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'For personal projects & experiments'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10,
    interval: 'month',
    description: 'For professionals & small teams'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contact Us',
    interval: 'month',
    description: 'For large-scale applications'
  }
];

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [isBillingEnabled, setIsBillingEnabled] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>(fallbackPlans);
  const [isLoading, setIsLoading] = useState(true);

  const checkBillingEnabled = async () => {
    try {
      // For now, we'll use fallback data since Clerk billing might not be fully set up
      // You can enable this later when Clerk billing is properly configured
      setIsBillingEnabled(false);
      setAvailablePlans(fallbackPlans);
      
      // TODO: Enable this when Clerk billing is properly configured
      // if (typeof window !== 'undefined' && window.Clerk?.billing) {
      //   setIsBillingEnabled(true);
      //   await refreshBillingData();
      // }
    } catch (error) {
      console.error('Error checking billing:', error);
      setAvailablePlans(fallbackPlans);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBillingData = async () => {
    // For now, just use fallback data
    setAvailablePlans(fallbackPlans);
    setCurrentPlan(null);
  };

  const subscribeToPlan = async (planId: string) => {
    try {
      // For now, redirect to a demo checkout or show a message
      // You can implement actual Clerk billing integration here later
      
      if (planId === 'free') {
        // Free plan - redirect to dashboard
        window.location.href = '/dashboard?plan=free';
        return;
      }
      
      // For paid plans, show a demo message
      alert(`Demo: This would redirect to Clerk billing checkout for ${planId} plan.\n\nTo implement real billing:\n1. Set up Clerk billing in your dashboard\n2. Configure plans and pricing\n3. Enable the billing API calls in this context`);
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw new Error('Billing not available yet. Please contact support.');
    }
  };

  const cancelSubscription = async () => {
    try {
      // For now, just show a demo message
      alert('Demo: This would cancel the subscription through Clerk billing.\n\nTo implement real billing:\n1. Set up Clerk billing in your dashboard\n2. Configure plans and pricing\n3. Enable the billing API calls in this context');
      
      // Simulate cancellation
      setCurrentPlan(null);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Billing not available yet. Please contact support.');
    }
  };

  const updateSubscription = async (planId: string) => {
    try {
      // For now, just show a demo message
      alert(`Demo: This would update the subscription to ${planId} plan through Clerk billing.\n\nTo implement real billing:\n1. Set up Clerk billing in your dashboard\n2. Configure plans and pricing\n3. Enable the billing API calls in this context`);
      
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Billing not available yet. Please contact support.');
    }
  };

  useEffect(() => {
    // Check billing status after a short delay
    const timer = setTimeout(() => {
      checkBillingEnabled();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const value: BillingContextType = {
    isBillingEnabled,
    currentPlan,
    availablePlans,
    isLoading,
    subscribeToPlan,
    cancelSubscription,
    updateSubscription,
    refreshBillingData,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
