// Design token system for Taste Roulette
// Single source of truth — all visual constants live here

export const colors = {
  // Backgrounds
  bg: '#0F0F1A',
  bgCard: '#1A1A2E',
  bgElevated: 'rgba(255,255,255,0.08)',
  bgOverlay: 'rgba(0,0,0,0.6)',

  // Borders
  border: 'rgba(255,255,255,0.12)',
  borderFocus: 'rgba(255,255,255,0.25)',

  // Brand
  accent: '#6C5CE7',
  accentLight: '#8B7CF0',
  accentDim: 'rgba(108,92,231,0.15)',
  spotify: '#1DB954',
  spotifyDim: 'rgba(29,185,84,0.15)',

  // Semantic
  error: '#E74C3C',
  success: '#2ECC71',
  warning: '#F39C12',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textHint: 'rgba(255,255,255,0.4)',
  textDisabled: 'rgba(255,255,255,0.2)',

  // Feedback reactions
  surprised: '#FF6B6B',
  okay: '#FFD93D',
  notForMe: '#6C757D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  full: 999,
} as const;

export const typo = {
  hero: { fontSize: 32, fontWeight: '800' as const, color: colors.textPrimary },
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.textPrimary },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
  subheading: { fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.textPrimary },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  small: { fontSize: 11, fontWeight: '400' as const, color: colors.textSecondary },
} as const;

export const shadow = {
  card: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  }),
} as const;

export const animation = {
  fast: 200,
  normal: 300,
  slow: 500,
  spring: { damping: 15, stiffness: 120, mass: 1 },
  springBouncy: { damping: 10, stiffness: 150, mass: 0.8 },
} as const;

// Common button styles
export const button = {
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondary: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  text: {
    padding: spacing.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
} as const;

// Common layout helpers
export const layout = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  screenPadding: {
    paddingHorizontal: spacing.xl,
  },
} as const;
