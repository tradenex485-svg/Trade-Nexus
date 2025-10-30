# Theme Components

Components for theme management and customization.

## Overview

These components provide:
- Theme provider (light/dark mode)
- Theme switcher/toggle
- Color scheme management
- Theme customization
- CSS variable management

## Components

### Theme Provider
- `theme-provider.tsx` - Theme context provider
- `theme-wrapper.tsx` - Theme wrapper with system detection

### Theme Controls
- `theme-toggle.tsx` - Light/dark mode toggle button
- `theme-switcher.tsx` - Theme selection dropdown
- `theme-customizer.tsx` - Advanced theme customization

### Theme Utilities
- `use-theme.tsx` - Theme hook
- `theme-script.tsx` - Script to prevent flash
- `theme-config.ts` - Theme configuration

## Usage Examples

### Theme Provider
```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Theme Toggle
```typescript
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Header() {
  return (
    <header>
      <nav>
        {/* Other nav items */}
        <ThemeToggle />
      </nav>
    </header>
  );
}
```

### Using Theme in Components
```typescript
import { useTheme } from '@/components/theme/use-theme';

export function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

## Theme Configuration

### Theme Types
```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeConfig {
  defaultTheme: Theme;
  enableSystem: boolean;
  disableTransitionOnChange: boolean;
  themes: string[];
}
```

### CSS Variables
Themes use CSS variables for colors:

```css
/* Light theme */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

/* Dark theme */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  /* ... other variables */
}
```

## Theme Provider Implementation

```typescript
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

## Theme Toggle Component

```typescript
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

## Theme Switcher with Dropdown

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Preventing Flash of Wrong Theme

Add this script in the document head:

```typescript
// components/theme/theme-script.tsx
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const theme = localStorage.getItem('theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}
        `
      }}
    />
  );
}

// In app/layout.tsx
<html>
  <head>
    <ThemeScript />
  </head>
  <body>...</body>
</html>
```

## System Theme Detection

Automatically detect and use system preference:

```typescript
'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function SystemThemeDetector() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  return null;
}
```

## Theme Persistence

Themes are automatically persisted in localStorage:

```typescript
// Stored in localStorage as:
localStorage.setItem('theme', 'dark');

// Retrieved on load:
const storedTheme = localStorage.getItem('theme');
```

## Custom Themes

Add custom theme variants:

```css
/* Custom theme: blue */
[data-theme='blue'] {
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  /* ... other custom colors */
}

/* Custom theme: green */
[data-theme='green'] {
  --primary: 142 76% 36%;
  --primary-foreground: 0 0% 100%;
  /* ... other custom colors */}
```

```typescript
<ThemeProvider themes={['light', 'dark', 'blue', 'green']}>
  {children}
</ThemeProvider>
```

## Tailwind Configuration

Configure Tailwind to use CSS variables:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        }
        // ... other colors
      }
    }
  }
};
```

## Theme-Aware Components

Create components that adapt to theme:

```typescript
export function ThemedCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground border border-border rounded-lg p-4">
      {children}
    </div>
  );
}
```

## Transition Handling

Disable transitions during theme change to prevent flickering:

```css
.theme-transitioning * {
  transition: none !important;
}
```

```typescript
const { setTheme } = useTheme();

const handleThemeChange = (newTheme: Theme) => {
  document.documentElement.classList.add('theme-transitioning');
  setTheme(newTheme);
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 0);
};
```

## Best Practices

1. **System Preference**: Respect user's system theme preference
2. **Persistence**: Save theme choice in localStorage
3. **No Flash**: Prevent flash of wrong theme on load
4. **Smooth Transitions**: Use CSS transitions for theme changes
5. **Accessibility**: Ensure sufficient contrast in both themes
6. **Consistency**: Use theme variables throughout the app
7. **Testing**: Test both light and dark modes thoroughly
8. **Performance**: Minimize re-renders when theme changes

## Color Palette Tools

Useful tools for creating theme color palettes:
- [shadcn/ui themes](https://ui.shadcn.com/themes)
- [Coolors](https://coolors.co/)
- [Realtime Colors](https://realtimecolors.com/)
- [Color Hunt](https://colorhunt.co/)

## Accessibility

Ensure themes meet accessibility standards:
- WCAG AA contrast ratio (4.5:1 for normal text)
- WCAG AAA contrast ratio (7:1 for enhanced)
- Test with color blindness simulators
- Provide high contrast mode option
