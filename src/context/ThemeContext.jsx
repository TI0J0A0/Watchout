import { createContext, useContext } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const dark = true
  const setDark = () => {}

  const T = {
    bg:    "#000",
    surf:  "#1C1C1E",
    surf2: "#2C2C2E",
    txt:   "#F5F5F7",
    sub:   "#98989D",
    bord:  "rgba(255,255,255,.1)",
    dark,
  };

  return (
    <ThemeContext.Provider value={{ T, dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
