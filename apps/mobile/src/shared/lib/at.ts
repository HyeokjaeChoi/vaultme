/** Array element or a clear error. For indexes the code holds in range, where `noUncheckedIndexedAccess` types the read as possibly undefined. */
export function at<T>(a: readonly T[], i: number): T {
  const v = a[i]
  if (v === undefined) throw new Error(`index ${String(i)} out of range (length ${String(a.length)})`)
  return v
}
