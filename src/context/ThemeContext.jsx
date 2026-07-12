import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} });

// Light-first. Persisted in localStorage; applies the `dark` class to <html> so
// the Tailwind CSS-variable theme (index.css) switches palettes.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('ct_theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ct_theme', theme);
  }, [theme]);

  const setTheme = (t) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
