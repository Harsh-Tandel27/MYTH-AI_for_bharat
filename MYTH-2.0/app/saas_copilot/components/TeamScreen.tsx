'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Plus, Shield, Crown, Pencil, Code2, Eye,
  Mail, MoreHorizontal, Search, UserPlus,
} from 'lucide-react';
import { mockTeam } from '../lib/data';
import ThemeToggle from './ThemeToggle';

const roleConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  owner: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Crown },
  admin: { color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Shield },
  editor: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Pencil },
  developer: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Code2 },
  viewer: { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Eye },
};

export default function TeamScreen({ onBack }: { onBack: () => void }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="h-screen bg-[#06060a] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"><ArrowLeft size={17} /></button>
          <div className="w-px h-5 bg-white/[0.06]" />
          <Users size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-gray-200">Team Management</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity">
            <UserPlus size={15} /> Invite Member
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {/* Invite bar */}
          {showInvite && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-xl bg-white/[0.03] border border-violet-500/20">
              <p className="text-sm font-medium text-white mb-3">Invite a team member</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 focus-within:border-violet-500/40 transition-colors">
                  <Mail size={15} className="text-gray-600" />
                  <input placeholder="email@example.com" className="bg-transparent flex-1 text-sm text-gray-300 outline-none placeholder-gray-700" />
                </div>
                <select className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none">
                  <option>Editor</option><option>Developer</option><option>Admin</option><option>Viewer</option>
                </select>
                <button className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 transition-opacity">Send Invite</button>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[['Total Members', '5'], ['Active Now', '3'], ['Pending Invites', '1'], ['Roles', '5']].map(([l, v]) => (
              <div key={l} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="text-2xl font-bold text-white">{v}</p>
                <p className="text-xs text-gray-600 mt-1">{l}</p>
              </div>
            ))}
          </div>

          {/* Members list */}
          <div className="space-y-2">
            {mockTeam.map(member => {
              const rc = roleConfig[member.role];
              const RoleIcon = rc.icon;
              return (
                <motion.div key={member.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center text-sm font-medium text-white ring-1 ring-white/10">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      {member.status === 'invited' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Pending</span>}
                    </div>
                    <p className="text-xs text-gray-600">{member.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rc.bg} ${rc.color}`}>
                    <RoleIcon size={11} /> {member.role}
                  </span>
                  <span className="text-xs text-gray-600 w-20 text-right">{member.lastActive}</span>
                  <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-600 hover:text-white transition-colors"><MoreHorizontal size={15} /></button>
                </motion.div>
              );
            })}
          </div>

          {/* Permissions matrix */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-white mb-4">Permissions Matrix</h3>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-white/[0.03]">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Permission</th>
                  {['Owner', 'Admin', 'Editor', 'Developer', 'Viewer'].map(r => <th key={r} className="px-4 py-3 text-gray-400 font-medium text-center">{r}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    ['Create products', [true, true, false, false, false]],
                    ['Edit content', [true, true, true, false, false]],
                    ['Manage code', [true, true, false, true, false]],
                    ['Deploy', [true, true, false, false, false]],
                    ['Manage team', [true, true, false, false, false]],
                    ['View analytics', [true, true, true, true, true]],
                  ].map(([perm, vals]) => (
                    <tr key={perm as string} className="border-t border-white/[0.04]">
                      <td className="px-4 py-3 text-gray-300">{perm as string}</td>
                      {(vals as boolean[]).map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          <span className={v ? 'text-emerald-400' : 'text-gray-700'}>{v ? '✓' : '—'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
