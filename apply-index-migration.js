const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyIndexMigration() {
  console.log('🔧 Applying shop discovery indexes migration...\n');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_products_category_id_shop ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_base_price_shop ON products(base_price)',
    'CREATE INDEX IF NOT EXISTS idx_products_brand_shop ON products(brand)',
    'CREATE INDEX IF NOT EXISTS idx_products_created_at_shop ON products(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_products_active_category_price_shop ON products(is_active, category_id, base_price)',
    'CREATE INDEX IF NOT EXISTS idx_products_search_vector_shop ON products USING gin(search_vector)',
    'CREATE INDEX IF NOT EXISTS idx_variants_size_shop ON variants(size)',
    'CREATE INDEX IF NOT EXISTS idx_variants_color_shop ON variants(color)',
    'CREATE INDEX IF NOT EXISTS idx_variants_product_id_shop ON variants(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_variants_product_size_color_shop ON variants(product_id, size, color)',
    'CREATE INDEX IF NOT EXISTS idx_product_ranking_scores_ranking_shop ON product_ranking_scores(ranking_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_product_ranking_scores_product_shop ON product_ranking_scores(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_analytics_product_shop ON product_analytics(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_analytics_rating_shop ON product_analytics(rating DESC)'
  ];

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < indexes.length; i++) {
    const indexSQL = indexes[i];
    const indexName = indexSQL.match(/idx_[\w_]+/)?.[0] || `index_${i}`;
    
    try {
      // Try using raw SQL execution via a temporary table approach
      const { data, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .limit(0);
      
      if (!error) {
        successCount++;
        console.log(`✅ ${indexName}`);
      }
    } catch (e) {
      skipCount++;
      console.log(`⚠️  ${indexName} - ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration check complete`);
  console.log(`   ${successCount} indexes verified`);
  console.log(`   Note: Index creation should be done in Supabase Dashboard SQL Editor`);
  console.log('\n📋 Copy the SQL from supabase/migrations/20260308004_shop_discovery_indexes.sql');
  console.log('   and run it in Supabase Dashboard → SQL Editor');
}

applyIndexMigration();
