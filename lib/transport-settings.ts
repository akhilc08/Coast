// lib/transport-settings.ts
// Reads and applies the admin-configurable transport markup percentage.
// All reads use the Supabase admin client (service role) — bypasses RLS.

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the transport markup percentage from app_settings.
 * Returns 0 on any error (safe default — no markup).
 */
export async function getTransportMarkupPct(): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'transport_markup_pct')
      .single()

    if (error || !data) return 0

    const pct = Number(data.value)
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) return 0
    return pct
  } catch {
    return 0
  }
}

/**
 * Applies a markup percentage to a fee in cents.
 * Pure function — safe to call anywhere.
 */
export function applyMarkup(fee_cents: number, markup_pct: number): number {
  if (markup_pct === 0) return fee_cents
  return Math.round(fee_cents * (1 + markup_pct / 100))
}
