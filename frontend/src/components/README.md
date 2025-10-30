# Components

Reusable React components for the Trade Nexus application.

## Structure

```
components/
├── alerts/          # Alert-related components
├── auth/           # Authentication components
├── cftc/           # CFTC regulatory components
├── dashboard/      # Dashboard widgets and charts
├── layout/         # Layout components (header, sidebar, nav)
├── theme/          # Theme provider and theme components
├── ui/             # Base UI components (buttons, inputs, etc.)
└── *.tsx           # Shared utility components
```

## Component Categories

### `alerts/`
Alert management components:
- Alert configuration forms
- Alert list/table views
- Alert notification displays
- Alert rule builders

### `auth/`
Authentication-related components:
- Login forms
- Registration forms
- Password reset forms
- OAuth/SAML buttons
- Session management

### `cftc/`
CFTC regulatory compliance components:
- Exemption forms
- Filing submission interfaces
- Compliance dashboards
- Regulatory report viewers

### `dashboard/`
Dashboard widgets and visualizations:
- KPI cards
- Charts and graphs (using Recharts)
- Data tables
- Summary widgets
- Real-time data displays

### `layout/`
Application layout components:
- Header/navbar
- Sidebar navigation
- Footer
- Page containers
- Breadcrumbs
- Navigation menus

### `theme/`
Theme and styling components:
- Theme provider
- Theme toggle (light/dark mode)
- Color scheme switchers
- Theme context

### `ui/`
Base UI component library (using Radix UI):
- Buttons
- Inputs
- Selects/dropdowns
- Modals/dialogs
- Tabs
- Tooltips
- Cards
- Tables
- Forms
- Badges
- Alerts/toasts
- Avatars
- Separators
- Labels
- And more...

## Component Patterns

### 1. Compound Components
Related components that work together:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### 2. Render Props
Components that accept render functions:
```typescript
<DataTable
  data={users}
  renderRow={(user) => (
    <tr key={user.id}>
      <td>{user.name}</td>
    </tr>
  )}
/>
```

### 3. Component Composition
Building complex UIs from simple components:
```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. Polymorphic Components
Components that can render as different elements:
```typescript
<Button as="a" href="/dashboard">
  Go to Dashboard
</Button>
```

## Component Structure

### Basic Component
```typescript
import { ComponentProps } from 'react';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'button-base',
        variantStyles[variant],
        sizeStyles[size]
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Client Component
```typescript
'use client'

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Forwarding Refs
```typescript
import { forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn('input-base', className)}
        {...props}
      />
    );
  }
);
```

## Styling

### Tailwind CSS
Primary styling approach:
```typescript
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>
```

### Class Variance Authority (CVA)
For component variants:
```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### Tailwind Merge
Merge Tailwind classes properly:
```typescript
import { cn } from '@/lib/utils';

<div className={cn('p-4 bg-white', className)} />
```

## Accessibility

### ARIA Attributes
```typescript
<button
  aria-label="Close dialog"
  aria-expanded={isOpen}
  aria-controls="dialog-content"
>
  Close
</button>
```

### Keyboard Navigation
```typescript
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Clickable
</div>
```

### Focus Management
```typescript
import { useRef, useEffect } from 'react';

export function Modal({ isOpen }: { isOpen: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      buttonRef.current?.focus();
    }
  }, [isOpen]);

  return <button ref={buttonRef}>Close</button>;
}
```

## Performance

### Memoization
```typescript
import { memo } from 'react';

export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Expensive rendering logic
  return <div>{processData(data)}</div>;
});
```

### Lazy Loading
```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false
});
```

## Testing

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Storybook

Document components with Storybook:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button'
  }
};
```

## Best Practices

1. **Single Responsibility**: Each component should do one thing
2. **Composition**: Build complex UIs from simple components
3. **Props Interface**: Define clear TypeScript interfaces
4. **Accessibility**: Include ARIA attributes and keyboard support
5. **Performance**: Use memo for expensive components
6. **Testing**: Write tests for interactive components
7. **Documentation**: Add JSDoc comments and Storybook stories
8. **Styling**: Use consistent styling approach (Tailwind)
9. **Naming**: Use clear, descriptive component names
10. **Reusability**: Make components flexible and reusable

## Creating New Components

1. Choose the appropriate directory (`ui/`, `alerts/`, etc.)
2. Create component file: `my-component.tsx`
3. Define TypeScript interface for props
4. Implement component with accessibility in mind
5. Add styling with Tailwind CSS
6. Write tests in `my-component.test.tsx`
7. Create Storybook story if it's a UI component
8. Export from index file if needed

## Radix UI Integration

Many UI components are built with Radix UI primitives:
```typescript
import * as Dialog from '@radix-ui/react-dialog';

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Benefits of Radix UI:
- Unstyled primitives
- Full keyboard navigation
- Screen reader support
- Focus management
- WAI-ARIA compliance
