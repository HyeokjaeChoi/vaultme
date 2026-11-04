// Figma: Web/Icon button 756:94 (copy). After a copy the icon is a check for 1.5 s and a polite live region says
// "복사했어요" (B/Button Copied state 398:247).
import { useEffect, useState } from 'react'
import { pressTransition } from './ButtonLink'
import { Icon } from './Icon'

const COPIED_MS = 1500
const swap =
  'size-icon-button-icon-size absolute inset-0 motion-safe:transition-opacity motion-safe:duration-enter motion-safe:ease-enter'

export function CopyButton({ text, label, copied }: { text: string | null; label: string; copied: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), COPIED_MS)
    return () => clearTimeout(t)
  }, [done])
  return (
    <>
      <button
        type="button"
        aria-label={label}
        disabled={text === null}
        onClick={() => {
          if (text === null) return
          // In a promise, so a browser with no Clipboard API (http, old browsers) rejects instead of throwing.
          Promise.resolve()
            .then(() => navigator.clipboard.writeText(text))
            .then(
              () => setDone(true),
              () => undefined, // no clipboard (permission or API): the address is on screen to select
            )
        }}
        className={`${pressTransition} bg-icon-button-bg-default hover:bg-icon-button-bg-hover active:bg-icon-button-bg-pressed text-icon-button-fg rounded-icon-button-radius size-icon-button-hit-target inline-flex shrink-0 cursor-pointer items-center justify-center`}
      >
        {/* Both icons stay mounted and cross-fade (opacity only: no token for a scale). */}
        <span className="size-icon-button-icon-size relative">
          <Icon name="copy" className={`${swap} ${done ? 'opacity-0' : 'opacity-100'}`} />
          <Icon name="check" className={`${swap} ${done ? 'opacity-100' : 'opacity-0'}`} />
        </span>
      </button>
      <span role="status" className="sr-only">
        {done ? copied : ''}
      </span>
    </>
  )
}
