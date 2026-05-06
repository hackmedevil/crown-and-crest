-- Grant execute permissions on RPC functions
-- This allows anon and authenticated users to call these functions

GRANT EXECUTE ON FUNCTION get_variant_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_stock_flags TO anon, authenticated;
