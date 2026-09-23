import { createContext, useContext } from 'react';

export type LandingTheme = 'dark' | 'light';

const LandingThemeContext = createContext<LandingTheme>('dark');

export function LandingThemeProvider({
  theme,
  children,
}: {
  theme: LandingTheme;
  children: React.ReactNode;
}) {
  return <LandingThemeContext.Provider value={theme}>{children}</LandingThemeContext.Provider>;
}

export function useLandingTheme() {
  return useContext(LandingThemeContext);
}

export function useIsLandingLight() {
  return useLandingTheme() === 'light';
}
