import { z } from 'zod'

// Input-shape schemas for the app forms (ADR-0021, Q65). Shape only: balance, fee, risk and checksum rules live in wallet-core.

/** Recipient field: 0x + 40 hex. A format check does not establish ownership or safety. */
export const AddressInput = z.string().regex(/^0x[0-9a-fA-F]{40}$/)

/** Amount keypad string: digits with an optional fraction; a trailing "." is allowed while typing. */
export const AmountInput = z.string().regex(/^\d+(\.\d*)?$/)

/** One recovery-phrase word as typed (already lower-case): BIP39 English words are 3 to 8 letters. Membership in the list is a wallet-core rule. */
export const MnemonicWordInput = z.string().regex(/^[a-z]{3,8}$/)

/** One backup word-check answer: not blank. Whether it matches is decided against the phrase, not here. */
export const BackupAnswerInput = z.string().trim().min(1)
