import { getRandomValues } from 'expo-crypto'

// Hermes has no Web Crypto. @noble/hashes (used by @scure/bip39 to generate the phrase) needs
// `crypto.getRandomValues`; expo-crypto provides it from the OS CSPRNG.
const g = globalThis as unknown as { crypto?: Record<string, unknown> }
if (typeof g.crypto?.getRandomValues !== 'function') g.crypto = { ...g.crypto, getRandomValues }
