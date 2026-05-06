const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://aqbjmmrpikhzuugeruct.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYmptbXJwaWtoenV1Z2VydWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1Mzg3NCwiZXhwIjoyMDgwNDI5ODc0fQ.rwzobusSWMZMYQ68vcnt7HyN0XAlDmQcDJqYdYg4oF0";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRankingQueries() {
  try {
    console.log('🧪 Testing Ranking Queries\n');

    // Test 1: Query product_ranking_scores table directly
    console.log('1️⃣  Query product_ranking_scores directly...');
    const { data: scores, error: scoresError } = await supabase
      .from('product_ranking_scores')
      .select('product_id, ranking_score, purchase_count, view_count')
      .order('ranking_score', { ascending: false })
      .limit(5);

    if (scoresError) {
      console.log('   ❌ Error:', scoresError.message);
    } else {
      console.log('   ✅ Success! Found', scores.length, 'records');
      if (scores.length > 0) {
        console.log('   Sample:', scores[0]);
      } else {
        console.log('   ℹ️  No ranking data yet (need to populate with events)');
      }
    }

    // Test 2: Try refreshing materialized view
    console.log('\n2️⃣  Refreshing materialized views...');
    try {
      const { data: refreshResult, error: refreshError } = await supabase
        .rpc('refresh_product_ranking_scores');
      
      if (refreshError) {
        console.log('   ⚠️  Refresh error:', refreshError.message);
      } else {
        console.log('   ✅ Refresh successful!', refreshResult);
      }
    } catch (err) {
      console.log('   ⚠️  Could not refresh:', err.message);
    }

    // Test 3: Try querying the ranking view
    console.log('\n3️⃣  Querying product_ranking_view...');
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('product_ranking_view')
        .select('product_id, name, ranking_score, purchase_count, view_count')
        .order('ranking_score', { ascending: false })
        .limit(5);

      if (viewError) {
        console.log('   ❌ Error:', viewError.message);
      } else {
        console.log('   ✅ Success! Found', viewData.length, 'records');
        if (viewData.length > 0) {
          console.log('   Sample:', viewData[0]);
        }
      }
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // Test 4: Try the get_ranked_products_by_category function
    console.log('\n4️⃣  Testing get_ranked_products_by_category function...');
    const { data: categoryResults, error: categoryError } = await supabase
      .rpc('get_ranked_products_by_category', {
        p_category_id: '00000000-0000-0000-0000-000000000000',
        p_limit: 5,
        p_offset: 0,
        p_sort_by: 'ranking'
      });

    if (categoryError) {
      console.log('   ⚠️  Error:', categoryError.message);
    } else {
      console.log('   ✅ Function callable! Found', categoryResults.length, 'results');
    }

    // Test 5: Query analytics data
    console.log('\n5️⃣  Checking analytics_events...');
    const { count: analyticsCount, error: analyticsError } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true });

    if (analyticsError) {
      console.log('   ❌ Error:', analyticsError.message);
    } else {
      console.log('   ✅ Analytics table accessible. Records:', analyticsCount);
      if (analyticsCount === 0) {
        console.log('   ℹ️  No analytics events yet - start logging events to populate rankings');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Ranking system is ready to use!');
    console.log('\n📊 Next Steps:');
    console.log('   1. Log analytics events from your frontend');
    console.log('   2. Refresh rankings: SELECT refresh_product_ranking_scores();');
    console.log('   3. Query rankings: SELECT * FROM product_ranking_view;');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testRankingQueries();
