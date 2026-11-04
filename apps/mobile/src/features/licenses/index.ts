import data from '@/generated/licenses.json'

/** The versions of one package that share a license text. `text` is a key into `texts` (null = the package ships no license file). */
export type LicenseVariant = { versions: string[]; license: string; copyright: string | null; text: string | null }
/** One row of S64: one package name; `variants` = one per distinct license text (S65 shows each). `url` = where to read the original (assets only). */
export type LicenseEntry = { name: string; display?: string; license: string; variants: LicenseVariant[]; url?: string }
const all = data as unknown as { assets: LicenseEntry[]; libs: LicenseEntry[]; texts: Record<string, string> }

/** Generated at build time by scripts/generate-licenses.mjs from the installed dependency closure (transitive included). */
export const assetLicenses = all.assets
export const libLicenses = all.libs
export const findLicense = (name: string) => [...all.assets, ...all.libs].find((e) => e.name === name)
export const licenseText = (v: LicenseVariant): string | null => (v.text ? (all.texts[v.text] ?? null) : null)
export const licenseTitle = (e: LicenseEntry) => e.display ?? e.name
