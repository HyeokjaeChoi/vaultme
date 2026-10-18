import { app } from './app.ts'
import type { Env } from './env.ts'
import { sweep } from './push.ts'

export default {
  fetch: app.fetch,
  // Hourly: expire inactive push subscriptions and retry failed Alchemy address removals (#67).
  scheduled: async (_event: ScheduledController, env: Env['Bindings']) => {
    await sweep(env)
  },
} satisfies ExportedHandler<Env['Bindings']>
export { EtherscanBucket } from './bucket.ts'
