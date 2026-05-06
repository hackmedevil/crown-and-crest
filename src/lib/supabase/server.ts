import { createClient } from '@supabase/supabase-js'

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 🔴 MUST BE SERVICE ROLE
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)