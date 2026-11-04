import type { ComponentProps } from 'react'

// Figma: B/Button 398:247 (a link that looks like a button: navigation, not an action; Button.tsx is the action)
// States: hover and active on every variant; a disabled one (`disabled` or `aria-disabled`) is grey and shows why it does not react.
const disabled =
  'aria-disabled:cursor-not-allowed aria-disabled:bg-surface-disabled aria-disabled:text-text-disabled disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-disabled'
const variants = {
  primary: `bg-button-b-primary-bg text-button-b-primary-fg hover:bg-button-primary-bg-hover active:bg-button-primary-bg-pressed aria-disabled:cursor-not-allowed aria-disabled:bg-button-b-primary-bg-disabled aria-disabled:text-button-b-primary-fg-disabled disabled:cursor-not-allowed disabled:bg-button-b-primary-bg-disabled disabled:text-button-b-primary-fg-disabled h-button-b-height-lg px-button-b-padding-x-lg`,
  secondary: `bg-button-b-secondary-bg hover:bg-surface-hover active:bg-button-b-secondary-bg-pressed text-button-b-secondary-fg ${disabled} h-button-b-height-lg px-button-b-padding-x-lg`,
  // Header link: 48px pill, no fill. 12 px side padding below 768 px: with the 20 px of Figma the header is wider than 375 px
  // when the system font is wider than Pretendard (Linux CI Chrome, before the web font loads).
  ghost:
    'hover:bg-surface-hover active:bg-surface-pressed text-text-primary h-button-b-height-md tablet:px-button-b-padding-x-md px-3',
  // Secondary, 48px: footer link, example chips, retry.
  secondaryMd: `bg-button-b-secondary-bg hover:bg-surface-hover active:bg-button-b-secondary-bg-pressed text-button-b-secondary-fg ${disabled} h-button-b-height-md px-button-b-padding-x-md`,
} as const

export type ButtonVariant = keyof typeof variants

/** Hover and press fill ease in 120 ms and out 160 ms (color only, no scale on the web). Off under reduced motion. Shared with the icon buttons. */
export const pressTransition = 'press-fill motion-safe:hover:duration-fast'

/** The B/Button look, shared by links (ButtonLink, router Link) and buttons (Button). */
export const buttonClass = (variant: ButtonVariant, className = '') =>
  `text-product-b-headline rounded-button-b-radius inline-flex items-center justify-center gap-2 whitespace-nowrap ${pressTransition} ${variants[variant]} ${className}`

type Props = ComponentProps<'a'> & { variant: ButtonVariant }

export function ButtonLink({ variant, className, ...props }: Props) {
  return <a {...props} className={buttonClass(variant, className)} />
}
