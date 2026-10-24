import { beforeEach, describe, expect, it, vi } from 'vitest'

const N = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(() => Promise.resolve({ data: 'ExponentPushToken[abcdefgh12345678]' })),
  setNotificationChannelAsync: vi.fn(() => Promise.resolve(null)),
  setNotificationHandler: vi.fn(),
  getLastNotificationResponse: vi.fn(),
  clearLastNotificationResponse: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
}))
const os = vi.hoisted(() => ({ OS: 'android' }))
vi.mock('expo-notifications', () => N)
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { eas: { projectId: 'proj' } } } } }))
vi.mock('react-native', () => ({ Platform: os }))
vi.mock('@/shared/api', () => ({ api: null }))
vi.mock('@/shared/storage', () => ({
  getAccountAddress: vi.fn(),
  getPushSetting: vi.fn(),
  setPushSetting: vi.fn(),
  getPushUnregisterPending: vi.fn(),
  setPushUnregisterPending: vi.fn(),
}))

const { expoPort, installForegroundHandler, onPushTap, pushDeps } =
  await import('../src/features/push/api/notifications')

const response = (data: unknown, identifier = Math.random().toString()) => ({
  notification: { request: { identifier, content: { data } } },
})

beforeEach(() => vi.clearAllMocks())

describe('expo-notifications adapter', () => {
  it('maps the OS status: granted, can ask again = undetermined, else denied', async () => {
    N.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true })
    expect(await expoPort.permission()).toBe('granted')
    N.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true })
    expect(await expoPort.permission()).toBe('undetermined')
    N.requestPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false })
    expect(await expoPort.request()).toBe('denied')
  })
  it('Android: creates the channel before the prompt and before the token', async () => {
    N.requestPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true })
    await expoPort.request()
    expect(await expoPort.token('proj')).toBe('ExponentPushToken[abcdefgh12345678]')
    expect(N.setNotificationChannelAsync).toHaveBeenCalledTimes(2)
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj' })
  })
  it('reads the EAS project id from the app config; no API = test-data mode', () => {
    expect(pushDeps.projectId).toBe('proj')
    expect(pushDeps.server).toBeNull()
  })
  it('foreground: banner and list, no sound, no badge', async () => {
    installForegroundHandler()
    const [h] = N.setNotificationHandler.mock.calls[0] as [{ handleNotification: () => Promise<unknown> }]
    expect(await h.handleNotification()).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    })
  })
  it('opens the cold-start push once, then every later tap, and clears each', () => {
    const remove = vi.fn()
    let listener!: (r: unknown) => void
    N.getLastNotificationResponse.mockReturnValueOnce(response({ kind: 'deposit' }))
    N.addNotificationResponseReceivedListener.mockImplementationOnce((l: (r: unknown) => void) => {
      listener = l
      return { remove }
    })
    const open = vi.fn()
    const stop = onPushTap(open)
    listener(response({ kind: 'send' }))
    expect(open.mock.calls).toEqual([[{ kind: 'deposit' }], [{ kind: 'send' }]])
    expect(N.clearLastNotificationResponse).toHaveBeenCalledTimes(2)
    stop()
    expect(remove).toHaveBeenCalled()
  })
  it('opens one notification once when it arrives twice (cold-start read plus the listener)', () => {
    let listener!: (r: unknown) => void
    const same = response({ kind: 'deposit' }, 'n1')
    N.getLastNotificationResponse.mockReturnValueOnce(same)
    N.addNotificationResponseReceivedListener.mockImplementationOnce((l: (r: unknown) => void) => {
      listener = l
      return { remove: vi.fn() }
    })
    const open = vi.fn()
    onPushTap(open)
    listener(same)
    expect(open).toHaveBeenCalledTimes(1)
    listener(response({ kind: 'send' }, 'n2'))
    expect(open).toHaveBeenCalledTimes(2)
  })
})
