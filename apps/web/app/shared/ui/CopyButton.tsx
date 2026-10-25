// Figma: Web/Icon button 756:94 (copy). After a copy the icon is a check for 1.5 s and a polite live region says
// "복사했어요" (B/Button Copied state 398:247).
import { useEffect, useState } from 'react'
import { Icon } from './Icon'

const COPIED_MS = 1500

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
          navigator.clipboard.writeText(text).then(
            () => setDone(true),
            () => undefined, // no clipboard permission: the address is on screen to select
          )
        }}
        className="bg-icon-button-bg-default hover:bg-icon-button-bg-hover active:bg-icon-button-bg-pressed text-icon-button-fg rounded-icon-button-radius size-icon-button-hit-target inline-flex shrink-0 cursor-pointer items-center justify-center"
      >
        <Icon name={done ? 'check' : 'copy'} className="size-icon-button-icon-size" />
      </button>
      <span role="status" className="sr-only">
        {done ? copied : ''}
      </span>
    </>
  )
}
