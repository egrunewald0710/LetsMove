export const colors = {
  teal: '#1BC4A8',
  blue: '#1E7AF5',
  navy: '#111827',
  bg: '#F7F9FC',
  card: '#FFFFFF',
  border: '#E5E9F0',
  text: '#111827',
  textMuted: '#6B7280',
  danger: '#EF4444',
  success: '#22C55E',
  swim: '#1BC4A8',
  bike: '#1E7AF5',
  run: '#F59E0B',
  gym: '#8B5CF6',
  brick: '#EC4899',
  rest: '#9CA3AF',
};

export const sportColor = (sport: string) => (colors as Record<string, string>)[sport] ?? colors.blue;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
