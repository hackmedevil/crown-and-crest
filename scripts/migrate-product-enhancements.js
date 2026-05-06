// Run this script to apply the product enhancements migration
// Usage: node scripts/migrate-product-enhancements.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running product enhancements migration...\n');

    try {
        // Add SEO columns
        console.log('1. Adding SEO columns...');
        const { error: seoError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS meta_title VARCHAR(60),
                ADD COLUMN IF NOT EXISTS meta_description VARCHAR(160),
                ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
                ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(255);
            `
        });

        if (seoError) throw seoError;
        console.log('   ✅ SEO columns added');

        // Add color_definitions column
        console.log('2. Adding color_definitions column...');
        const { error: colorError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS color_definitions JSONB DEFAULT '[]';
            `
        });

        if (colorError) throw colorError;
        console.log('   ✅ color_definitions column added');

        // Create index
        console.log('3. Creating index on seo_slug...');
        const { error: indexError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE INDEX IF NOT EXISTS idx_products_seo_slug ON products(seo_slug);
            `
        });

        if (indexError) throw indexError;
        console.log('   ✅ Index created');

        console.log('\n✅ Migration completed successfully!\n');
        console.log('You can now:');
        console.log('  - Create/edit products with SEO fields');
        console.log('  - Define custom colors for products');
        console.log('  - Use rich text editor for descriptions\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nPlease run the migration manually using Supabase Dashboard:');
        console.error('  1. Go to Supabase Dashboard > SQL Editor');
        console.error('  2. Copy contents from: supabase/migrations/20251224_product_enhancements.sql');
        console.error('  3. Paste and run\n');
        process.exit(1);
    }
}

runMigration();
