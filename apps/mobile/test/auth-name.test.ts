import { expect, it } from 'vitest'
import { authNameOf } from '../src/features/send/model/authName'

it('maps the device biometry type to the pre-send auth name', () => {
  expect(authNameOf('FaceID')).toBe('faceId')
  expect(authNameOf('TouchID')).toBe('touchId')
  expect(authNameOf('Fingerprint')).toBe('fingerprint')
})
it('falls back to the generic device auth', () => {
  expect(authNameOf(null)).toBe('device')
  expect(authNameOf('Face')).toBe('device')
  expect(authNameOf('OpticID')).toBe('device')
})
