// Test-only: avoids adding @types/node just for util.inspect.
declare module 'node:util' {
  export function inspect(value: unknown, options?: { depth?: number }): string
}
