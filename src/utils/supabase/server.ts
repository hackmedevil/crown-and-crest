import { supabaseServer } from '@/lib/supabase/server'

/**
 * Backward-compatible server client factory.
 * Some legacy pages/actions still import createClient from this path.
 */
export async function createClient() {
  return supabaseServer
}
