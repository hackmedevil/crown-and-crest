-- Add measurement_unit column to size_charts
ALTER TABLE size_charts 
ADD COLUMN IF NOT EXISTS measurement_unit VARCHAR(20) DEFAULT 'cm';

-- Add comment to explain the column
COMMENT ON COLUMN size_charts.measurement_unit IS 'Unit of measurement for all measurements in this size chart: "cm" (centimeters) or "inches"';

-- Update existing rows to have cm as default
UPDATE size_charts SET measurement_unit = 'cm' WHERE measurement_unit IS NULL;

-- Make column NOT NULL
ALTER TABLE size_charts 
ALTER COLUMN measurement_unit SET NOT NULL;
