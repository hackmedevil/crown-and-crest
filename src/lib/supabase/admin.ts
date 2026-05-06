import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
}

if (!supabaseServiceKey) {
  throw new Error('[Supabase Admin] Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. This is a server-only variable and should not be used in client components. Check that .env.local exists and the server was restarted.')
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
