// Figma: Icon set 137:3 (Solar Linear/Bold/Bold Duotone; Icon button swap slot 67:205; Icon / action / qr 434:230, more 434:235; navigation / assets 506:24468; hero 506:26134..; wallet-icon-guide.md)
// Icons by 480 Design, Solar Icon Set, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes were made: resized and recolored. Code: @solar-icons/react-native (MIT).
import { View } from 'react-native'
import { AltArrowRightIcon as AltArrowRightIconL } from '@solar-icons/react-native/linear/alt-arrow-right'
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
import { FaceScanCircleIcon as FaceScanCircleIconD } from '@solar-icons/react-native/bold-duotone/face-scan-circle'
import { FaceScanCircleIcon as FaceScanCircleIconL } from '@solar-icons/react-native/linear/face-scan-circle'
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
import { RestartIcon as RestartIconL } from '@solar-icons/react-native/linear/restart'
import { RoundArrowLeftDownIcon as RoundArrowLeftDownIconB } from '@solar-icons/react-native/bold/round-arrow-left-down'
import { RoundArrowRightUpIcon as RoundArrowRightUpIconB } from '@solar-icons/react-native/bold/round-arrow-right-up'
import { SettingsIcon as SettingsIconB } from '@solar-icons/react-native/bold/settings'
import { SettingsIcon as SettingsIconL } from '@solar-icons/react-native/linear/settings'
import { ShareIcon as ShareIconL } from '@solar-icons/react-native/linear/share'
import { ShieldCheckIcon as ShieldCheckIconD } from '@solar-icons/react-native/bold-duotone/shield-check'
import { ShieldCheckIcon as ShieldCheckIconL } from '@solar-icons/react-native/linear/shield-check'
import { ShieldWarningIcon as ShieldWarningIconD } from '@solar-icons/react-native/bold-duotone/shield-warning'
import { ShieldWarningIcon as ShieldWarningIconL } from '@solar-icons/react-native/linear/shield-warning'
import { SquareArrowRightUpIcon as SquareArrowRightUpIconL } from '@solar-icons/react-native/linear/square-arrow-right-up'
import { WalletIcon as WalletIconL } from '@solar-icons/react-native/linear/wallet'

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
  loading: RestartIconL,
  refresh: RefreshIconL,
  close: CloseIconL,
  check: CheckIconL,
  qr: QrCodeIconL,
  external: SquareArrowRightUpIconL,
  share: ShareIconL,
  key: KeyMinimalisticIconL,
  bell: BellIconL,
  eye: EyeIconL,
  network: GlobalIconL,
  deviceWarning: ShieldWarningIconL,
  document: DocumentTextIconL,
  face: FaceScanCircleIconL,
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
  face: FaceScanCircleIconD,
} as const

export type IconName = keyof typeof LINEAR
export type BoldIconName = keyof typeof BOLD
export type HeroIconName = keyof typeof DUOTONE
type Props =
  | { name: IconName; size: number; color: string; weight?: 'linear' }
  | { name: BoldIconName; size: number; color: string; weight: 'bold' }
  | { name: HeroIconName; size: number; color: string; weight: 'duotone' }

/** Decorative: hidden from screen readers; the label next to it carries the meaning. Duotone back layer = same color at 50% (wallet-icon-guide §0). */
export function Icon({ name, size, color, weight = 'linear' }: Props) {
  const Glyph = weight === 'bold' ? BOLD[name as BoldIconName] : weight === 'duotone' ? DUOTONE[name as HeroIconName] : LINEAR[name as IconName]
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Glyph size={size} color={color} {...(weight === 'duotone' ? { secondaryColor: color, secondaryOpacity: 0.5 } : {})} />
    </View>
  )
}
