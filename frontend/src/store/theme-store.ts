import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  _hasHydrated: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  getResolvedTheme: () => 'light' | 'dark';
  setHasHydrated: (state: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      _hasHydrated: false,

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply theme to document
        applyTheme(theme);
      },

      getResolvedTheme: (): 'light' | 'dark' => {
        const { theme } = get();
        if (theme === 'system') {
          // Check system preference
          if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'dark';
        }
        return theme;
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Apply theme after hydration
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Helper function to apply theme to document
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

// Listen to system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      applyTheme('system');
    }
  });
}
