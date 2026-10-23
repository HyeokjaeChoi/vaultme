export type AuthName = 'faceId' | 'touchId' | 'fingerprint' | 'device'

/** Device capability (react-native-keychain getSupportedBiometryType) -> the name the pre-send notice uses. Anything else, or no biometry, is "기기 인증". */
export function authNameOf(type: string | null): AuthName {
  switch (type) {
    case 'FaceID':
      return 'faceId'
    case 'TouchID':
      return 'touchId'
    case 'Fingerprint':
      return 'fingerprint'
    default:
      return 'device'
  }
}
