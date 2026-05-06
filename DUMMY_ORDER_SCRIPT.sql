DO $ $
DECLARE
    new_order_id uuid;
    sample_uid text;
    sample_product_id uuid;
    sample_variant_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_id') THEN
        ALTER TABLE order_items ADD COLUMN product_id uuid REFERENCES products(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_name') THEN
        ALTER TABLE order_items ADD COLUMN product_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='variant_label') THEN
        ALTER TABLE order_items ADD COLUMN variant_label text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='unit_price') THEN
        ALTER TABLE order_items ADD COLUMN unit_price integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='subtotal') THEN
        ALTER TABLE order_items ADD COLUMN subtotal integer;
    END IF;

    DELETE FROM orders;

    SELECT firebase_uid INTO sample_uid FROM users LIMIT 1;
    IF sample_uid IS NULL THEN
        RAISE NOTICE 'No users found in database. Using placeholder UID.';
        sample_uid := 'DUMMY_UID_123';
    END IF;

    SELECT v.product_id, v.id INTO sample_product_id, sample_variant_id 
    FROM variants v 
    JOIN products p ON v.product_id = p.id 
    LIMIT 1;

    INSERT INTO orders (
        firebase_uid,
        amount,
        currency,
        status,
        shipping_address,
        customer_phone,
        courier_name,
        tracking_id,
        shipment_status,
        estimated_delivery_date,
        actual_shipping_fee,
        shiprocket_shipment_id,
        shiprocket_order_id,
        last_tracking_update,
        created_at,
        updated_at
    ) VALUES (
        sample_uid,
        149900,
        'INR',
        'SHIPPED',
        '{"fullName": "Test Customer", "addressLine1": "123 Main Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}',
        '+919876543210',
        'Blue Dart',
        'BD123456789IN',
        'In Transit',
        now() + interval '3 days',
        5000,
        'SR_SHIP_123',
        'SR_ORD_123',
        now(),
        now() - interval '2 days',
        now()
    ) RETURNING id INTO new_order_id;

    IF sample_product_id IS NOT NULL AND sample_variant_id IS NOT NULL THEN
        INSERT INTO order_items (
            order_id,
            product_id,
            variant_id,
            product_name,
            variant_label,
            price_at_purchase,
            unit_price,         
            quantity,
            subtotal,
            created_at
        ) VALUES (
            new_order_id,
            sample_product_id,
            sample_variant_id,
            'Premium Cotton Comfort Tee',
            'Size M / Midnight Black',
            149900,
            149900,             
            1,
            149900,
            now() - interval '2 days'
        );
    END IF;
END $ $;
