// Figma: Icon set 137:3 (Icon / status / info 137:213, Icon / status / failed 137:110, Icon / action / copy 137:144)
// Icons by 480 Design, Solar Icon Set (Linear), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes were made: resized.
// Paths as in @solar-icons/react-native 2.3.2 (the mobile Icon.tsx source). Decorative: the label next to it carries the meaning.
const paths = {
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 17V11" />
      <path d="M12 8H12.0001" strokeLinejoin="round" />
    </>
  ),
  failed: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" />
    </>
  ),
  copy: (
    <>
      <path d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z" />
      <path d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5" />
    </>
  ),
  check: <path d="M5 13L9 17L19 7" />,
} as const

export type IconName = keyof typeof paths

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={`size-icon-size-control shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  )
}
