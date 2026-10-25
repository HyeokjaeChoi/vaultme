import { type ComponentProps, useId } from 'react'

// Figma: B/Input 421:805 (Kind=Text, address in IBM Plex Mono; State=Default / Error). The error replaces the helper
// text and is announced (role=alert); the field keeps its size, so nothing below moves more than the text does.
type Props = Omit<ComponentProps<'input'>, 'className'> & { label: string; helper: string; error: string | null }

export function AddressField({ label, helper, error, ...input }: Props) {
  const id = useId()
  return (
    <div className="gap-input-field-gap px-row-b-padding-x flex flex-col py-2">
      <label htmlFor={id} className="text-product-b-label text-input-label">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error !== null}
        aria-describedby={`${id}-help`}
        className={`bg-input-bg-default text-input-fg placeholder:text-input-placeholder rounded-input-radius px-input-padding-x min-h-button-b-height-lg font-mono text-product-b-address w-full border py-4 ${error ? 'border-input-border-error' : 'border-transparent'}`}
      />
      {error ? (
        <p id={`${id}-help`} role="alert" className="text-product-b-caption text-input-error-text">
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className="text-product-b-caption text-input-helper">
          {helper}
        </p>
      )}
    </div>
  )
}
