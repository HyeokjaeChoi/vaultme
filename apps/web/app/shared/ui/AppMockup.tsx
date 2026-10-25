// Figma: Web/App mockup 759:150 (the Home screen, 320 x 568: the single LCP image of the landing page)
// AVIF with a WebP fallback, light and dark. The dark sources come first; the theme script (shared/lib/theme.ts) flips
// their `media` when the chosen theme differs from the system one.
// 640 x 1136 files shown at 320 x 568 (2x, so phones stay sharp: Lighthouse image-size-responsive). The Figma export is 1x only,
// so the 2x files are the same screen rendered from the same tokens and Figma values (mean pixel difference to the 1x export: 3 of 255).
import darkAvif from '../../assets/hero-mockup-dark.avif'
import darkWebp from '../../assets/hero-mockup-dark.webp'
import lightAvif from '../../assets/hero-mockup-light.avif'
import lightWebp from '../../assets/hero-mockup-light.webp'

export const DARK_MEDIA = '(prefers-color-scheme: dark)'
export const LIGHT_MEDIA = 'not (prefers-color-scheme: dark)'

/** Preload both colour schemes' AVIF; the media query keeps the browser from fetching the wrong one. */
export function AppMockupPreload() {
  return (
    <>
      <link rel="preload" as="image" type="image/avif" href={lightAvif} media={LIGHT_MEDIA} fetchPriority="high" />
      <link rel="preload" as="image" type="image/avif" href={darkAvif} media={DARK_MEDIA} fetchPriority="high" />
    </>
  )
}

export function AppMockup({ alt }: { alt: string }) {
  return (
    // shrink-0: Figma lets the 320 px screen overflow the card padding at 375 px (card 343, padding 24); it stays 320.
    <picture className="shrink-0">
      <source type="image/avif" srcSet={darkAvif} media={DARK_MEDIA} data-theme-media />
      <source type="image/webp" srcSet={darkWebp} media={DARK_MEDIA} data-theme-media />
      <source type="image/avif" srcSet={lightAvif} />
      <img src={lightWebp} width={320} height={568} alt={alt} fetchPriority="high" decoding="async" />
    </picture>
  )
}
