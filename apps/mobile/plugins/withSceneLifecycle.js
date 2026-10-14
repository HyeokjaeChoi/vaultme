// iOS 27 SDK requires the UIScene life cycle; Expo SDK 57 template is not scene-based yet.
// Remove this plugin when the Expo template adopts ExpoAppSceneDelegate.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins')

module.exports = (config) => {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    }
    return c
  })
  return withAppDelegate(config, (c) => {
    let s = c.modResults.contents
    if (s.includes('ExpoReactNativeFactoryProvider')) return c
    s = s.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
    // Scene delegate creates the window and starts React Native.
    s = s.replace(/#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow[\s\S]*?launchOptions: launchOptions\)\n#endif\n\n/, '')
    if (s.includes('startReactNative')) throw new Error('withSceneLifecycle: AppDelegate template changed')
    c.modResults.contents = s
    return c
  })
}
