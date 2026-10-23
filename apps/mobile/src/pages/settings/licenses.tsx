// Figma: B-S64 오픈소스 라이선스 526:54261 (full 526:54503, dark 526:54545 / 526:54587): Title block, Section band, Block 아이콘·글꼴 (4 rows of 52), Section band, Block 앱 라이브러리 (rows of 52)
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { FlatList, Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { assetLicenses, libLicenses, licenseTitle, type LicenseEntry } from '@/features/licenses'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Icon, ListItem, ScreenHeader, SectionBand, Text } from '@/shared/ui'

type Item = {
  key: string
  kind: 'title' | 'band' | 'header' | 'row' | 'link' | 'end'
  text?: string
  entry?: LicenseEntry
}

/**
 * B-S64 오픈소스 라이선스. The list is generated at build time from the installed dependency closure incl. transitive packages (scripts/generate-licenses.mjs).
 * A package row opens S65 (license text). Solar Icons has an extra "원본 보기" row that opens the original in the browser (CC BY 4.0 credit).
 * A FlatList, not a ScrollView: there are several hundred rows.
 */
export function LicensesPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const items: Item[] = [
    { key: 'title', kind: 'title' },
    { key: 'band-1', kind: 'band' },
    { key: 'h-assets', kind: 'header', text: t('settings.licensesScreen.groupAssets') },
    ...assetLicenses.flatMap((e): Item[] => [
      { key: `a-${e.name}`, kind: 'row', entry: e },
      ...(e.url ? [{ key: `l-${e.name}`, kind: 'link' as const, entry: e }] : []),
    ]),
    { key: 'end-1', kind: 'end' },
    { key: 'band-2', kind: 'band' },
    { key: 'h-libs', kind: 'header', text: t('settings.licensesScreen.groupLibs') },
    ...libLicenses.map((e): Item => ({ key: `p-${e.name}@${e.version ?? ''}`, kind: 'row', entry: e })),
  ]
  const pad = th.semantic.layout.screen.padding
  const open = useCallback(
    (e: LicenseEntry) =>
      router.push({
        pathname: '/settings/license',
        params: e.version ? { name: e.name, version: e.version } : { name: e.name },
      }),
    [router],
  )
  const render = ({ item }: { item: Item }) => {
    const e = item.entry
    switch (item.kind) {
      case 'title':
        return (
          <View
            style={{
              gap: th.semantic.layout.fieldGap,
              paddingHorizontal: pad,
              paddingTop: th.primitive.space[2],
              paddingBottom: th.semantic.layout.groupGap,
            }}
          >
            <Text variant="title1" accessibilityRole="header">
              {t('settings.licensesScreen.title')}
            </Text>
            <Text variant="bodySmall" color={th.semantic.text.secondary}>
              {t('settings.licensesScreen.body')}
            </Text>
          </View>
        )
      case 'end':
        return <View style={{ height: th.component.sectionBand.blockPaddingY - th.primitive.space[1] }} />
      case 'band':
        return <SectionBand />
      case 'header':
        return (
          <View
            accessibilityRole="header"
            style={{
              paddingHorizontal: pad,
              paddingTop: th.component.sectionBand.blockPaddingY,
              paddingBottom: th.primitive.space[1],
            }}
          >
            <Text variant="label" color={th.semantic.text.tertiary}>
              {item.text}
            </Text>
          </View>
        )
      case 'link':
        return (
          <View style={{ paddingHorizontal: pad, paddingBottom: th.primitive.space[1] }}>
            <ListItem
              compact
              title={t('settings.licensesScreen.solarSource')}
              trailing={{
                kind: 'custom',
                node: <Icon name="external" size={th.component.icon.size.control} color={th.component.listItem.icon} />,
              }}
              onPress={() => void Linking.openURL(e?.url ?? '')}
            />
          </View>
        )
      default:
        return e ? (
          <View style={{ paddingHorizontal: pad, paddingBottom: th.primitive.space[1] }}>
            <ListItem
              compact
              title={licenseTitle(e)}
              trailing={{ kind: 'disclosure', text: e.license }}
              onPress={() => open(e)}
            />
          </View>
        ) : null
    }
  }
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: th.component.screenB.bg }}>
      <ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings')} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={render}
        initialNumToRender={20}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: th.component.sectionBand.blockPaddingY }}
      />
    </SafeAreaView>
  )
}
