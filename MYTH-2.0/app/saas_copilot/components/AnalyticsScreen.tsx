'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft, BarChart3, TrendingUp, Eye as EyeIcon, Users, Clock,
  HardDrive, Cpu, Zap, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const trafficData = [40, 55, 38, 72, 85, 60, 90, 78, 95, 88, 76, 110];
const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

function MiniBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-[3px] h-16">
      {values.map((v, i) => (
        <div key={i} className={`flex-1 rounded-sm ${color} transition-all hover:opacity-80`}
          style={{ height: `${(v / max) * 100}%`, minWidth: 6 }} />
      ))}
    </div>
  );
}

export default function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"><ArrowLeft size={17} /></button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <BarChart3 size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-gray-200">Analytics & Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-gray-400 outline-none">
            <option>Last 30 days</option><option>Last 7 days</option><option>Last 90 days</option>
          </select>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Page Views', value: '24.8K', change: '+12%', icon: EyeIcon, gradient: 'from-blue-500 to-cyan-400' },
              { label: 'Unique Visitors', value: '8,412', change: '+8%', icon: Users, gradient: 'from-violet-500 to-purple-400' },
              { label: 'Avg Session', value: '3m 42s', change: '+5%', icon: Clock, gradient: 'from-emerald-500 to-green-400' },
              { label: 'Bounce Rate', value: '34.2%', change: '-3%', icon: TrendingUp, gradient: 'from-amber-500 to-orange-400' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <s.icon size={16} className="text-white" />
                  </div>
                  <span className={`text-xs font-medium ${s.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-0.5`}>
                    <ArrowUpRight size={11} /> {s.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Traffic chart */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <h3 className="text-sm font-medium text-gray-300 mb-1">Traffic Overview</h3>
              <p className="text-xs text-gray-600 mb-5">Monthly page views across all products</p>
              <MiniBar values={trafficData} color="bg-violet-500/70" />
              <div className="flex justify-between mt-2">
                {months.map(m => <span key={m} className="text-[10px] text-gray-700">{m}</span>)}
              </div>
            </div>

            {/* Resource usage */}
            <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <h3 className="text-sm font-medium text-gray-300 mb-5">Resource Usage</h3>
              <div className="space-y-5">
                {[
                  { label: 'Storage', used: 2.4, limit: 10, unit: 'GB', icon: HardDrive, color: 'bg-blue-500' },
                  { label: 'AI Credits', used: 187, limit: 500, unit: 'uses', icon: Cpu, color: 'bg-violet-500' },
                  { label: 'Bandwidth', used: 45, limit: 100, unit: 'GB', icon: Zap, color: 'bg-emerald-500' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-gray-400"><r.icon size={13} /> {r.label}</div>
                      <span className="text-xs text-gray-500">{r.used}/{r.limit} {r.unit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.used / r.limit) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-product breakdown */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-gray-300">Product Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-t border-white/[0.04]">
                <th className="text-left px-5 py-3 text-xs text-gray-600 font-medium">Product</th>
                <th className="px-5 py-3 text-xs text-gray-600 font-medium text-right">Views</th>
                <th className="px-5 py-3 text-xs text-gray-600 font-medium text-right">Visitors</th>
                <th className="px-5 py-3 text-xs text-gray-600 font-medium text-right">Bounce</th>
                <th className="px-5 py-3 text-xs text-gray-600 font-medium text-right">Avg Time</th>
              </tr></thead>
              <tbody>
                {[
                  ['Acme Landing Page', '12,450', '4,280', '28%', '4m 12s'],
                  ['Acme Store', '8,320', '2,810', '32%', '3m 45s'],
                  ['Analytics Dashboard', '3,100', '980', '18%', '8m 20s'],
                  ['Support Bot Agent', '920', '342', '45%', '1m 30s'],
                ].map(([name, ...vals]) => (
                  <tr key={name} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-gray-300 font-medium">{name}</td>
                    {vals.map((v, i) => <td key={i} className="px-5 py-3 text-gray-500 text-right">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
