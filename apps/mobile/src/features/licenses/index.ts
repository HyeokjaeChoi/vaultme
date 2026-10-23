import data from '@/generated/licenses.json'

/** One row of S64. `text` is a key into `texts` (null = the package ships no license file). `url` = where to read the original (assets only). */
export type LicenseEntry = {
  name: string
  display?: string
  version: string | null
  license: string
  copyright: string | null
  text: string | null
  url?: string
}
const all = data as unknown as { assets: LicenseEntry[]; libs: LicenseEntry[]; texts: Record<string, string> }

/** Generated at build time by scripts/generate-licenses.mjs from the installed dependency closure (transitive included). */
export const assetLicenses = all.assets
export const libLicenses = all.libs
export const findLicense = (name: string, version?: string) =>
  [...all.assets, ...all.libs].find((e) => e.name === name && (e.version ?? undefined) === version)
export const licenseText = (e: LicenseEntry): string | null => (e.text ? (all.texts[e.text] ?? null) : null)
export const licenseTitle = (e: LicenseEntry) => e.display ?? e.name
