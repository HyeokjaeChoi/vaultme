import { createContext, useContext } from 'react'

/** True inside a BottomSheet: its Secondary buttons use buttonB.secondary.bgOnRaised (the sheet is a raised surface; Dark differs). */
export const OnRaisedContext = createContext(false)
export const useOnRaised = () => useContext(OnRaisedContext)
