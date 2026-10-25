// Figma: B/Address 494:1090 (Size = M)
// The full address in IBM Plex Mono, never truncated: the first 6 and the last 4 characters strong in text/primary,
// the middle in text/secondary (helps to see address poisoning). One run, natural wrap, as on mobile (AddressText).
// The strong parts sit at the top of the line box: while a weight of the web font is still loading, they are drawn in
// another font, and baseline alignment would make the line taller (a layout shift).
const HEAD = 6
const TAIL = 4

export function AddressText({ address }: { address: string }) {
  return (
    <p className="font-mono text-address-m text-text-secondary px-row-b-padding-x min-w-px flex-1 break-all">
      <span className="text-text-primary align-top font-semibold">{address.slice(0, HEAD)}</span>
      {address.slice(HEAD, -TAIL)}
      <span className="text-text-primary align-top font-semibold">{address.slice(-TAIL)}</span>
    </p>
  )
}
