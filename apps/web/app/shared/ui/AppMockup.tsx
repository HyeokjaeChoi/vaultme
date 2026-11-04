// Figma: B-S10 Home 404:163 (light) / 430:14606 (dark), the current Home screen (the Web/App mockup component 759:150 still draws the old
// one). The top 452 of its 844 pt, scaled to 320 wide, with round top corners: the phone runs off the bottom edge of the hero. The single LCP image of the landing page.
// AVIF with a WebP fallback, light and dark. The dark sources come first; the theme script (shared/lib/theme.ts) flips
// their `media` when the chosen theme differs from the system one.
// 640 x 904 files shown at 320 x 452 (2x, so phones stay sharp: Lighthouse image-size-responsive). Made from the Figma PNG export at 2x
// (780 x 1688), resized to 640 wide, cropped and masked with sharp (AVIF q60, WebP q82).
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
    <picture className="block shrink-0">
      <source type="image/avif" srcSet={darkAvif} media={DARK_MEDIA} data-theme-media />
      <source type="image/webp" srcSet={darkWebp} media={DARK_MEDIA} data-theme-media />
      <source type="image/avif" srcSet={lightAvif} />
      <img src={lightWebp} width={320} height={452} alt={alt} fetchPriority="high" decoding="async" />
    </picture>
  )
}
