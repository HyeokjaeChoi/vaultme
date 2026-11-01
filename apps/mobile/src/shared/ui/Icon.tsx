// Figma: Icon set 137:3 (Solar Linear/Bold/Bold Duotone; Icon button swap slot 67:205; Icon / action / qr 434:230, more 434:235; navigation / assets 506:24468; hero 506:26134..; DESIGN.md Icons)
// Icons by 480 Design, Solar Icon Set, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes were made: resized and recolored. Code: @solar-icons/react-native (MIT).
import { View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { AltArrowRightIcon as AltArrowRightIconL } from '@solar-icons/react-native/linear/alt-arrow-right'
import { AltArrowDownIcon as AltArrowDownIconL } from '@solar-icons/react-native/linear/alt-arrow-down'
import { AltArrowUpIcon as AltArrowUpIconL } from '@solar-icons/react-native/linear/alt-arrow-up'
import { ArrowLeftDownIcon as ArrowLeftDownIconL } from '@solar-icons/react-native/linear/arrow-left-down'
import { ArrowLeftIcon as ArrowLeftIconL } from '@solar-icons/react-native/linear/arrow-left'
import { ArrowRightUpIcon as ArrowRightUpIconL } from '@solar-icons/react-native/linear/arrow-right-up'
import { BackspaceIcon as BackspaceIconL } from '@solar-icons/react-native/linear/backspace'
import { BellIcon as BellIconL } from '@solar-icons/react-native/linear/bell'
import { CheckCircleIcon as CheckCircleIconB } from '@solar-icons/react-native/bold/check-circle'
import { CheckCircleIcon as CheckCircleIconD } from '@solar-icons/react-native/bold-duotone/check-circle'
import { CheckCircleIcon as CheckCircleIconL } from '@solar-icons/react-native/linear/check-circle'
import { CheckIcon as CheckIconL } from '@solar-icons/react-native/linear/check'
import { ClockCircleIcon as ClockCircleIconB } from '@solar-icons/react-native/bold/clock-circle'
import { ClockCircleIcon as ClockCircleIconD } from '@solar-icons/react-native/bold-duotone/clock-circle'
import { ClockCircleIcon as ClockCircleIconL } from '@solar-icons/react-native/linear/clock-circle'
import { CloseCircleIcon as CloseCircleIconB } from '@solar-icons/react-native/bold/close-circle'
import { CloseCircleIcon as CloseCircleIconD } from '@solar-icons/react-native/bold-duotone/close-circle'
import { CloseCircleIcon as CloseCircleIconL } from '@solar-icons/react-native/linear/close-circle'
import { CloseIcon as CloseIconL } from '@solar-icons/react-native/linear/close'
import { CloudCrossIcon as CloudCrossIconD } from '@solar-icons/react-native/bold-duotone/cloud-cross'
import { CopyIcon as CopyIconL } from '@solar-icons/react-native/linear/copy'
import { DangerTriangleIcon as DangerTriangleIconB } from '@solar-icons/react-native/bold/danger-triangle'
import { DangerTriangleIcon as DangerTriangleIconL } from '@solar-icons/react-native/linear/danger-triangle'
import { DocumentTextIcon as DocumentTextIconL } from '@solar-icons/react-native/linear/document-text'
import { EyeIcon as EyeIconL } from '@solar-icons/react-native/linear/eye'
import { EyeClosedIcon as EyeClosedIconL } from '@solar-icons/react-native/linear/eye-closed'
import { GlobalIcon as GlobalIconL } from '@solar-icons/react-native/linear/global'
import { HandMoneyIcon as HandMoneyIconL } from '@solar-icons/react-native/linear/hand-money'
import { HistoryIcon as HistoryIconB } from '@solar-icons/react-native/bold/history'
import { HistoryIcon as HistoryIconL } from '@solar-icons/react-native/linear/history'
import { Home2Icon as Home2IconB } from '@solar-icons/react-native/bold/home-2'
import { Home2Icon as Home2IconL } from '@solar-icons/react-native/linear/home-2'
import { InboxInIcon as InboxInIconD } from '@solar-icons/react-native/bold-duotone/inbox-in'
import { InfoCircleIcon as InfoCircleIconB } from '@solar-icons/react-native/bold/info-circle'
import { InfoCircleIcon as InfoCircleIconL } from '@solar-icons/react-native/linear/info-circle'
import { KeyMinimalisticIcon as KeyMinimalisticIconL } from '@solar-icons/react-native/linear/key-minimalistic'
import { MenuDotsIcon as MenuDotsIconL } from '@solar-icons/react-native/linear/menu-dots'
import { QrCodeIcon as QrCodeIconL } from '@solar-icons/react-native/linear/qr-code'
import { QuestionCircleIcon as QuestionCircleIconB } from '@solar-icons/react-native/bold/question-circle'
import { QuestionCircleIcon as QuestionCircleIconD } from '@solar-icons/react-native/bold-duotone/question-circle'
import { QuestionCircleIcon as QuestionCircleIconL } from '@solar-icons/react-native/linear/question-circle'
import { RefreshCircleIcon as RefreshCircleIconB } from '@solar-icons/react-native/bold/refresh-circle'
import { RefreshIcon as RefreshIconL } from '@solar-icons/react-native/linear/refresh'
import { RoundArrowLeftDownIcon as RoundArrowLeftDownIconB } from '@solar-icons/react-native/bold/round-arrow-left-down'
import { RoundArrowRightUpIcon as RoundArrowRightUpIconB } from '@solar-icons/react-native/bold/round-arrow-right-up'
import { SettingsIcon as SettingsIconB } from '@solar-icons/react-native/bold/settings'
import { SettingsIcon as SettingsIconL } from '@solar-icons/react-native/linear/settings'
import { ShareIcon as ShareIconL } from '@solar-icons/react-native/linear/share'
import { ShieldCheckIcon as ShieldCheckIconD } from '@solar-icons/react-native/bold-duotone/shield-check'
import { ShieldCheckIcon as ShieldCheckIconL } from '@solar-icons/react-native/linear/shield-check'
import { ShieldWarningIcon as ShieldWarningIconD } from '@solar-icons/react-native/bold-duotone/shield-warning'
import { ShieldUserIcon as ShieldUserIconL } from '@solar-icons/react-native/linear/shield-user'
import { ShieldWarningIcon as ShieldWarningIconL } from '@solar-icons/react-native/linear/shield-warning'
import { SquareArrowRightUpIcon as SquareArrowRightUpIconL } from '@solar-icons/react-native/linear/square-arrow-right-up'
import { WalletIcon as WalletIconL } from '@solar-icons/react-native/linear/wallet'

// Figma: Icon / hero / face 516:288 = Solar face-scan-square-linear with the mouth removed (no smiley). Modified from Solar (480 Design, CC BY 4.0, attribution in the license screen); drawn here because Solar has no mouthless variant.
const FACE_PATHS = [
  'M19.5558 13.1111C19.5558 12.7429 19.8542 12.4444 20.2224 12.4444C20.5905 12.4446 20.8891 12.743 20.8891 13.1111C20.8891 14.7683 20.8906 16.0784 20.753 17.1013C20.6129 18.1435 20.3174 18.9869 19.6521 19.6521C18.9869 20.3174 18.1435 20.6129 17.1013 20.753C16.0784 20.8906 14.7683 20.8891 13.1111 20.8891C12.743 20.8891 12.4446 20.5905 12.4444 20.2224C12.4444 19.8542 12.7429 19.5558 13.1111 19.5558C14.806 19.5558 16.0101 19.5542 16.9236 19.4314C17.8179 19.3112 18.3333 19.0856 18.7094 18.7094C19.0856 18.3333 19.3112 17.8179 19.4314 16.9236C19.5542 16.0101 19.5558 14.806 19.5558 13.1111Z',
  'M1.77778 13.1111C1.77778 12.7429 2.07626 12.4444 2.44444 12.4444C2.81263 12.4444 3.11111 12.7429 3.11111 13.1111C3.11111 14.806 3.11265 16.0101 3.23546 16.9236C3.3557 17.8179 3.5813 18.3333 3.95747 18.7094C4.33365 19.0855 4.84907 19.3112 5.74327 19.4314C6.65671 19.5542 7.86101 19.5558 9.55577 19.5558C9.92386 19.5559 10.2224 19.8543 10.2224 20.2224C10.2223 20.5905 9.92379 20.889 9.55577 20.8891C7.89865 20.8891 6.58848 20.8905 5.56554 20.753C4.52345 20.6129 3.67995 20.3173 3.01476 19.6521C2.34953 18.9869 2.05396 18.1435 1.91385 17.1013C1.77631 16.0784 1.77778 14.7683 1.77778 13.1111Z',
  'M1.77778 9.55577C1.77778 7.89864 1.77634 6.58848 1.91385 5.56554C2.05396 4.52339 2.34955 3.67997 3.01476 3.01476C3.67997 2.34955 4.52339 2.05396 5.56554 1.91385C6.58848 1.77634 7.89864 1.77778 9.55577 1.77778C9.92386 1.7779 10.2224 2.07633 10.2224 2.44444C10.2224 2.81256 9.92386 3.11099 9.55577 3.11111C7.86099 3.11111 6.65672 3.11268 5.74327 3.23546C4.84897 3.3557 4.33366 3.58128 3.95747 3.95747C3.58128 4.33366 3.3557 4.84897 3.23546 5.74327C3.11268 6.65672 3.11111 7.86099 3.11111 9.55577C3.11099 9.92386 2.81256 10.2224 2.44444 10.2224C2.07633 10.2224 1.7779 9.92386 1.77778 9.55577Z',
  'M19.5558 9.55577C19.5558 7.86101 19.5542 6.65671 19.4314 5.74327C19.3112 4.84907 19.0855 4.33365 18.7094 3.95747C18.3333 3.5813 17.8179 3.3557 16.9236 3.23546C16.0101 3.11265 14.806 3.11111 13.1111 3.11111C12.7429 3.11111 12.4444 2.81263 12.4444 2.44444C12.4444 2.07626 12.7429 1.77778 13.1111 1.77778C14.7683 1.77778 16.0784 1.77631 17.1013 1.91385C18.1435 2.05396 18.9869 2.34953 19.6521 3.01476C20.3173 3.67995 20.6129 4.52345 20.753 5.56554C20.8905 6.58848 20.8891 7.89865 20.8891 9.55577C20.889 9.92379 20.5905 10.2223 20.2224 10.2224C19.8543 10.2224 19.5559 9.92386 19.5558 9.55577Z',
  'M8 10.4444V9.11111C8 8.74292 8.29848 8.44444 8.66667 8.44444C9.03486 8.44444 9.33333 8.74292 9.33333 9.11111V10.4444C9.33333 10.8126 9.03486 11.1111 8.66667 11.1111C8.29848 11.1111 8 10.8126 8 10.4444Z',
  'M13.3333 10.4444V9.11111C13.3333 8.74292 13.6318 8.44444 14 8.44444C14.3682 8.44444 14.6667 8.74292 14.6667 9.11111V10.4444C14.6667 10.8126 14.3682 11.1111 14 11.1111C13.6318 11.1111 13.3333 10.8126 13.3333 10.4444Z',
  'M10.6665 9.11111C10.6665 8.74299 10.965 8.44456 11.3331 8.44444C11.7013 8.44444 11.9998 8.74292 11.9998 9.11111V12.6665C11.9998 13.0346 11.7013 13.3331 11.3331 13.3331H10.4444C10.0763 13.3331 9.77778 13.0346 9.77778 12.6665C9.7779 12.2984 10.0763 11.9998 10.4444 11.9998H10.6665V9.11111Z',
]
function FaceScanGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21.3333 21.3333" fill="none">
      {FACE_PATHS.map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  )
}

// Busy spinner (Figma Icon / status / loading 137:178): a 3/4 ring, round caps, 1.5 stroke on the 24 grid like the Solar Linear set. Not in Solar, so drawn here.
const RING_R = 9
const RING = 2 * Math.PI * RING_R
function SpinnerGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={RING_R}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={`${String(RING * 0.75)} ${String(RING)}`}
        transform="rotate(-90 12 12)"
      />
    </Svg>
  )
}

// Linear = default UI, Bold = selected tab / status badge / active, Duotone = empty-state and result heroes (48 pt).
const LINEAR = {
  send: ArrowRightUpIconL,
  receive: ArrowLeftDownIconL,
  wallet: WalletIconL,
  account: WalletIconL,
  pending: ClockCircleIconL,
  confirmed: CheckCircleIconL,
  failed: CloseCircleIconL,
  warning: DangerTriangleIconL,
  danger: CloseCircleIconL,
  info: InfoCircleIconL,
  unknown: QuestionCircleIconL,
  clear: InfoCircleIconL,
  assets: Home2IconL,
  activity: HistoryIconL,
  settings: SettingsIconL,
  disclosure: AltArrowRightIconL,
  back: ArrowLeftIconL,
  backspace: BackspaceIconL,
  more: MenuDotsIconL,
  copy: CopyIconL,
  backup: ShieldCheckIconL,
  loading: SpinnerGlyph,
  refresh: RefreshIconL,
  close: CloseIconL,
  check: CheckIconL,
  qr: QrCodeIconL,
  external: SquareArrowRightUpIconL,
  share: ShareIconL,
  key: KeyMinimalisticIconL,
  bell: BellIconL,
  eye: EyeIconL,
  eyeClosed: EyeClosedIconL,
  expand: AltArrowDownIconL,
  collapse: AltArrowUpIconL,
  network: GlobalIconL,
  deviceWarning: ShieldWarningIconL,
  shieldUser: ShieldUserIconL,
  document: DocumentTextIconL,
  face: FaceScanGlyph,
  hand: HandMoneyIconL,
} as const
const BOLD = {
  assets: Home2IconB,
  activity: HistoryIconB,
  settings: SettingsIconB,
  pending: ClockCircleIconB,
  confirmed: CheckCircleIconB,
  failed: CloseCircleIconB,
  warning: DangerTriangleIconB,
  info: InfoCircleIconB,
  unknown: QuestionCircleIconB,
  sent: RoundArrowRightUpIconB,
  received: RoundArrowLeftDownIconB,
  replaced: RefreshCircleIconB,
  danger: CloseCircleIconB,
  clear: InfoCircleIconB,
} as const
const DUOTONE = {
  receive: InboxInIconD,
  confirmed: CheckCircleIconD,
  failed: CloseCircleIconD,
  pending: ClockCircleIconD,
  unknown: QuestionCircleIconD,
  backup: ShieldCheckIconD,
  deviceWarning: ShieldWarningIconD,
  cloudCross: CloudCrossIconD,
} as const

export type IconName = keyof typeof LINEAR
export type BoldIconName = keyof typeof BOLD
export type HeroIconName = keyof typeof DUOTONE
type Props =
  | { name: IconName; size: number; color: string; weight?: 'linear' }
  | { name: BoldIconName; size: number; color: string; weight: 'bold' }
  | { name: HeroIconName; size: number; color: string; weight: 'duotone' }

/** Decorative: hidden from screen readers; the label next to it carries the meaning. Duotone back layer = same color at 50% (DESIGN.md, Icons). */
export function Icon({ name, size, color, weight = 'linear' }: Props) {
  const Glyph =
    weight === 'bold'
      ? BOLD[name as BoldIconName]
      : weight === 'duotone'
        ? DUOTONE[name as HeroIconName]
        : LINEAR[name as IconName]
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Glyph
        size={size}
        color={color}
        {...(weight === 'duotone' ? { secondaryColor: color, secondaryOpacity: 0.5 } : {})}
      />
    </View>
  )
}
