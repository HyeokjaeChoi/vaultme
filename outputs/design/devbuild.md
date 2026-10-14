# Expo dev build (iOS / Android)

Expo Go는 쓰지 않아요. 네이티브 모듈(`react-native-keychain`, `react-native-mmkv`)이 필요해서 dev build를 써요.

## 준비물

- Xcode 27 + iOS 27 simulator (예: `iPhone 18 Pro`).
- Android SDK (`~/Library/Android/sdk`) + AVD `signaldock-api37`.
- JDK 17~21. JDK 26은 안 돼요. Android Studio의 JBR(JDK 21)을 써요.
- CocoaPods.

## 환경 변수 (명령마다 붙여요. 전역 설정은 건드리지 않아요)

```sh
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8                      # CocoaPods
export ANDROID_HOME=$HOME/Library/Android/sdk                   # Android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

- LANG가 비어 있으면 CocoaPods가 `Unicode Normalization not appropriate for ASCII-8BIT`로 실패해요.
- JDK 26이면 `jlink` 단계(`JdkImageTransform`)에서 Android 빌드가 실패해요.

## 명령 (`apps/mobile`)

```sh
export UDID=$(xcrun simctl list devices booted | grep -Eo '[0-9A-F-]{36}' | head -1)   # 부팅된 simulator
npx expo prebuild --clean                                  # ios/ android/ 생성 (gitignore)
npx expo run:ios --device $UDID
emulator -avd signaldock-api37 &                           # 에뮬레이터가 없을 때
npx expo run:android --device signaldock-api37
```

`pnpm ios`, `pnpm android`도 같아요. Metro는 `http://localhost:8081`이에요.

## 화면 열기

```sh
xcrun simctl openurl $UDID vaultme://kit
adb shell am start -a android.intent.action.VIEW -d vaultme://kit app.vaultme.mobile
```

- scheme은 `vaultme` (`app.json`)예요.
- 캡처: `xcrun simctl io <udid> screenshot x.png`, `adb exec-out screencap -p > x.png`.
- 결과: `work/c2b/devbuild/{ios,android}-{start,kit}.png`.
- `/kit`의 `native: mmkv ok / keychain biometry ...` 줄이 네이티브 모듈 확인용이에요 (`__DEV__`에서만).

## 알려진 문제

- **iOS 27 UIScene**: Expo SDK 57 템플릿은 아직 scene 방식이 아니라서 앱이 바로 죽어요
  (`UIScene life cycle is required`). `plugins/withSceneLifecycle.js`가 `Info.plist`와 `AppDelegate.swift`를 고쳐요.
  Expo 템플릿이 바뀌면 지워요.
- **pnpm `minimumReleaseAge` (7일)**: `expo install`이 방금 나온 패치(`expo-crypto`, `expo-dev-client`)를 못 받아요.
  한 단계 앞선 버전(`~57.0.3`, `~57.0.19`)으로 고정했어요. `expo install --check`가 경고해도 정책 때문이에요.
- **Android NDK**: 첫 빌드가 NDK 27.1을 자동으로 받아요 (큰 다운로드).
- **Expo Go가 같은 simulator에 있으면** 상태 바에 `Expo Go` 뒤로가기가 남아요. 앱 동작에는 영향이 없어요.
- 첫 실행 때 dev menu 안내가 떠요. `Continue`를 눌러요.
- Android `userInterfaceStyle` 경고는 `expo-system-ui`가 없어서예요. 필요하면 나중에 추가해요.
- Keychain 생체 인증은 simulator에서 `none`이에요 (Face ID 등록 전).
