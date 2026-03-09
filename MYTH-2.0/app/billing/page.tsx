"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, Settings, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useBilling } from '@/lib/billing-context';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function BillingPage() {
  const { currentPlan, availablePlans, cancelSubscription, updateSubscription, isLoading } = useBilling();
  const { user } = useUser();
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);
      await cancelSubscription();
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      await updateSubscription(planId);
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-indigo-900/20" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Billing & Subscription</h1>
          <p className="text-gray-400">Manage your subscription and billing information</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-950/50 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">Current Plan</h2>
              
              {currentPlan ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{currentPlan.planName}</h3>
                      <p className="text-gray-400">${currentPlan.price}/{currentPlan.interval}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Status</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-purple-400" />
                        <span className="text-gray-400 text-sm">Next Billing</span>
                      </div>
                      <p className="text-white font-medium">
                        {new Date(currentPlan.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="h-5 w-5 text-purple-400" />
                        <span className="text-gray-400 text-sm">Payment Method</span>
                      </div>
                      <p className="text-white font-medium">•••• •••• •••• ••••</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-6 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                    >
                      Cancel Subscription
                    </button>
                    
                    <Link
                      href="/pricing"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-300"
                    >
                      Change Plan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Subscription</h3>
                  <p className="text-gray-400 mb-6">You don't have an active subscription yet.</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300"
                  >
                    View Plans
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Available Plans */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-gray-950/50 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Available Plans</h3>
              <div className="space-y-4">
                {availablePlans
                  .filter(plan => plan.id !== currentPlan?.planId)
                  .map((plan) => (
                    <div key={plan.id} className="p-4 bg-gray-900/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{plan.name}</h4>
                        <span className="text-purple-400 font-semibold">${plan.price}</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{plan.description}</p>
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Upgrade
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Billing History */}
        {currentPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12"
          >
            <div className="bg-gray-950/50 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">Billing History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 px-4 text-white">
                        {new Date(currentPlan.currentPeriodStart).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white">{currentPlan.planName} Subscription</td>
                      <td className="py-3 px-4 text-white">${currentPlan.price}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Paid
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-950 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Cancel Subscription</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
