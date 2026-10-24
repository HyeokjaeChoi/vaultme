// Types for the plain .mjs module, so tests get typed imports.
export const designPath: string
export const tokensPath: string
export function frontMatter(src: unknown, theme?: string): string
export const withFrontMatter: (doc: string, fm: string) => string
