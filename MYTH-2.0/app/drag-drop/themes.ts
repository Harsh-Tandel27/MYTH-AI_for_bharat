/* 6 Premium Theme Definitions for the Drag & Drop Builder */

export interface Theme {
    id: string;
    name: string;
    emoji: string;
    bg: string;        // page background
    bgAlt: string;     // section background
    card: string;      // card background
    border: string;    // border color
    accent: string;    // primary accent (buttons, highlights)
    accentHover: string;
    accentLight: string; // accent at low opacity
    text: string;      // primary text
    muted: string;     // muted/secondary text
    gradient: string;  // hero gradient start
    gradientEnd: string;
}

export const THEMES: Theme[] = [
    {
        id: "midnight",
        name: "Midnight",
        emoji: "🌙",
        bg: "#050505",
        bgAlt: "#0a0a0a",
        card: "#0f0f0f",
        border: "#1f1f1f",
        accent: "#3b82f6",
        accentHover: "#2563eb",
        accentLight: "rgba(59,130,246,0.1)",
        text: "#fafafa",
        muted: "#a3a3a3",
        gradient: "#0a0a1a",
        gradientEnd: "#0f0f2e",
    },
    {
        id: "ocean",
        name: "Ocean",
        emoji: "🌊",
        bg: "#020617",
        bgAlt: "#0f172a",
        card: "#1e293b",
        border: "#334155",
        accent: "#06b6d4",
        accentHover: "#0891b2",
        accentLight: "rgba(6,182,212,0.1)",
        text: "#f1f5f9",
        muted: "#94a3b8",
        gradient: "#0c1426",
        gradientEnd: "#0a1a2e",
    },
    {
        id: "forest",
        name: "Forest",
        emoji: "🌲",
        bg: "#022c22",
        bgAlt: "#052e16",
        card: "#14532d",
        border: "#166534",
        accent: "#22c55e",
        accentHover: "#16a34a",
        accentLight: "rgba(34,197,94,0.1)",
        text: "#f0fdf4",
        muted: "#86efac",
        gradient: "#052e16",
        gradientEnd: "#022c22",
    },
    {
        id: "sunset",
        name: "Sunset",
        emoji: "🌅",
        bg: "#0c0a09",
        bgAlt: "#1c1917",
        card: "#292524",
        border: "#44403c",
        accent: "#f97316",
        accentHover: "#ea580c",
        accentLight: "rgba(249,115,22,0.1)",
        text: "#fafaf9",
        muted: "#a8a29e",
        gradient: "#1a0f0a",
        gradientEnd: "#1c1009",
    },
    {
        id: "rose",
        name: "Rose",
        emoji: "🌹",
        bg: "#0c0a0b",
        bgAlt: "#1a1017",
        card: "#271822",
        border: "#3d1f32",
        accent: "#ec4899",
        accentHover: "#db2777",
        accentLight: "rgba(236,72,153,0.1)",
        text: "#fdf2f8",
        muted: "#c084a0",
        gradient: "#1a0a18",
        gradientEnd: "#1c0c20",
    },
    {
        id: "mono",
        name: "Monochrome",
        emoji: "⬛",
        bg: "#000000",
        bgAlt: "#0a0a0a",
        card: "#171717",
        border: "#262626",
        accent: "#e5e5e5",
        accentHover: "#d4d4d4",
        accentLight: "rgba(229,229,229,0.08)",
        text: "#fafafa",
        muted: "#737373",
        gradient: "#0a0a0a",
        gradientEnd: "#121212",
    },
];

export const DEFAULT_THEME = THEMES[0]; // Midnight
