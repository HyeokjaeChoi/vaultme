import type { Page } from '@playwright/test'

/** Waits for the finite animations (the fade-in of loaded content) so axe reads the final colors. The skeleton pulse never ends and is skipped. */
export const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  )
