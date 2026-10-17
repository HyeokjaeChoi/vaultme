import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { recentExamples } from '@/entities/transaction/fixtures'
import { chain } from '@/shared/chain'
import { addRecent, getRecents, MAX_RECENTS, type RecentRecipient } from '@/shared/storage'

/** The recents list: this device's own sends first. While the fake adapter is on, example rows fill the rest (test data, like the activity examples). */
export function mergeRecents(local: RecentRecipient[], examples: RecentRecipient[]): RecentRecipient[] {
  const seen = new Set(local.map((r) => r.address.toLowerCase()))
  return [...local, ...examples.filter((e) => !seen.has(e.address.toLowerCase()))].slice(0, MAX_RECENTS)
}

/**
 * Analyst risk R4 (address poisoning): recents are ONLY addresses this wallet signed and sent to (kv `send.recents`, written by `rememberRecipient` after a submitted send).
 * Never from incoming txs or fetched history. Examples are test data and exist only while the fake adapter is on (`broadcasts` false).
 */
export function recentsFor(local: RecentRecipient[], broadcasts: boolean): RecentRecipient[] {
  return mergeRecents(local, broadcasts ? [] : recentExamples)
}

function read(): RecentRecipient[] {
  let local: RecentRecipient[] = []
  try {
    local = getRecents()
  } catch {
    // kv unreadable: no recents
  }
  return recentsFor(local, chain.broadcasts)
}

/** Recent recipients for S20a and the look-alike check of S22. Re-read on focus. */
export function useRecents(): RecentRecipient[] {
  const [list, setList] = useState(read)
  useFocusEffect(useCallback(() => setList(read()), []))
  return list
}

/** After a send was submitted (signed by this wallet): remember the recipient. A failed write is ignored (the list is a convenience). */
export function rememberRecipient(r: RecentRecipient): void {
  try {
    addRecent(r)
  } catch {
    // not stored
  }
}
