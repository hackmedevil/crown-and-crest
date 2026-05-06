-- Shiprocket Integration: Add Shipment Metadata Fields
-- Migration: 20251222_shiprocket_integration.sql

-- Add Shiprocket shipment metadata to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(50), -- 'PENDING', 'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED', 'CANCELLED'
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_shipping_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS shiprocket_shipment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS shiprocket_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_tracking_update TIMESTAMPTZ;

-- Add indexes for admin filtering and queries
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_name);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON orders(shipment_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery ON orders(estimated_delivery_date);

-- Comments for documentation
COMMENT ON COLUMN orders.courier_name IS 'Courier partner assigned by Shiprocket (e.g., Delhivery, BlueDart, Ekart)';
COMMENT ON COLUMN orders.tracking_id IS 'AWB (Air Waybill) number for shipment tracking';
COMMENT ON COLUMN orders.shipment_status IS 'Current shipment status from Shiprocket tracking';
COMMENT ON COLUMN orders.estimated_delivery_date IS 'Expected delivery date calculated at shipment creation';
COMMENT ON COLUMN orders.actual_delivery_date IS 'Actual date when shipment was delivered';
COMMENT ON COLUMN orders.actual_shipping_fee IS 'Final shipping fee charged by courier';
COMMENT ON COLUMN orders.shiprocket_shipment_id IS 'Shiprocket internal shipment ID for API reference';
COMMENT ON COLUMN orders.shiprocket_order_id IS 'Shiprocket internal order ID for API reference';
COMMENT ON COLUMN orders.last_tracking_update IS 'Timestamp of last tracking event received from Shiprocket';
