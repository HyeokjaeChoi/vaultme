// GENERATED
import { light } from './light'
import { dark } from './dark'

export { light, dark }
type Widen<T> = T extends '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' ? T : T extends string ? string : T extends number ? number : { readonly [K in keyof T]: Widen<T[K]> }
export type Theme = Widen<typeof light>
