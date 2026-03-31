/**
 * Shared color theme definitions for the Nexly suite.
 *
 * Each theme defines HSL values (without the "hsl()" wrapper) for every
 * design-token used in the web Tailwind config and the mobile style system.
 *
 * Light and dark variants are provided for each theme.
 */

export interface ThemeColors {
  background: string
  foreground: string
  card: string
  'card-foreground': string
  popover: string
  'popover-foreground': string
  primary: string
  'primary-foreground': string
  secondary: string
  'secondary-foreground': string
  muted: string
  'muted-foreground': string
  accent: string
  'accent-foreground': string
  destructive: string
  'destructive-foreground': string
  border: string
  input: string
  ring: string
  'chart-1': string
  'chart-2': string
  'chart-3': string
  'chart-4': string
  'chart-5': string
}

export interface ThemeDefinition {
  name: string
  label: string
  light: ThemeColors
  dark: ThemeColors
  /** A representative hex color for previewing the theme */
  activeColor: {
    light: string
    dark: string
  }
}

export const themes: Record<string, ThemeDefinition> = {
  default: {
    name: 'default',
    label: 'Neutral',
    activeColor: { light: '#171717', dark: '#fafafa' },
    light: {
      background: '0 0% 98%',
      foreground: '240 10% 3.9%',
      card: '0 0% 100%',
      'card-foreground': '240 10% 3.9%',
      popover: '0 0% 100%',
      'popover-foreground': '240 10% 3.9%',
      primary: '240 5.9% 10%',
      'primary-foreground': '0 0% 98%',
      secondary: '240 4.8% 95.9%',
      'secondary-foreground': '240 5.9% 10%',
      muted: '240 4.8% 95.9%',
      'muted-foreground': '240 3.8% 46.1%',
      accent: '240 4.8% 95.9%',
      'accent-foreground': '240 5.9% 10%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '0 0% 98%',
      border: '240 5.9% 90%',
      input: '240 5.9% 90%',
      ring: '240 5.9% 10%',
      'chart-1': '12 76% 61%',
      'chart-2': '173 58% 39%',
      'chart-3': '197 37% 24%',
      'chart-4': '43 74% 66%',
      'chart-5': '27 87% 67%',
    },
    dark: {
      background: '0 0% 6%',
      foreground: '0 0% 98%',
      card: '0 0% 8%',
      'card-foreground': '0 0% 98%',
      popover: '0 0% 6%',
      'popover-foreground': '0 0% 98%',
      primary: '0 0% 98%',
      'primary-foreground': '240 5.9% 10%',
      secondary: '0 0% 12%',
      'secondary-foreground': '0 0% 98%',
      muted: '0 0% 12%',
      'muted-foreground': '240 5% 64.9%',
      accent: '0 0% 12%',
      'accent-foreground': '0 0% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '0 0% 98%',
      border: '0 0% 14%',
      input: '0 0% 14%',
      ring: '0 0% 83.1%',
      'chart-1': '220 70% 50%',
      'chart-2': '160 60% 45%',
      'chart-3': '30 80% 55%',
      'chart-4': '280 65% 60%',
      'chart-5': '340 75% 55%',
    },
  },

  blue: {
    name: 'blue',
    label: 'Blue',
    activeColor: { light: '#2563eb', dark: '#3b82f6' },
    light: {
      background: '0 0% 98%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      popover: '0 0% 100%',
      'popover-foreground': '222.2 84% 4.9%',
      primary: '221.2 83.2% 53.3%',
      'primary-foreground': '210 40% 98%',
      secondary: '210 40% 96.1%',
      'secondary-foreground': '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      'muted-foreground': '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      'accent-foreground': '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '221.2 83.2% 53.3%',
      'chart-1': '221 83% 53%',
      'chart-2': '190 70% 45%',
      'chart-3': '250 65% 55%',
      'chart-4': '160 55% 45%',
      'chart-5': '30 80% 55%',
    },
    dark: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 6.5%',
      'card-foreground': '210 40% 98%',
      popover: '222.2 84% 4.9%',
      'popover-foreground': '210 40% 98%',
      primary: '217.2 91.2% 59.8%',
      'primary-foreground': '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      'secondary-foreground': '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      'muted-foreground': '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      'accent-foreground': '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '224.3 76.3% 48%',
      'chart-1': '221 83% 60%',
      'chart-2': '190 70% 50%',
      'chart-3': '250 65% 60%',
      'chart-4': '160 55% 50%',
      'chart-5': '30 80% 60%',
    },
  },

  green: {
    name: 'green',
    label: 'Green',
    activeColor: { light: '#16a34a', dark: '#22c55e' },
    light: {
      background: '0 0% 98%',
      foreground: '240 10% 3.9%',
      card: '0 0% 100%',
      'card-foreground': '240 10% 3.9%',
      popover: '0 0% 100%',
      'popover-foreground': '240 10% 3.9%',
      primary: '142.1 76.2% 36.3%',
      'primary-foreground': '355.7 100% 97.3%',
      secondary: '140 40% 95%',
      'secondary-foreground': '142.1 76.2% 26%',
      muted: '140 40% 95%',
      'muted-foreground': '140 5% 46%',
      accent: '140 40% 95%',
      'accent-foreground': '142.1 76.2% 26%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '0 0% 98%',
      border: '140 20% 90%',
      input: '140 20% 90%',
      ring: '142.1 76.2% 36.3%',
      'chart-1': '142 76% 36%',
      'chart-2': '170 60% 40%',
      'chart-3': '100 55% 45%',
      'chart-4': '200 65% 50%',
      'chart-5': '50 80% 55%',
    },
    dark: {
      background: '150 30% 4%',
      foreground: '0 0% 98%',
      card: '150 30% 6%',
      'card-foreground': '0 0% 98%',
      popover: '150 30% 4%',
      'popover-foreground': '0 0% 98%',
      primary: '142.1 70.6% 45.3%',
      'primary-foreground': '144.9 80.4% 10%',
      secondary: '145 30% 14%',
      'secondary-foreground': '0 0% 98%',
      muted: '145 30% 14%',
      'muted-foreground': '140 5% 65%',
      accent: '145 30% 14%',
      'accent-foreground': '0 0% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '0 0% 98%',
      border: '145 30% 16%',
      input: '145 30% 16%',
      ring: '142.1 70.6% 45.3%',
      'chart-1': '142 70% 45%',
      'chart-2': '170 60% 45%',
      'chart-3': '100 55% 50%',
      'chart-4': '200 65% 55%',
      'chart-5': '50 80% 60%',
    },
  },

  orange: {
    name: 'orange',
    label: 'Orange',
    activeColor: { light: '#ea580c', dark: '#f97316' },
    light: {
      background: '0 0% 98%',
      foreground: '20 14.3% 4.1%',
      card: '0 0% 100%',
      'card-foreground': '20 14.3% 4.1%',
      popover: '0 0% 100%',
      'popover-foreground': '20 14.3% 4.1%',
      primary: '24.6 95% 53.1%',
      'primary-foreground': '60 9.1% 97.8%',
      secondary: '30 30% 95%',
      'secondary-foreground': '24 9.8% 20%',
      muted: '30 30% 95%',
      'muted-foreground': '25 5.3% 44.7%',
      accent: '30 30% 95%',
      'accent-foreground': '24 9.8% 20%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '60 9.1% 97.8%',
      border: '25 20% 90%',
      input: '25 20% 90%',
      ring: '24.6 95% 53.1%',
      'chart-1': '25 95% 53%',
      'chart-2': '45 85% 50%',
      'chart-3': '10 80% 55%',
      'chart-4': '170 55% 45%',
      'chart-5': '200 65% 50%',
    },
    dark: {
      background: '20 14.3% 4.1%',
      foreground: '60 9.1% 97.8%',
      card: '20 14.3% 6%',
      'card-foreground': '60 9.1% 97.8%',
      popover: '20 14.3% 4.1%',
      'popover-foreground': '60 9.1% 97.8%',
      primary: '20.5 90.2% 48.2%',
      'primary-foreground': '60 9.1% 97.8%',
      secondary: '20 30% 14%',
      'secondary-foreground': '60 9.1% 97.8%',
      muted: '20 30% 14%',
      'muted-foreground': '24 5.4% 63.9%',
      accent: '20 30% 14%',
      'accent-foreground': '60 9.1% 97.8%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '60 9.1% 97.8%',
      border: '20 30% 16%',
      input: '20 30% 16%',
      ring: '20.5 90.2% 48.2%',
      'chart-1': '25 90% 55%',
      'chart-2': '45 85% 55%',
      'chart-3': '10 80% 60%',
      'chart-4': '170 55% 50%',
      'chart-5': '200 65% 55%',
    },
  },

  rose: {
    name: 'rose',
    label: 'Rose',
    activeColor: { light: '#e11d48', dark: '#f43f5e' },
    light: {
      background: '0 0% 98%',
      foreground: '240 10% 3.9%',
      card: '0 0% 100%',
      'card-foreground': '240 10% 3.9%',
      popover: '0 0% 100%',
      'popover-foreground': '240 10% 3.9%',
      primary: '346.8 77.2% 49.8%',
      'primary-foreground': '355.7 100% 97.3%',
      secondary: '350 30% 95%',
      'secondary-foreground': '346.8 77.2% 35%',
      muted: '350 30% 95%',
      'muted-foreground': '350 5% 46%',
      accent: '350 30% 95%',
      'accent-foreground': '346.8 77.2% 35%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '0 0% 98%',
      border: '350 20% 90%',
      input: '350 20% 90%',
      ring: '346.8 77.2% 49.8%',
      'chart-1': '347 77% 50%',
      'chart-2': '310 60% 50%',
      'chart-3': '20 80% 55%',
      'chart-4': '190 60% 45%',
      'chart-5': '270 65% 55%',
    },
    dark: {
      background: '345 20% 5%',
      foreground: '0 0% 98%',
      card: '345 20% 7%',
      'card-foreground': '0 0% 98%',
      popover: '345 20% 5%',
      'popover-foreground': '0 0% 98%',
      primary: '346.8 77.2% 49.8%',
      'primary-foreground': '355.7 100% 97.3%',
      secondary: '345 25% 14%',
      'secondary-foreground': '0 0% 98%',
      muted: '345 25% 14%',
      'muted-foreground': '350 5% 65%',
      accent: '345 25% 14%',
      'accent-foreground': '0 0% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '0 0% 98%',
      border: '345 25% 16%',
      input: '345 25% 16%',
      ring: '346.8 77.2% 49.8%',
      'chart-1': '347 77% 55%',
      'chart-2': '310 60% 55%',
      'chart-3': '20 80% 60%',
      'chart-4': '190 60% 50%',
      'chart-5': '270 65% 60%',
    },
  },

  violet: {
    name: 'violet',
    label: 'Violet',
    activeColor: { light: '#7c3aed', dark: '#8b5cf6' },
    light: {
      background: '0 0% 98%',
      foreground: '224 71.4% 4.1%',
      card: '0 0% 100%',
      'card-foreground': '224 71.4% 4.1%',
      popover: '0 0% 100%',
      'popover-foreground': '224 71.4% 4.1%',
      primary: '262.1 83.3% 57.8%',
      'primary-foreground': '210 20% 98%',
      secondary: '260 30% 95%',
      'secondary-foreground': '262.1 83.3% 40%',
      muted: '260 30% 95%',
      'muted-foreground': '260 5% 46%',
      accent: '260 30% 95%',
      'accent-foreground': '262.1 83.3% 40%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '210 20% 98%',
      border: '260 20% 90%',
      input: '260 20% 90%',
      ring: '262.1 83.3% 57.8%',
      'chart-1': '262 83% 58%',
      'chart-2': '290 65% 50%',
      'chart-3': '230 70% 55%',
      'chart-4': '170 55% 45%',
      'chart-5': '35 80% 55%',
    },
    dark: {
      background: '260 30% 5%',
      foreground: '210 20% 98%',
      card: '260 30% 7%',
      'card-foreground': '210 20% 98%',
      popover: '260 30% 5%',
      'popover-foreground': '210 20% 98%',
      primary: '263.4 70% 50.4%',
      'primary-foreground': '210 20% 98%',
      secondary: '260 30% 14%',
      'secondary-foreground': '210 20% 98%',
      muted: '260 30% 14%',
      'muted-foreground': '260 5% 65%',
      accent: '260 30% 14%',
      'accent-foreground': '210 20% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '210 20% 98%',
      border: '260 30% 16%',
      input: '260 30% 16%',
      ring: '263.4 70% 50.4%',
      'chart-1': '262 83% 62%',
      'chart-2': '290 65% 55%',
      'chart-3': '230 70% 60%',
      'chart-4': '170 55% 50%',
      'chart-5': '35 80% 60%',
    },
  },
}

export const themeNames = Object.keys(themes) as Array<keyof typeof themes>

/**
 * Convert a theme's HSL values to hex colors for use in React Native
 * and other non-CSS contexts (e.g., Expo config, status bar).
 */
export function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v.replace('%', '')))
  const sNorm = s / 100
  const lNorm = l / 100
  const a = sNorm * Math.min(lNorm, 1 - lNorm)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
