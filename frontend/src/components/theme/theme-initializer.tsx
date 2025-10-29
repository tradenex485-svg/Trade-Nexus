'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme-store';

/**
 * Theme Initializer Component
 * Applies theme immediately on page load to prevent flash
 */
export function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const stored = localStorage.getItem('theme-storage');
              if (stored) {
                const { state } = JSON.parse(stored);
                const theme = state.theme || 'dark';

                if (theme === 'system') {
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  document.documentElement.classList.add(systemTheme);
                } else {
                  document.documentElement.classList.add(theme);
                }
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
  );
}

/**
 * Theme Syncer Component
 * Keeps theme in sync with store changes
 */
export function ThemeSyncer() {
  const theme = useThemeStore((state) => state.theme);
  const _hasHydrated = useThemeStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;

    const root = window.document.documentElement;
    const resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [theme, _hasHydrated]);

  return null;
}
