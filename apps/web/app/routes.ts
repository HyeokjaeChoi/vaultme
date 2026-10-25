import { type RouteConfig, index, route } from '@react-router/dev/routes'

// The landing page (ko `/`, en `/en`) is prerendered. Unknown paths render the 404 page. Static assets answer 404 by themselves (wrangler.jsonc not_found_handling), so
// these splat routes only matter for client-side navigation and for the prerendered 404 pages.
export default [
  index('routes/landing.tsx'),
  route('en', 'routes/landing.tsx', { id: 'landing-en' }),
  // The viewer: one prerendered shell per locale; the address is in the URL fragment (ADR-0012).
  route('address', 'routes/address.tsx', { id: 'address-ko' }),
  route('en/address', 'routes/address.tsx', { id: 'address-en' }),
  route('en/*', 'routes/not-found.tsx', { id: 'not-found-en' }),
  route('*', 'routes/not-found.tsx', { id: 'not-found-ko' }),
] satisfies RouteConfig
