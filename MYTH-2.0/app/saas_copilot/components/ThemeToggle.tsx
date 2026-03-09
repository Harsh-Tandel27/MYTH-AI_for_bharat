'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme-context';

/**
 * Drop this into any screen header to get a consistent dark/light toggle.
 * It reads and writes theme state through ThemeContext so all screens stay in sync.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
    const { isDark, toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400
        hover:text-white hover:bg-white/[0.08] hover:border-white/[0.14] transition-all
        dark:text-gray-400 dark:hover:text-white ${className}`}
        >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
}
