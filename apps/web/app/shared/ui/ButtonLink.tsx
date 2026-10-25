import type { ComponentProps } from 'react'

// Figma: B/Button 398:247 (a link that looks like a button: navigation, not an action)
const variants = {
  primary: 'bg-button-b-primary-bg text-button-b-primary-fg h-button-b-height-lg px-button-b-padding-x-lg',
  secondary:
    'bg-button-b-secondary-bg active:bg-button-b-secondary-bg-pressed text-button-b-secondary-fg h-button-b-height-lg px-button-b-padding-x-lg',
  // Header and footer links: 48px pill, no fill.
  ghost:
    'hover:bg-surface-hover active:bg-surface-pressed text-text-primary h-button-b-height-md px-button-b-padding-x-md',
  footer:
    'bg-button-b-secondary-bg active:bg-button-b-secondary-bg-pressed text-button-b-secondary-fg h-button-b-height-md px-button-b-padding-x-md',
} as const

export type ButtonLinkVariant = keyof typeof variants

type Props = ComponentProps<'a'> & { variant: ButtonLinkVariant }

export const buttonClass = (variant: ButtonLinkVariant, className = '') =>
  `text-product-b-headline rounded-button-b-radius inline-flex items-center justify-center gap-2 whitespace-nowrap ${variants[variant]} ${className}`

export function ButtonLink({ variant, className = '', ...props }: Props) {
  return <a {...props} className={buttonClass(variant, className)} />
}
