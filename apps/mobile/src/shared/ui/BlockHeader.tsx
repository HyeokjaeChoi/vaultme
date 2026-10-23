// Figma: B/Block header 494:342 (Title, Link, Show link), Block frames 494:19449
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = {
  title?: string
  link?: string
  onLink?: () => void
  /** Space between header and children (default space-2; settings rows use space-1, Figma 515:45392). */ gap?: number
  children?: ReactNode
}

/**
 * A band-separated block: padding sectionBand.blockPaddingY (20) above and below, screen padding at the sides, gap space-2.
 * The Label header (text/tertiary) has an optional action link (수정, 접기, 거래 상세) with a 44 pt hit area.
 */
export function Block({ title, link, onLink, gap, children }: Props) {
  const t = useTheme()
  return (
    <View
      style={{
        paddingVertical: t.component.sectionBand.blockPaddingY,
        paddingHorizontal: t.semantic.layout.screen.padding,
        gap: gap ?? t.primitive.space[2],
      }}
    >
      {title ? (
        <View
          accessibilityRole="header"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="label" color={t.semantic.text.tertiary}>
            {title}
          </Text>
          {link ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${link} ${title}`}
              onPress={onLink}
              hitSlop={{ top: t.primitive.space[3], bottom: t.primitive.space[3], left: t.primitive.space[3] }}
            >
              <Text variant="link" color={t.semantic.text.link}>
                {link}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}
