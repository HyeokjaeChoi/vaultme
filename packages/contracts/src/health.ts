import { z } from 'zod'

export const HealthResponse = z.object({ ok: z.literal(true), version: z.string() }).meta({ id: 'HealthResponse' })
export type HealthResponse = z.infer<typeof HealthResponse>
