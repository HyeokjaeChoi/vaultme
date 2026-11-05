// Figma: B-S65 라이선스 전문 526:55042 (dark 526:55830; no-file state with the npm link row, Flow 5 2026-10-17): Title block (name, version · license), Section band, Block with the copyright line and the full license text
import { useLocalSearchParams } from 'expo-router'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { findLicense, licenseText, licenseTitle, type LicenseVariant } from '@/features/licenses'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Block, ListItem, Screen, ScreenHeader, SectionBand, Text } from '@/shared/ui'

const versionsLabel = (versions: string[]) => versions.map((v) => `v${v}`).join(', ')

/**
 * B-S65 라이선스 전문: the copyright line and the license text exactly as the package ships it (English, never translated: legal original).
 * One package name can be installed in several versions: each distinct text gets its own Block, headed by the versions that share it.
 */
export function LicensePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { name } = useLocalSearchParams<{ name: string }>()
  const entry = findLicense(name)
  // The copyright line is shown above the text (Figma 526:55124), so it is not repeated in the body.
  const body = (v: LicenseVariant) => {
    const raw = licenseText(v)
    return raw && v.copyright
      ? raw
          .replace(v.copyright, '')
          .replace(/^\s+/, '')
          .replace(/\n{3,}/g, '\n\n')
      : raw
  }
  return (
    <Screen
      bleed
      gap="none"
      topGap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings/licenses')} />}
    >
      {entry ? (
        <>
          <View
            style={{
              gap: th.semantic.layout.fieldGap,
              paddingHorizontal: th.semantic.layout.screen.padding,
              paddingTop: th.primitive.space[2],
              paddingBottom: th.semantic.layout.groupGap,
            }}
          >
            <Text variant="title2" accessibilityRole="header">
              {licenseTitle(entry)}
            </Text>
            <Text variant="fact" color={th.semantic.text.secondary}>
              {[versionsLabel(entry.variants.flatMap((v) => v.versions)), entry.license].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {entry.variants.map((v) => {
            const text = body(v)
            return (
              <View key={`${v.versions.join(',')}|${v.license}`}>
                <SectionBand />
                <Block>
                  {entry.variants.length > 1 ? (
                    <Text variant="fact" color={th.semantic.text.secondary}>
                      {`${versionsLabel(v.versions)} · ${v.license}`}
                    </Text>
                  ) : null}
                  {v.copyright ? <Text variant="label">{v.copyright}</Text> : null}
                  {text ? (
                    <Text variant="bodySmall" color={th.semantic.text.secondary} selectable>
                      {text}
                    </Text>
                  ) : (
                    <>
                      <Text variant="bodySmall" color={th.semantic.text.secondary}>
                        {t('settings.licensesScreen.noText')}
                      </Text>
                      {/* No license file in the package: the original is read on npm (external browser), never made up. */}
                      <ListItem
                        title={t('settings.licensesScreen.npm')}
                        trailing={{ kind: 'external' }}
                        onPress={() =>
                          void Linking.openURL(`https://www.npmjs.com/package/${entry.name}`).catch(() => undefined)
                        }
                      />
                    </>
                  )}
                </Block>
              </View>
            )
          })}
        </>
      ) : null}
    </Screen>
  )
}
