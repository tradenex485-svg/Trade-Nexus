# Configuration

Application configuration files and constants.

## Purpose

This directory contains:
- Environment-specific configuration
- Application constants
- Feature flags
- API endpoint configurations
- Database connection settings
- Third-party service configurations

## Files

Configuration files define settings used throughout the application:
- JWT token expiration times
- Rate limiting thresholds
- Database connection parameters
- External API endpoints
- Email service settings
- Feature toggles

## Usage

```typescript
import { config } from './config';

// Access configuration values
const jwtExpiry = config.jwt.expiryTime;
const apiUrl = config.api.baseUrl;
```

## Best Practices

1. **Environment Variables**: Sensitive values should be in environment variables
2. **Type Safety**: Export typed configuration objects
3. **Defaults**: Provide sensible default values
4. **Validation**: Validate configuration on startup
5. **Documentation**: Comment complex configuration options

## Security

- Never commit secrets or API keys
- Use Cloudflare Workers secrets for sensitive data
- Keep production configs separate from development
