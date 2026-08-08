import { isSupabaseConfigured } from "./supabase";

/**
 * Whether the store can record a transfer order at all.
 *
 * This used to probe for migration 0003's columns and hide Zelle and CashApp
 * until they existed - which meant two of the three ways this store gets paid
 * were invisible while waiting on a database change. `createOfflineOrder` now
 * adapts to whichever schema is present, so the only real requirement is that
 * there is a database to write to.
 */
export function canTakeOfflineOrders(): boolean {
  return isSupabaseConfigured();
}
