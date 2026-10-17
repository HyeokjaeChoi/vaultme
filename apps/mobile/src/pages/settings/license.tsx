// Figma: B-S65 라이선스 전문 526:55042 (dark 526:55830; no-file state with the npm link row, Flow 5 2026-10-17): Title block (name, version · license), Section band, Block with the copyright line and the full license text
import { useLocalSearchParams } from 'expo-router'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { findLicense, licenseText, licenseTitle } from '@/features/licenses'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Block, ListItem, Screen, ScreenHeader, SectionBand, Text } from '@/shared/ui'

/** B-S65 라이선스 전문: the copyright line and the license text exactly as the package ships it (English, never translated: legal original). */
export function LicensePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { name, version } = useLocalSearchParams<{ name: string; version?: string }>()
  const entry = findLicense(name, version)
  const raw = entry ? licenseText(entry) : null
  // The copyright line is shown above the text (Figma 526:55124), so it is not repeated in the body.
  const text = raw && entry?.copyright ? raw.replace(entry.copyright, '').replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n') : raw
  return (
    <Screen bleed gap="none" topGap="none" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings/licenses')} />}>
      {entry ? (
        <>
          <View style={{ gap: th.semantic.layout.fieldGap, paddingHorizontal: th.semantic.layout.screen.padding, paddingTop: th.primitive.space[2], paddingBottom: th.semantic.layout.groupGap }}>
            <Text variant="title2" accessibilityRole="header">{licenseTitle(entry)}</Text>
            <Text variant="fact" color={th.semantic.text.secondary}>{entry.version ? `v${entry.version} · ${entry.license}` : entry.license}</Text>
          </View>
          <SectionBand />
          <Block>
            {entry.copyright ? <Text variant="label">{entry.copyright}</Text> : null}
            {text ? (
              <Text variant="bodySmall" color={th.semantic.text.secondary} selectable>{text}</Text>
            ) : (
              <>
                <Text variant="bodySmall" color={th.semantic.text.secondary}>{t('settings.licensesScreen.noText')}</Text>
                {/* No license file in the package: the original is read on npm (external browser), never made up. */}
                <ListItem
                  title={t('settings.licensesScreen.npm')}
                  trailing={{ kind: 'external' }}
                  onPress={() => void Linking.openURL(`https://www.npmjs.com/package/${entry.name}`).catch(() => undefined)}
                />
              </>
            )}
          </Block>
        </>
      ) : null}
    </Screen>
  )
}
