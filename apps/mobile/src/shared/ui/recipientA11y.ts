/** Accessible name of the shown-address button: field label plus the full address, so a screen reader reads where the funds go. */
export const recipientA11yLabel = (label: string, address: string): string => `${label}, ${address}`
