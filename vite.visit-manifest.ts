import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

function iconType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

function visitManifestMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const raw = req.url || '';
  const [pathname, search] = raw.split('?');
  const match = pathname.match(/^\/g\/([^/]+)\/manifest\.webmanifest$/);
  if (!match) {
    next();
    return;
  }
  const code = decodeURIComponent(match[1]);
  const params = new URLSearchParams(search || '');
  const name = params.get('name') || 'Visit';
  const icon = params.get('icon') || '';
  // Shortcut / PWA opens public home — Continue with Google only via QR /g/:code
  const startUrl = params.get('start') || `/g/${code}`;
  const src = icon ? `/uploads/${icon}` : '/pwa-192.png';
  const type = icon ? iconType(icon) : 'image/png';
  const body = JSON.stringify({
    id: startUrl,
    name,
    short_name: name.slice(0, 12),
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#111827',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ...(icon ? [{ src, sizes: '192x192', type, purpose: 'any' }, { src, sizes: '512x512', type, purpose: 'any' }] : []),
    ],
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

export function visitManifestPlugin(): Plugin {
  return {
    name: 'visit-manifest',
    configureServer(server) {
      server.middlewares.use(visitManifestMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(visitManifestMiddleware);
    },
  };
}
