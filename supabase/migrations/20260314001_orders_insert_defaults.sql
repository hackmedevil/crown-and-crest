-- Ensure legacy and external order inserts remain valid after order_number/provider enforcement.

CREATE OR REPLACE FUNCTION public.assign_order_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := CONCAT(
      'CC-',
      UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 10))
    );
  END IF;

  IF NEW.provider IS NULL OR btrim(NEW.provider) = '' THEN
    NEW.provider := 'qikink';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_insert_defaults ON public.orders;

CREATE TRIGGER trg_orders_insert_defaults
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_order_insert_defaults();

UPDATE public.orders
SET order_number = CONCAT('CC-', UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 10)))
WHERE order_number IS NULL OR btrim(order_number) = '';

UPDATE public.orders
SET provider = 'qikink'
WHERE provider IS NULL OR btrim(provider) = '';

ALTER TABLE public.orders
ALTER COLUMN provider SET DEFAULT 'qikink';