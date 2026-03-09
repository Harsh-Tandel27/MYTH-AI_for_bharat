'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LS_THEME = 'myth_copilot_theme';

interface ThemeContextValue {
    isDark: boolean;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggle: () => { } });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);

    // Read from localStorage once on mount and apply class
    useEffect(() => {
        const saved = localStorage.getItem(LS_THEME);
        const dark = saved !== 'light';
        setIsDark(dark);
        document.documentElement.classList.toggle('dark', dark);
    }, []);

    const toggle = useCallback(() => {
        setIsDark(prev => {
            const next = !prev;
            document.documentElement.classList.toggle('dark', next);
            localStorage.setItem(LS_THEME, next ? 'dark' : 'light');
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ isDark, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
