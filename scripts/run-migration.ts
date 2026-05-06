import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251223_fix_nested_aggregate_stock_flags.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  console.log('Running migration: 20251223_fix_nested_aggregate_stock_flags.sql')
  
  const { data, error } = await supabase.rpc('exec', { sql })
  
  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  
  console.log('Migration completed successfully!')
}

runMigration()
