// Figma: Icon / navigation / back 137:161, Icon / action / external 520:27859 (the transaction page only;
// kept apart from Icon.tsx so the address viewer does not ship them: viewer JS budget)
// Icons by 480 Design, Solar Icon Set (Linear), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Paths as in @solar-icons/react-native 2.3.2.
// Decorative: the label next to it (or the title of the state) carries the meaning.
const paths = {
  back: <path d="M20 12H4M10 18L4 12L10 6" strokeLinejoin="round" />,
  external: (
    <>
      <path d="M9 15L15 9M15 13.5V9H10.5" strokeLinejoin="round" />
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" />
    </>
  ),
} as const

export function TxIcon({ name, className }: { name: keyof typeof paths; className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={`shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  )
}
