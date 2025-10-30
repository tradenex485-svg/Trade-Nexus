# State Management

Global state management using Zustand.

## Overview

Zustand is a lightweight state management library that provides:
- Simple API with hooks
- No boilerplate
- TypeScript support
- Minimal re-renders
- Dev tools integration

## Store Structure

```
store/
├── auth-store.ts       # Authentication state
├── ui-store.ts         # UI preferences (theme, sidebar)
├── settings-store.ts   # User settings
└── index.ts           # Export all stores
```

## Creating a Store

### Basic Store
```typescript
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}));
```

### Authentication Store
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true
        }),

      clearUser: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        }))
    }),
    {
      name: 'auth-storage' // localStorage key
    }
  )
);
```

### UI Store
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIStore {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open })
    }),
    {
      name: 'ui-preferences'
    }
  )
);
```

## Using Stores in Components

### Basic Usage
```typescript
'use client'

import { useCounterStore } from '@/store/counter-store';

export function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### Multiple Values
```typescript
import { useAuthStore } from '@/store/auth-store';

export function UserProfile() {
  const { user, updateUser } = useAuthStore();

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser({ name: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}
```

### Shallow Comparison
Prevent unnecessary re-renders:
```typescript
import { shallow } from 'zustand/shallow';

export function Component() {
  const { user, token } = useAuthStore(
    (state) => ({ user: state.user, token: state.token }),
    shallow
  );

  // Only re-renders when user or token changes
}
```

## Advanced Patterns

### Actions with Async Logic
```typescript
interface DataStore {
  data: any[];
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
}

export const useDataStore = create<DataStore>((set) => ({
  data: [],
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```

### Computed Values
```typescript
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  // Computed values as getters
  get total(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  };
  get itemCount(): number {
    return this.items.length;
  };
}
```

### Immer Middleware
For easier immutable updates:
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useStore = create<State>()(
  immer((set) => ({
    nested: {
      deep: {
        value: 0
      }
    },
    updateDeepValue: (newValue) =>
      set((state) => {
        state.nested.deep.value = newValue; // Direct mutation with Immer
      })
  }))
);
```

### DevTools Integration
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({
      // Store implementation
    }),
    { name: 'MyStore' }
  )
);
```

## Store Organization

### Slices Pattern
Split large stores into slices:
```typescript
// slices/user-slice.ts
export interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
}

export const createUserSlice = (set): UserSlice => ({
  user: null,
  setUser: (user) => set({ user })
});

// slices/settings-slice.ts
export interface SettingsSlice {
  theme: string;
  setTheme: (theme: string) => void;
}

export const createSettingsSlice = (set): SettingsSlice => ({
  theme: 'light',
  setTheme: (theme) => set({ theme })
});

// store/index.ts
import { create } from 'zustand';
import { createUserSlice, UserSlice } from './slices/user-slice';
import { createSettingsSlice, SettingsSlice } from './slices/settings-slice';

type StoreState = UserSlice & SettingsSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createUserSlice(...a),
  ...createSettingsSlice(...a)
}));
```

## Persistence

### LocalStorage Persistence
```typescript
import { persist } from 'zustand/middleware';

export const useStore = create<State>()(
  persist(
    (set) => ({
      // State and actions
    }),
    {
      name: 'my-storage-key',
      // Optional: customize storage
      storage: createJSONStorage(() => localStorage)
    }
  )
);
```

### SessionStorage Persistence
```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create<State>()(
  persist(
    (set) => ({
      // State and actions
    }),
    {
      name: 'session-data',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
```

## Testing Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounterStore } from './counter-store';

describe('Counter Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useCounterStore.setState({ count: 0 });
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(-1);
  });
});
```

## Best Practices

1. **Type Safety**: Always define TypeScript interfaces
2. **Single Responsibility**: Keep stores focused on specific domains
3. **Immutability**: Don't mutate state directly (unless using Immer)
4. **Selective Subscriptions**: Select only what you need from state
5. **Async Actions**: Handle loading and error states
6. **Persistence**: Use persist middleware for data that should survive refreshes
7. **DevTools**: Enable devtools in development
8. **Testing**: Write tests for store logic

## Common Patterns

### Loading States
```typescript
interface Store {
  data: any;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}
```

### Optimistic Updates
```typescript
const updateItem = async (id: number, data: any) => {
  // Optimistically update UI
  set((state) => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, ...data } : item
    )
  }));

  try {
    await api.update(id, data);
  } catch (error) {
    // Revert on error
    set((state) => ({
      items: state.items // Fetch original data
    }));
  }
};
```

### Reset Store
```typescript
const initialState = {
  user: null,
  token: null
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  reset: () => set(initialState)
}));
```

## Zustand vs Other Solutions

### Why Zustand?
- ✅ Minimal boilerplate
- ✅ Small bundle size
- ✅ No context providers needed
- ✅ Works with Server Components
- ✅ Simple API
- ✅ TypeScript support

### When to use Context instead?
- Component-specific state
- State that doesn't need persistence
- Small, isolated state trees

### When to use React Query instead?
- Server state management
- Data fetching and caching
- Real-time updates
- Optimistic updates with API sync
