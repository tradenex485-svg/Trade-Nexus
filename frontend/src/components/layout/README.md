# Layout Components

Components for application layout structure and navigation.

## Overview

These components provide:
- Application shell and structure
- Navigation (header, sidebar, footer)
- Page containers and wrappers
- Breadcrumbs and navigation aids
- Responsive layout management

## Components

### Main Layout
- `app-shell.tsx` - Main application shell
- `main-layout.tsx` - Primary layout with sidebar
- `auth-layout.tsx` - Layout for authentication pages
- `centered-layout.tsx` - Centered content layout

### Navigation
- `header.tsx` - Top navigation bar
- `sidebar.tsx` - Side navigation menu
- `mobile-nav.tsx` - Mobile navigation menu
- `nav-item.tsx` - Navigation menu item
- `user-menu.tsx` - User account dropdown

### Page Structure
- `page-header.tsx` - Page title and actions
- `page-container.tsx` - Page content wrapper
- `content-area.tsx` - Main content area
- `breadcrumbs.tsx` - Breadcrumb navigation

### Footer
- `footer.tsx` - Application footer
- `footer-links.tsx` - Footer navigation links

## Usage Examples

### Main Layout
```typescript
import { MainLayout } from '@/components/layout/main-layout';

export default function DashboardPage() {
  return (
    <MainLayout>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dashboard content */}
      </div>
    </MainLayout>
  );
}
```

### Page Header
```typescript
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

<PageHeader
  title="User Management"
  description="Manage users and their permissions"
  actions={
    <Button>
      <PlusIcon className="mr-2" />
      Add User
    </Button>
  }
/>
```

### Sidebar Navigation
```typescript
import { Sidebar } from '@/components/layout/sidebar';

<Sidebar
  items={[
    { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
    { label: 'Trades', href: '/trades', icon: <ChartIcon /> },
    { label: 'Reports', href: '/reports', icon: <FileIcon /> }
  ]}
/>
```

### Breadcrumbs
```typescript
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'John Doe', href: '/admin/users/123' }
  ]}
/>
```

## Layout Structure

### Application Shell
```typescript
<AppShell>
  <Header>
    <Logo />
    <Navigation />
    <UserMenu />
  </Header>

  <div className="flex">
    <Sidebar />

    <main className="flex-1">
      <PageContainer>
        {children}
      </PageContainer>
    </main>
  </div>

  <Footer />
</AppShell>
```

### Responsive Behavior
```typescript
// Desktop: Sidebar always visible
// Tablet: Collapsible sidebar
// Mobile: Hidden sidebar, hamburger menu

export function ResponsiveSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
      {isMobile && (
        <button onClick={() => setIsOpen(true)}>
          <MenuIcon />
        </button>
      )}

      <Sidebar
        isOpen={isMobile ? isOpen : true}
        onClose={() => setIsOpen(false)}
        variant={isMobile ? 'overlay' : 'persistent'}
      />
    </>
  );
}
```

## Navigation Structure

### Sidebar Menu
```typescript
interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  requiresRole?: string[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <HomeIcon />
  },
  {
    label: 'Admin',
    icon: <SettingsIcon />,
    requiresRole: ['admin'],
    children: [
      { label: 'Users', href: '/admin/users' },
      { label: 'Companies', href: '/admin/companies' },
      { label: 'Settings', href: '/admin/settings' }
    ]
  }
];
```

### Active Link Highlighting
```typescript
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function NavItem({ href, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'nav-item',
        isActive && 'nav-item-active'
      )}
    >
      {label}
    </Link>
  );
}
```

## Header Component

```typescript
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <MobileSidebarToggle />
          <Logo />
        </div>

        <div className="flex items-center gap-4">
          <SearchCommand />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
```

## Sidebar Component

```typescript
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-64 border-r bg-background',
        !isOpen && 'hidden lg:block'
      )}
    >
      <nav className="space-y-2 p-4">
        {navigationItems.map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
```

## User Menu

```typescript
export function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={user?.avatar} />
          <AvatarFallback>{user?.initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Page Container

```typescript
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {children}
    </div>
  );
}
```

## Layout Variants

### Full Width
```typescript
<MainLayout variant="full-width">
  {/* Content spans full width */}
</MainLayout>
```

### Centered
```typescript
<CenteredLayout maxWidth="lg">
  {/* Content is centered with max width */}
</CenteredLayout>
```

### No Sidebar
```typescript
<MainLayout sidebar={false}>
  {/* No sidebar, just header and content */}
</MainLayout>
```

## Responsive Design

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px'   // Large desktop
};

// Mobile: Stack vertically, hamburger menu
// Tablet: Collapsible sidebar
// Desktop: Persistent sidebar
```

### Mobile Navigation
```typescript
export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left">
        <nav className="space-y-2">
          {navigationItems.map(item => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

## Sticky Elements

```typescript
// Sticky header
<header className="sticky top-0 z-50" />

// Sticky sidebar
<aside className="sticky top-16 h-[calc(100vh-4rem)]" />
```

## Accessibility

1. **Skip Links**: Allow keyboard users to skip navigation
2. **Landmarks**: Use semantic HTML (header, nav, main, footer)
3. **ARIA**: Add ARIA labels for screen readers
4. **Keyboard Nav**: Support keyboard navigation
5. **Focus Management**: Manage focus for modals and menus

```typescript
<nav aria-label="Main navigation">
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
  {/* Navigation items */}
</nav>

<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

## Best Practices

1. **Consistency**: Use consistent layout across pages
2. **Responsive**: Work on all devices
3. **Performance**: Minimize layout shifts
4. **Accessibility**: Support keyboard and screen readers
5. **Navigation**: Clear, intuitive navigation structure
6. **Spacing**: Consistent spacing and padding
7. **Hierarchy**: Clear visual hierarchy
8. **Loading**: Show loading states during navigation
