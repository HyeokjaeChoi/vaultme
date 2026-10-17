// Metro resolves font files to an asset id (number), as expo-font expects.
declare module '*.otf' {
  const asset: number
  export default asset
}
