// Pins the Android NDK for the app and every native module.
// gradle.properties values become root-project extras, and expo-root-project keeps an existing
// `ndkVersion` extra instead of React Native's default, then applies it to all library modules.
const { withGradleProperties } = require('expo/config-plugins')

module.exports = function withNdkVersion(config, { ndkVersion }) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'ndkVersion'))
    cfg.modResults.push({ type: 'property', key: 'ndkVersion', value: ndkVersion })
    return cfg
  })
}
