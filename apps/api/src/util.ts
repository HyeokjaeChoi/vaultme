/** Array element or a clear error. Use where `noUncheckedIndexedAccess` makes the index look unsafe but the code holds it in range. */
export function at<T>(a: readonly T[], i: number): T {
  const v = a[i]
  if (v === undefined) throw new Error(`index ${String(i)} out of range (length ${String(a.length)})`)
  return v
}
