// Figma: B/Status chip 494:1067 (Network, neutral; not a button)
export function StatusChip({ children }: { children: string }) {
  return (
    <span className="bg-chip-bg text-chip-fg text-product-b-caption rounded-pill px-2 py-1 whitespace-nowrap">
      {children}
    </span>
  )
}
