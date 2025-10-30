# Custom React Hooks

Reusable React hooks for common functionality across the application.

## Purpose

Custom hooks encapsulate reusable logic:
- State management
- Side effects
- API interactions
- UI behaviors
- Browser APIs
- Form handling
- Data fetching

## Hook Categories

### State Hooks
- `useLocalStorage` - Persist state in localStorage
- `useSessionStorage` - Persist state in sessionStorage
- `useToggle` - Boolean toggle state
- `useCounter` - Counter state with increment/decrement
- `usePrevious` - Track previous value
- `useDebounce` - Debounce values
- `useThrottle` - Throttle values

### API Hooks
- `useApi` - Generic API calls with React Query
- `useAuth` - Authentication state and methods
- `useUser` - Current user data
- `useQuery` - Data fetching wrapper
- `useMutation` - Data mutation wrapper

### UI Hooks
- `useMediaQuery` - Responsive breakpoint detection
- `useWindowSize` - Window dimensions
- `useScroll` - Scroll position and direction
- `useOnClickOutside` - Detect clicks outside element
- `useKeyPress` - Keyboard event handling
- `useFocusTrap` - Trap focus within element
- `usePortal` - Render to portal

### Form Hooks
- `useForm` - Form state management
- `useFieldArray` - Dynamic form fields
- `useValidation` - Form validation

## Example Hooks

### useLocalStorage
```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

### useAuth
```typescript
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      return data;
    }

    throw new Error('Login failed');
  };

  const logout = () => {
    clearUser();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout
  };
}

// Usage
const { user, login, logout, isAuthenticated } = useAuth();
```

### useDebounce
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

### useMediaQuery
```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
```

### useOnClickOutside
```typescript
import { useEffect, RefObject } from 'react';

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Usage
const menuRef = useRef<HTMLDivElement>(null);
useOnClickOutside(menuRef, () => setIsOpen(false));
```

### useAsync
```typescript
import { useState, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    setState({ data: null, loading: true, error: null });

    asyncFunction()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
  }, dependencies);

  return state;
}

// Usage
const { data, loading, error } = useAsync(() => fetchUserData(userId), [userId]);
```

### useToggle
```typescript
import { useState, useCallback } from 'react';

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, { toggle, setTrue, setFalse, setValue }] as const;
}

// Usage
const [isOpen, { toggle, setTrue, setFalse }] = useToggle();
```

### useKeyPress
```typescript
import { useState, useEffect } from 'react';

export function useKeyPress(targetKey: string): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(true);
      }
    };

    const upHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
}

// Usage
const escapePressed = useKeyPress('Escape');

useEffect(() => {
  if (escapePressed) {
    closeModal();
  }
}, [escapePressed]);
```

### useWindowSize
```typescript
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Usage
const { width, height } = useWindowSize();
```

## Hook Best Practices

### 1. Naming Convention
Always prefix with `use`:
```typescript
// Good
export function useAuth() { }
export function useDebounce() { }

// Bad
export function auth() { }
export function debounce() { }
```

### 2. Return Values
Return arrays or objects based on usage:
```typescript
// Array for simple values
export function useToggle() {
  return [value, toggle] as const;
}

// Object for multiple related values
export function useAuth() {
  return { user, login, logout, isAuthenticated };
}
```

### 3. TypeScript Types
Always provide type safety:
```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  // Implementation
}
```

### 4. Cleanup
Always cleanup side effects:
```typescript
useEffect(() => {
  const subscription = subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 5. Dependencies
Be explicit about dependencies:
```typescript
useEffect(() => {
  fetchData(userId);
}, [userId]); // Dependency array
```

### 6. Custom Hook Composition
Build complex hooks from simpler ones:
```typescript
export function useAuthenticatedApi() {
  const { user } = useAuth();
  const api = useApi();

  return {
    fetchUserData: () => api.get(`/users/${user.id}`),
    updateUser: (data) => api.put(`/users/${user.id}`, data)
  };
}
```

## Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## When to Create a Custom Hook

Create a custom hook when:
1. Logic is reused across multiple components
2. Component becomes too complex
3. Side effects need to be encapsulated
4. State logic can be extracted
5. API patterns are repeated

Don't create a hook when:
1. Logic is only used once
2. It's just wrapping a single React hook
3. It doesn't follow React hook rules
