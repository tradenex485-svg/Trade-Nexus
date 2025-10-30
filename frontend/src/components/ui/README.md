# UI Components

Base UI component library built with Radix UI primitives and styled with Tailwind CSS.

## Overview

This directory contains reusable, accessible UI components that serve as building blocks for the application. Components are built using Radix UI primitives for accessibility and keyboard navigation.

## Component List

Common UI components (based on typical shadcn/ui structure):

### Buttons
- `button.tsx` - Base button component with variants
- `icon-button.tsx` - Button with icon only

### Form Controls
- `input.tsx` - Text input field
- `textarea.tsx` - Multi-line text input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox input
- `radio-group.tsx` - Radio button group
- `switch.tsx` - Toggle switch
- `slider.tsx` - Range slider
- `label.tsx` - Form label

### Layout
- `card.tsx` - Card container component
- `separator.tsx` - Horizontal/vertical divider
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Collapsible sections

### Overlays
- `dialog.tsx` - Modal dialog
- `alert-dialog.tsx` - Alert/confirmation dialog
- `sheet.tsx` - Slide-out panel
- `popover.tsx` - Floating popover
- `tooltip.tsx` - Hover tooltip
- `dropdown-menu.tsx` - Dropdown menu

### Feedback
- `toast.tsx` - Toast notifications
- `alert.tsx` - Alert messages
- `badge.tsx` - Status badge
- `progress.tsx` - Progress bar
- `skeleton.tsx` - Loading skeleton
- `spinner.tsx` - Loading spinner

### Navigation
- `navigation-menu.tsx` - Navigation menu
- `breadcrumb.tsx` - Breadcrumb navigation

### Data Display
- `table.tsx` - Data table
- `avatar.tsx` - User avatar
- `calendar.tsx` - Date picker calendar
- `command.tsx` - Command palette

## Component Pattern

All UI components follow this pattern:

```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define variants with CVA
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

// Component interface extending HTML attributes
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Component with forwardRef for ref access
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

## Usage Examples

### Button
```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
<Button variant="secondary" size="sm">Small Button</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
```

### Dialog
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### Form
```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

<form>
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Enter your email" />
  </div>
  <Button type="submit">Submit</Button>
</form>
```

### Table
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map(user => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Radix UI Integration

Components are built on Radix UI primitives:

```typescript
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
```

Benefits:
- **Accessible**: WAI-ARIA compliant
- **Unstyled**: Full styling control
- **Keyboard Navigation**: Built-in keyboard support
- **Focus Management**: Automatic focus handling
- **Composable**: Build complex components from primitives

## Styling Approach

### Tailwind CSS
All styling uses Tailwind utility classes:
```typescript
className="flex items-center justify-between p-4 rounded-lg border"
```

### CSS Variables
Theme colors use CSS variables:
```typescript
className="bg-primary text-primary-foreground"

// Defined in styles/globals.css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}
```

### Class Variance Authority (CVA)
Variants are managed with CVA:
```typescript
const variants = cva('base-classes', {
  variants: {
    variant: { ... },
    size: { ... }
  }
});
```

## Accessibility

All components include:
- **ARIA labels** and roles
- **Keyboard navigation**
- **Focus indicators**
- **Screen reader support**
- **High contrast support**

Example:
```typescript
<button
  aria-label="Close dialog"
  aria-expanded={isOpen}
  role="button"
  tabIndex={0}
>
```

## Customization

### Extending Components
```typescript
import { Button, ButtonProps } from '@/components/ui/button';

interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
}

export function IconButton({ icon, children, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      {icon}
      {children}
    </Button>
  );
}
```

### Custom Variants
```typescript
const customButtonVariants = cva(buttonVariants.base, {
  variants: {
    ...buttonVariants.variants,
    custom: {
      brand: 'bg-brand text-white'
    }
  }
});
```

## Component Guidelines

1. **Composition**: Build from Radix UI primitives
2. **Accessibility**: Include ARIA attributes
3. **TypeScript**: Fully typed with interfaces
4. **Forwarding Refs**: Use forwardRef for ref access
5. **Variants**: Use CVA for variant management
6. **Styling**: Use Tailwind utilities
7. **Documentation**: Include usage examples
8. **Testing**: Write component tests

## Adding New Components

1. Create component file: `new-component.tsx`
2. Build with Radix UI primitive (if applicable)
3. Add TypeScript interface
4. Implement with forwardRef
5. Style with Tailwind CSS
6. Add variants with CVA
7. Export from component
8. Write tests
9. Create Storybook story (optional)

## Resources

- [Radix UI Documentation](https://www.radix-ui.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Class Variance Authority](https://cva.style/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
