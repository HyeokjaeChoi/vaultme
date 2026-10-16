// Figma: Icon set 137:3 (Phosphor regular; Icon button swap slot 67:205 / Icon / swappable action 158:506; Icon / action / backspace 330:2747)
import { View } from 'react-native'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ArrowsClockwise,
  Backspace,
  CaretRight,
  CheckCircle,
  CircleNotch,
  Clock,
  Copy,
  DotsThree,
  GearSix,
  Info,
  ListBullets,
  LockKey,
  Question,
  Wallet,
  Warning,
  XCircle,
  type Icon as PhosphorIcon,
} from 'phosphor-react-native'

// Phosphor regular only (wallet-icon-guide §1). Decorative: hidden from screen readers; the label next to it carries the meaning.
const ICONS = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  wallet: Wallet,
  account: Wallet,
  pending: Clock,
  confirmed: CheckCircle,
  failed: XCircle,
  warning: Warning,
  danger: XCircle,
  info: Info,
  unknown: Question,
  clear: Info,
  assets: Wallet,
  activity: ListBullets,
  settings: GearSix,
  disclosure: CaretRight,
  back: ArrowLeft,
  backspace: Backspace,
  more: DotsThree,
  copy: Copy,
  backup: LockKey,
  loading: CircleNotch,
  refresh: ArrowsClockwise,
} satisfies Record<string, PhosphorIcon>

export type IconName = keyof typeof ICONS

export function Icon({ name, size, color }: { name: IconName; size: number; color: string }) {
  const Glyph = ICONS[name]
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Glyph size={size} color={color} weight="regular" />
    </View>
  )
}
