import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} });

// TRANSITIONAL DEFAULT = dark. The new design is light-first, but until every
// role console is migrated off the old dark utility classes, defaulting to light
// would render those not-yet-redone pages as white-on-white on the live site.
// Dark keeps them looking as before; the redesigned screens (login onward) also
// support dark. Flip this default to 'light' once all roles are migrated.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('ct_theme') || 'dark');

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
