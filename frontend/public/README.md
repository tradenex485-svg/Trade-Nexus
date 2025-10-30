# Public Assets

Static assets served directly by the web server.

## Purpose

The `public/` directory contains static files that are served at the root of the application:
- Images and icons
- Fonts
- Favicons
- Manifest files
- Robot.txt
- Sitemap.xml
- Other static files

## Directory Structure

```
public/
├── images/         # Image assets
├── icons/          # Icon files
├── fonts/          # Custom fonts (if not using Google Fonts)
├── favicon.ico     # Website favicon
├── logo.svg        # Company/app logo
├── manifest.json   # PWA manifest
├── robots.txt      # SEO robots file
└── sitemap.xml     # SEO sitemap
```

## Usage

### In Components
Files in `public/` are served from the root `/` path:

```typescript
// Referencing a file in public/images/logo.png
import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="/images/logo.png"
      alt="Trade Nexus Logo"
      width={200}
      height={100}
    />
  );
}

// Regular img tag
<img src="/icons/user.svg" alt="User icon" />

// Background image in CSS
background-image: url('/images/background.jpg');
```

### In HTML
```html
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

## Image Optimization

### Using Next.js Image Component
Next.js automatically optimizes images:
```typescript
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority  // Load image eagerly (above the fold)
/>
```

### Image Formats
Recommended formats:
- **SVG**: For logos, icons, and illustrations
- **WebP**: For photos and complex images
- **PNG**: For images requiring transparency
- **JPG**: For photos without transparency

## Favicon

### Basic Favicon
```html
<!-- public/favicon.ico -->
<link rel="icon" href="/favicon.ico" />
```

### Multiple Sizes
```html
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```

## PWA Manifest

### manifest.json
```json
{
  "name": "Trade Nexus",
  "short_name": "Trade Nexus",
  "description": "Trading platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## SEO Files

### robots.txt
```txt
# Allow all crawlers
User-agent: *
Allow: /

# Disallow specific paths
Disallow: /admin/
Disallow: /api/

# Sitemap location
Sitemap: https://tradenexus.com/sitemap.xml
```

### sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tradenexus.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tradenexus.com/about</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Best Practices

### 1. Optimize Images
- Compress images before adding to public/
- Use appropriate formats (WebP, SVG)
- Provide multiple sizes for responsive images

### 2. Organization
- Group related files in subdirectories
- Use descriptive file names
- Keep structure flat when possible

### 3. Caching
- Files in public/ are cached by default
- Use versioned filenames for cache busting
- Example: `logo-v2.png` or `logo.png?v=2`

### 4. Security
- Don't store sensitive information in public/
- Files are publicly accessible
- Use appropriate file permissions

### 5. Performance
- Minimize file sizes
- Use CDN for large assets (if needed)
- Lazy load images below the fold

## File Naming

Use consistent naming conventions:
- **Lowercase**: `logo.svg`, `hero-image.jpg`
- **Hyphens**: Use hyphens for word separation
- **Descriptive**: `user-avatar-placeholder.png`
- **Avoid spaces**: Never use spaces in filenames

## Common Files

### Favicons
```
/favicon.ico
/icons/favicon-16x16.png
/icons/favicon-32x32.png
/icons/apple-touch-icon.png
```

### Social Media Images
```
/images/og-image.png         # Open Graph image (1200x630)
/images/twitter-card.png     # Twitter card image (1200x675)
```

### App Icons
```
/icons/icon-192x192.png      # PWA icon
/icons/icon-512x512.png      # PWA icon
/icons/apple-touch-icon.png  # iOS icon
```

## Cloudflare Pages Deployment

When deployed to Cloudflare Pages:
- All files in `public/` are served as static assets
- Files are cached at the edge
- Fast delivery through Cloudflare CDN
- Automatic compression (gzip/brotli)

## References in Code

### In TypeScript/TSX
```typescript
const logoUrl = '/images/logo.svg';
const iconPath = '/icons/user.svg';
```

### In CSS/SCSS
```css
.hero {
  background-image: url('/images/hero.jpg');
}

.icon {
  mask-image: url('/icons/icon.svg');
}
```

### In Next.js Metadata
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png'
  },
  openGraph: {
    images: ['/images/og-image.png']
  }
};
```

## Do Not Store

❌ Don't put these in public/:
- API keys or secrets
- User uploaded files (use blob storage)
- Environment-specific configuration
- Backend code
- Database files
- Build artifacts

✅ Do put these in public/:
- Logos and branding
- UI icons
- Static images
- Favicons
- SEO files (robots.txt, sitemap.xml)
- PWA manifest
- Static documents (PDF, etc.)
