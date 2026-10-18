/**
 * Hand-off from the scan screen (B-S21) to the recipient screen (B-S20a). Memory only: the address never goes into a URL, so a deep link
 * cannot fake the "QR에서 가져온 주소" label. `takeScanResult` returns it once. Scanned or pasted-from-scan addresses are not written to recents
 * (recents hold only addresses this wallet sent to; see recents.ts).
 */
export type ScanResult = { to: string; /** true = decoded from a QR (shows the source label); false = pasted on the scan screen. */ fromQr: boolean; /** The QR carried an amount or token param that was ignored. */ hadAmount: boolean }

let pending: ScanResult | null = null

export const setScanResult = (r: ScanResult) => {
  pending = r
}

export function takeScanResult(): ScanResult | null {
  const r = pending
  pending = null
  return r
}
