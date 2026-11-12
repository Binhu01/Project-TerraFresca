import { createContext, useContext } from "react";

export const NexoraTheme = {
  colors: {
    blue: "#3563F5",
    cyan: "#20C5C9",
    dark: "#0B1220",
    bg: "#F8FAFF",
    bgSecondary: "#F5F7FB",
    white: "#FFFFFF",
    text: "#101828",
    textSecondary: "#667085",
    border: "#E4E9F2",
    success: "#16A34A",
    warning: "#EAB308",
    error: "#DC2626",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
} as const;

export type Theme = typeof NexoraTheme;

const ThemeContext = createContext<Theme>(NexoraTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={NexoraTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}