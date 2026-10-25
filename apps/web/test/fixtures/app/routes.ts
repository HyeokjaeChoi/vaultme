import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('hydrated', 'routes/hydrated.tsx'),
  route('en/*', '../../../app/routes/not-found.tsx', { id: 'not-found-en' }),
  route('*', '../../../app/routes/not-found.tsx', { id: 'not-found-ko' }),
] satisfies RouteConfig
