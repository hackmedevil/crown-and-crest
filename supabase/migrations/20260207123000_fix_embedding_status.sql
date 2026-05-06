-- Ensure products.embedding_status exists for search embedding queue
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'missing'
CHECK (embedding_status IN ('missing', 'pending', 'completed', 'failed', 'outdated'));

CREATE INDEX IF NOT EXISTS products_embedding_status_idx ON public.products(embedding_status);

COMMENT ON COLUMN public.products.embedding_status IS 'Status of AI embedding generation (missing/pending/completed/failed/outdated)';
