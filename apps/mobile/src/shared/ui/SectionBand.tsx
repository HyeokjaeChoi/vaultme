// Figma: B/Section band 494:341 (sectionBand.height / bg)
import { View } from 'react-native'
import { useTheme } from '../theme'

/** 12 pt grey band between blocks on detail screens (review, result, transaction detail, settings). Full bleed, no border, no shadow. Home and Activity stay flat white. */
export function SectionBand() {
  const t = useTheme()
  return <View accessible={false} style={{ height: t.component.sectionBand.height, backgroundColor: t.component.sectionBand.bg }} />
}
