import { config } from 'zod/v4/core'

// zod 4 probes `Function('')` when it builds its first schema, to learn whether it may compile parsers. A page whose CSP has no
// 'unsafe-eval' (the web app) reports each probe as a `securitypolicyviolation`, although zod catches the error (#515).
// `jitless` skips the probe (https://zod.dev/compile, zod 4.6.7). This module is the first import of the entry, so it runs before
// any schema of this package exists, in whichever chunk a bundler puts them. Workers (zod skips the probe there) and Hermes (no
// `Function`) parse as before; node tests lose only the compiled fast path. Remove when zod stops probing under a CSP.
config({ jitless: true })
