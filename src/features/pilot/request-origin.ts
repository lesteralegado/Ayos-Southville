// Preserve strict URL-origin checks in hosted environments. Next dev rewrites
// loopback request URLs to localhost even when the browser uses 127.0.0.1.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const url = new URL(request.url);
  if (origin === url.origin) return true;
  return process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true'
    && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'demo-ayos-southville-local'
    && process.env.NODE_ENV !== 'production' && !process.env.VERCEL
    && process.env.APP_SITE_URL === 'http://127.0.0.1:3001'
    && url.origin === 'http://localhost:3001'
    && request.headers.get('host') === '127.0.0.1:3001'
    && origin === 'http://127.0.0.1:3001';
}
