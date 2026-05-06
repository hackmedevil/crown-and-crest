const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testDiscoveryAPI() {
  console.log('🧪 Testing Shop Discovery API\n');
  console.log('Base URL:', BASE_URL);
  console.log('='.repeat(60) + '\n');

  const tests = [
    {
      name: 'Basic shop query',
      url: `${BASE_URL}/api/discovery/shop?limit=5`,
      expected: 'products array and facets'
    },
    {
      name: 'Category filter',
      url: `${BASE_URL}/api/discovery/shop?category=electronics&limit=5`,
      expected: 'filtered by category'
    },
    {
      name: 'Price range filter',
      url: `${BASE_URL}/api/discovery/shop?min_price=1000&max_price=50000&limit=5`,
      expected: 'products within price range'
    },
    {
      name: 'Search query',
      url: `${BASE_URL}/api/discovery/shop?search=premium&limit=5`,
      expected: 'search results'
    },
    {
      name: 'Sort by ranking',
      url: `${BASE_URL}/api/discovery/shop?sort=ranking&limit=5`,
      expected: 'ranked products'
    },
    {
      name: 'Sort by price ascending',
      url: `${BASE_URL}/api/discovery/shop?sort=price_low_high&limit=5`,
      expected: 'price low to high'
    },
    {
      name: 'Pagination',
      url: `${BASE_URL}/api/discovery/shop?page=2&limit=5`,
      expected: 'page 2 results'
    },
    {
      name: 'Brand filter',
      url: `${BASE_URL}/api/discovery/shop?brand=premium&limit=5`,
      expected: 'brand filtered'
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    try {
      const response = await fetch(test.url);
      const data = await response.json();

      if (response.ok && data.products !== undefined) {
        console.log(`✅ PASS (${data.products.length} products, total: ${data.pagination?.total || 0})`);
        
        // Show sample data for first test
        if (passCount === 0 && data.products.length > 0) {
          console.log('   Sample product:', {
            name: data.products[0].name,
            price: data.products[0].price,
            rankingScore: data.products[0].rankingScore
          });
          if (data.facets) {
            console.log('   Facets:', {
              brands: data.facets.brands?.length || 0,
              sizes: data.facets.sizes?.length || 0,
              colors: data.facets.colors?.length || 0
            });
          }
        }
        
        passCount++;
      } else {
        console.log(`❌ FAIL - ${data.error || 'Invalid response'}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ FAIL - ${error.message}`);
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed, ${tests.length} total`);
  
  if (passCount === tests.length) {
    console.log('✅ All tests passed! Shop discovery API is working.');
  } else if (passCount > 0) {
    console.log('⚠️  Some tests passed. Check failed tests above.');
  } else {
    console.log('❌ All tests failed. Check if server is running and API route exists.');
    console.log('\n💡 Run: npm run dev');
  }
}

testDiscoveryAPI().catch(console.error);
