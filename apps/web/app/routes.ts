import { type RouteConfig, route } from '@react-router/dev/routes'

// Unknown paths render the 404 page. Static assets answer 404 by themselves (wrangler.jsonc not_found_handling), so
// these splat routes only matter for client-side navigation and for the prerendered 404 pages.
export default [
  route('en/*', 'routes/not-found.tsx', { id: 'not-found-en' }),
  route('*', 'routes/not-found.tsx', { id: 'not-found-ko' }),
] satisfies RouteConfig
