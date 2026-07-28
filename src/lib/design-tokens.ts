/**
 * PingOf design tokens — extracted from tasarim.html
 * Source of truth for colors, typography, spacing, radii, shadows, and layout.
 * Tailwind theme mapping lives in src/app/globals.css (@theme inline).
 */

export const colors = {
  bg: {
    900: "#0a0b0f",
    800: "#0f1117",
    700: "#14161e",
    600: "#1a1d27",
    500: "#21253a",
    card: "rgba(255,255,255,0.04)",
    cardHover: "rgba(255,255,255,0.07)",
  },
  accent: {
    DEFAULT: "#6366f1",
    light: "#818cf8",
    dark: "#4f46e5",
    glow: "rgba(99,102,241,0.3)",
  },
  green: {
    DEFAULT: "#10b981",
    light: "#34d399",
    glow: "rgba(16,185,129,0.25)",
  },
  red: {
    DEFAULT: "#f43f5e",
    light: "#fb7185",
  },
  orange: {
    DEFAULT: "#f97316",
    light: "#fb923c",
  },
  yellow: "#eab308",
  purple: "#a855f7",
  pink: "#ec4899",
  text: {
    primary: "#f1f5f9",
    secondary: "#94a3b8",
    muted: "#475569",
    accent: "#818cf8",
  },
  border: {
    DEFAULT: "rgba(255,255,255,0.08)",
    active: "rgba(255,255,255,0.18)",
  },
  rank: {
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
  },
} as const;

export const typography = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontFamilyMono: "'SF Mono', 'Fira Code', monospace",
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "0.9375rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.75rem",
    "3xl": "2.5rem",
  },
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

export const spacing = {
  page: "24px",
  card: "20px",
  cardSm: "14px 16px",
  gap: {
    2: "8px",
    3: "12px",
    4: "16px",
    6: "24px",
  },
  containerMax: "1200px",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.4)",
  md: "0 4px 16px rgba(0,0,0,0.4)",
  lg: "0 8px 32px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(99,102,241,0.3)",
} as const;

export const layout = {
  navWidth: "240px",
  navHeight: "72px",
  touchTarget: "44px",
  breakpoints: {
    mobile: "375px",
    tablet: "768px",
    desktop: "1024px",
  },
} as const;

export const transitions = {
  DEFAULT: "0.2s cubic-bezier(0.4,0,0.2,1)",
  slow: "0.4s cubic-bezier(0.4,0,0.2,1)",
} as const;

/** Avatar gradient palette used across the app */
export const avatarColors = [
  "#6366f1",
  "#f97316",
  "#10b981",
  "#ec4899",
  "#eab308",
  "#a855f7",
  "#06b6d4",
  "#f43f5e",
] as const;

export const designTokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  layout,
  transitions,
  avatarColors,
} as const;

export type DesignTokens = typeof designTokens;
