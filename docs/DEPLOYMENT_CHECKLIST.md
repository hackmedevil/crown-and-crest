# Enhanced Admin Product Management System - Deployment Checklist

## Pre-Deployment Verification

### 1. Code Quality Checks
- [ ] **TypeScript Compilation**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors

- [ ] **ESLint Validation**
  ```bash
  npm run lint
  ```
  Expected: 0 errors

- [ ] **Test Suite Execution**
  ```bash
  npm test
  ```
  Expected: 29+ tests passing (current: 29/35 = 83%)

- [ ] **Test Coverage Report**
  ```bash
  npm run test:coverage
  ```
  Expected: 60%+ coverage on services, API routes, security, validators

### 2. Database Migration Preparation

- [ ] **Local Migration Execution**
  ```bash
  # Verify Supabase connection
  supabase status
  
  # Check pgvector extension
  psql -d postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
  
  # Apply migration
  supabase db push
  ```

- [ ] **Verify Migration Success**
  ```sql
  -- Check new tables exist
  \dt
  
  -- Verify product_embeddings table
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'product_embeddings';
  
  -- Verify variant_attributes table
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'variant_attributes';
  
  -- Verify RPC functions
  SELECT proname, prosrc 
  FROM pg_proc 
  WHERE proname LIKE '%variant_stock%';
  
  -- Verify indexes created
  SELECT indexname, tablename 
  FROM pg_indexes 
  WHERE tablename IN ('products', 'variants', 'product_embeddings', 'variant_attributes');
  ```

- [ ] **Test Atomic Stock Operations**
  ```sql
  -- Create test variant
  INSERT INTO variants (product_id, stock_quantity, sku) 
  VALUES ('test-product-id', 100, 'TEST-SKU-001');
  
  -- Test reserve operation
  SELECT reserve_variant_stock_atomic('<variant-id>', 10);
  
  -- Verify stock decreased
  SELECT stock_quantity, reserved_quantity FROM variants WHERE id = '<variant-id>';
  
  -- Test release operation
  SELECT release_variant_stock_atomic('<variant-id>', 5);
  
  -- Verify stock updated
  SELECT stock_quantity, reserved_quantity FROM variants WHERE id = '<variant-id>';
  
  -- Cleanup test data
  DELETE FROM variants WHERE sku = 'TEST-SKU-001';
  ```

### 3. Environment Configuration

- [ ] **Generate CSRF Secret**
  ```bash
  # Generate 32-character secret (PowerShell)
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
  ```

- [ ] **Verify Session Secret**
  ```bash
  # Check length >= 32 characters
  echo $env:SESSION_SECRET | Measure-Object -Character
  ```

- [ ] **Update .env.local**
  ```env
  # Add to .env.local
  CSRF_SECRET=<generated-32-char-secret>
  SESSION_SECRET=<existing-or-new-32-char-secret>
  
  # Verify OpenAI API key (for embeddings)
  OPENAI_API_KEY=sk-...
  
  # Verify Cloudinary credentials (for media)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  ```

- [ ] **Update Environment Variables in Vercel**
  - Navigate to Project Settings → Environment Variables
  - Add `CSRF_SECRET` to Production, Preview, Development
  - Verify `SESSION_SECRET` is set and >= 32 characters
  - Confirm all other required variables are present

### 4. Local Development Testing

- [ ] **Start Development Server**
  ```bash
  npm run dev
  ```

- [ ] **Test CSRF Endpoint**
  ```bash
  curl http://localhost:3000/api/auth/csrf
  ```
  Expected: `{"token": "...", "expiresAt": "..."}`

- [ ] **Test Admin Authentication**
  - Login as admin user
  - Verify `requireAdmin()` middleware works
  - Check Firebase token validation

- [ ] **Test Product Creation**
  ```javascript
  // In browser console or API client
  const response = await fetch('/api/auth/csrf');
  const { token } = await response.json();
  
  const createResponse = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token
    },
    body: JSON.stringify({
      name: 'Test Product',
      slug: 'test-product-unique',
      base_price: 99.99,
      description: 'Test description',
      status: 'draft'
    })
  });
  
  const result = await createResponse.json();
  console.log(result);
  ```
  Expected: 201 status, product returned in `data.product`

- [ ] **Test Rate Limiting**
  ```javascript
  // Make 21 rapid POST requests (rate limit is 20/60s)
  for (let i = 0; i < 21; i++) {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token
      },
      body: JSON.stringify({
        name: `Test Product ${i}`,
        slug: `test-product-${i}-${Date.now()}`,
        base_price: 99.99
      })
    });
    console.log(`Request ${i + 1}: ${response.status}`);
  }
  ```
  Expected: First 20 succeed (201), 21st returns 429 with ERR_RATE_LIMIT_EXCEEDED

- [ ] **Test Validation**
  ```javascript
  // Test with invalid data (negative price)
  const invalidResponse = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token
    },
    body: JSON.stringify({
      name: 'Invalid Product',
      slug: 'invalid',
      base_price: -50 // Invalid: must be positive
    })
  });
  
  const errorData = await invalidResponse.json();
  console.log(errorData);
  ```
  Expected: 400 status, ERR_INVALID_INPUT with Zod error details

- [ ] **Test Autosave Functionality**
  - Open admin product form in browser
  - Type product name and description
  - Wait 2 seconds (debounce delay)
  - Check browser DevTools → Application → Local Storage
  - Verify draft saved with key like `admin-product-draft`
  - Close tab without saving
  - Reopen form
  - Verify draft restoration notification appears

- [ ] **Test Cache Invalidation**
  ```javascript
  // Create product, then update it
  const product = await createProduct();
  const updateResponse = await fetch(`/api/admin/products/${product.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token
    },
    body: JSON.stringify({
      name: 'Updated Name'
    })
  });
  
  // Verify product list was revalidated
  const listResponse = await fetch('/api/admin/products');
  const list = await listResponse.json();
  // Should see updated name in list
  console.log(list.data.products);
  ```
  Expected: Updated product appears in list with new name

### 5. Staging Deployment

- [ ] **Create Staging Branch**
  ```bash
  git checkout -b staging/admin-enhancements
  git push origin staging/admin-enhancements
  ```

- [ ] **Deploy to Vercel Staging**
  - Push will trigger automatic deployment
  - Wait for build to complete
  - Check deployment logs for errors

- [ ] **Execute Migration on Staging Database**
  ```bash
  # Connect to staging Supabase instance
  supabase link --project-ref <staging-project-ref>
  
  # Apply migration
  supabase db push --db-url postgresql://...staging
  ```

- [ ] **Smoke Test Staging**
  - Open staging URL
  - Test CSRF endpoint: `https://staging.example.com/api/auth/csrf`
  - Test admin product creation
  - Test rate limiting
  - Test validation errors
  - Check Vercel logs for errors

### 6. Performance Testing

- [ ] **Load Test Embedding Generation**
  ```bash
  # Create 10 products rapidly
  for i in {1..10}
  do
    curl -X POST https://staging.example.com/api/admin/products \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $TOKEN" \
      -d "{\"name\": \"Product $i\", \"slug\": \"product-$i\", \"base_price\": 99.99}"
  done
  
  # Check embedding generation cron job logs
  # Verify embeddings created in product_embeddings table
  ```

- [ ] **Test Concurrent Stock Operations**
  ```sql
  -- In two separate psql sessions, run simultaneously:
  -- Session 1:
  SELECT reserve_variant_stock_atomic('<variant-id>', 50);
  
  -- Session 2 (at same time):
  SELECT reserve_variant_stock_atomic('<variant-id>', 50);
  
  -- Verify no race conditions, stock correctly decremented
  ```

### 7. Monitoring Setup

- [ ] **Verify Vercel Logging**
  - Check function logs capture errors
  - Verify request IDs in error responses
  - Confirm PII masking works (phone, email, Aadhaar)

- [ ] **Set Up Alerts**
  - Rate limit exceeded (429 responses spike)
  - CSRF validation failures (potential attack)
  - Database errors (migration issues)
  - OpenAI API failures (embedding generation)

### 8. Documentation Review

- [ ] **Update README.md**
  - Add section on enhanced admin features
  - Document new environment variables
  - Explain CSRF token usage
  - Describe autosave functionality

- [ ] **Review Integration Guide**
  - Check `docs/ADMIN_UI_INTEGRATION.md` is accurate
  - Verify code examples work
  - Update with any changes since creation

- [ ] **Create Rollback Plan**
  ```markdown
  ## Rollback Procedure
  
  If issues occur after deployment:
  
  1. Revert to previous Git commit
  2. Redeploy previous version to Vercel
  3. Rollback database migration:
     ```sql
     -- Drop new tables
     DROP TABLE IF EXISTS variant_attributes CASCADE;
     DROP TABLE IF EXISTS product_embeddings CASCADE;
     
     -- Drop new functions
     DROP FUNCTION IF EXISTS reserve_variant_stock_atomic;
     DROP FUNCTION IF EXISTS release_variant_stock_atomic;
     
     -- Revert column changes
     ALTER TABLE products DROP COLUMN IF EXISTS ai_metadata;
     ALTER TABLE products DROP COLUMN IF EXISTS country_of_origin;
     -- ... (full rollback script)
     ```
  4. Clear Redis cache (if using)
  5. Monitor error rates return to normal
  ```

### 9. Production Deployment

- [ ] **Merge to Main Branch**
  ```bash
  git checkout main
  git merge staging/admin-enhancements
  git push origin main
  ```

- [ ] **Execute Production Migration**
  ```bash
  # Connect to production Supabase
  supabase link --project-ref <production-project-ref>
  
  # Backup database first!
  pg_dump -h <prod-host> -U postgres -d postgres > backup_$(date +%Y%m%d).sql
  
  # Apply migration
  supabase db push --db-url postgresql://...production
  ```

- [ ] **Deploy to Vercel Production**
  - Automatic deployment from main branch
  - Monitor build logs
  - Check for any errors

- [ ] **Post-Deployment Verification**
  - Test CSRF endpoint
  - Create test product (then delete)
  - Verify rate limiting
  - Check logs for errors
  - Test autosave in production
  - Verify cache invalidation

### 10. Post-Deployment Monitoring (24 Hours)

- [ ] **Monitor Error Rates**
  - Check Vercel dashboard for 5xx errors
  - Monitor Supabase logs for database errors
  - Review Firebase auth errors

- [ ] **Check Performance Metrics**
  - API response times < 500ms (p95)
  - Database query performance
  - Cache hit rates

- [ ] **Verify Business Metrics**
  - Admin product creation working
  - Variant management working
  - Stock operations accurate
  - No customer-facing impact

- [ ] **Review Security Logs**
  - No CSRF validation bypasses
  - Rate limiting working correctly
  - No unauthorized admin access

## Success Criteria

✅ All tests passing (35/35 target)  
✅ 60%+ test coverage achieved  
✅ Database migration successful  
✅ All API endpoints functional  
✅ CSRF protection working  
✅ Rate limiting effective  
✅ Autosave functional  
✅ Cache invalidation working  
✅ No production errors for 24 hours  
✅ Admin workflows improved  

## Rollback Triggers

Initiate rollback if:
- ❌ Error rate > 5% for 10+ minutes
- ❌ Database deadlocks occur
- ❌ CSRF bypass discovered
- ❌ Rate limiting not working
- ❌ Data corruption detected
- ❌ Customer-facing features broken

## Support Plan

**On-Call Engineer:** Available for 48 hours post-deployment  
**Escalation Path:** Engineering Lead → CTO  
**Communication Channels:** Slack #engineering-alerts  
**Incident Response Time:** < 15 minutes

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Approved By:** _______________  
**Rollback Plan Reviewed:** ☐ Yes ☐ No  
**Monitoring Configured:** ☐ Yes ☐ No  
**Documentation Updated:** ☐ Yes ☐ No  
