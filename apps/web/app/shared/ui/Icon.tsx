// Figma: Icon set 137:3 (Icon / status / info 137:213, Icon / status / failed 137:110, Icon / status / warning 137:92, Icon / action / copy 137:144,
// Icon / navigation / back 137:161, Icon / action / external 520:27859)
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
  back: <path d="M20 12H4M10 18L4 12L10 6" strokeLinejoin="round" />,
  external: (
    <>
      <path d="M9 15L15 9M15 13.5V9H10.5" strokeLinejoin="round" />
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" />
    </>
  ),
  warning: (
    <>
      <path d="M5.31171 10.7615C8.23007 5.58716 9.68925 3 12 3C14.3107 3 15.7699 5.58716 18.6883 10.7615L19.0519 11.4063C21.4771 15.7061 22.6897 17.856 21.5937 19.428C20.4978 21 17.7864 21 12.3637 21H11.6363C6.21356 21 3.50217 21 2.40626 19.428C1.31034 17.856 2.52291 15.7061 4.94805 11.4063L5.31171 10.7615Z" />
      <path d="M12 8V13" />
      <path d="M12 16H12.0001" strokeLinejoin="round" />
    </>
  ),
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
      className={`${className.includes('size-') ? '' : 'size-icon-size-control'} shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  )
}
