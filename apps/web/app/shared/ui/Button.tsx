// Figma: B/Button 398:247 (an action; ButtonLink.tsx is the navigation look-alike)
import type { ComponentProps } from 'react'
import { type ButtonVariant, buttonClass } from './ButtonLink'

type Props = ComponentProps<'button'> & { variant: ButtonVariant }

export function Button({ variant, className, type = 'button', ...props }: Props) {
  return <button {...props} type={type} className={buttonClass(variant, `cursor-pointer ${className ?? ''}`)} />
}
