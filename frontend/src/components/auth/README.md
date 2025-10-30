# Authentication Components

Components for user authentication and authorization.

## Overview

These components handle:
- Login and logout flows
- User registration
- Password reset
- SAML/OAuth SSO integration
- Session management
- Protected routes

## Components

### Login
- `login-form.tsx` - Email/password login form
- `sso-buttons.tsx` - SAML/OAuth login buttons
- `login-page.tsx` - Complete login page layout

### Registration
- `register-form.tsx` - New user registration form
- `terms-checkbox.tsx` - Terms of service acceptance
- `verification-notice.tsx` - Email verification notice

### Password Management
- `forgot-password-form.tsx` - Password reset request form
- `reset-password-form.tsx` - New password entry form
- `change-password-form.tsx` - Change password in settings

### SSO
- `saml-login-button.tsx` - SAML SSO login button
- `oauth-provider-buttons.tsx` - OAuth provider buttons (Google, etc.)
- `sso-callback-handler.tsx` - Handle SSO callbacks

### Session
- `session-expired-modal.tsx` - Session expiration notification
- `session-refresh.tsx` - Auto-refresh session
- `logout-button.tsx` - Logout action

## Usage Examples

### Login Form
```typescript
import { LoginForm } from '@/components/auth/login-form';

<LoginForm
  onSuccess={() => router.push('/dashboard')}
  onError={(error) => toast.error(error.message)}
/>
```

### SSO Buttons
```typescript
import { SSOButtons } from '@/components/auth/sso-buttons';

<SSOButtons
  providers={['saml', 'google']}
  onProviderClick={(provider) => handleSSOLogin(provider)}
/>
```

### Protected Route
```typescript
import { ProtectedRoute } from '@/components/auth/protected-route';

<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

## Authentication Flow

### Standard Login
1. User enters email/password
2. Form validates inputs
3. API call to `/api/auth/login`
4. Store JWT token
5. Redirect to dashboard

### SSO Login
1. User clicks SSO button
2. Redirect to SSO provider
3. Provider authenticates user
4. Callback to `/auth/callback`
5. Exchange code for token
6. Store JWT and redirect

### Password Reset
1. User requests reset at `/forgot-password`
2. Email sent with reset link
3. User clicks link to `/reset-password?token=...`
4. User enters new password
5. Password updated, redirect to login

## Integration with Auth Store

```typescript
import { useAuthStore } from '@/store/auth-store';

export function LoginForm() {
  const setUser = useAuthStore(state => state.setUser);

  const handleLogin = async (credentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user, response.token);
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Form fields */}
    </form>
  );
}
```

## Form Validation

All forms use Zod for validation:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;
```

## Security Features

1. **Password Requirements**: Minimum length, complexity rules
2. **Rate Limiting**: Prevent brute force attacks
3. **Account Lockout**: Lock after failed attempts
4. **Secure Token Storage**: HttpOnly cookies (recommended)
5. **CSRF Protection**: State parameter for OAuth
6. **XSS Prevention**: Sanitize inputs

## Error Handling

```typescript
const errorMessages = {
  'invalid_credentials': 'Invalid email or password',
  'account_locked': 'Account locked due to too many failed attempts',
  'session_expired': 'Your session has expired. Please log in again.',
  'sso_error': 'SSO authentication failed. Please try again.'
};

export function handleAuthError(error: AuthError) {
  const message = errorMessages[error.code] || 'Authentication failed';
  toast.error(message);
}
```

## Styling

Auth components use consistent styling:
- Centered forms with max width
- Clear visual hierarchy
- Accessible form labels
- Error message display
- Loading states
- Responsive design

## Best Practices

1. **Clear Feedback**: Show loading states and error messages
2. **Accessibility**: Proper labels, ARIA attributes, keyboard nav
3. **Security**: Never log sensitive data, use HTTPS
4. **UX**: Remember email, show/hide password, auto-focus
5. **Validation**: Client-side and server-side validation
6. **Mobile**: Touch-friendly buttons and inputs
7. **Error Recovery**: Clear instructions for error resolution
