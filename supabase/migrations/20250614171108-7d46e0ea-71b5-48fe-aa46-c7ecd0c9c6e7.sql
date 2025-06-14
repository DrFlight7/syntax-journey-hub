
-- Add payment_provider column to subscribers to track Stripe/Maya/other providers
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS payment_provider TEXT;

-- (Optional) Add a check constraint for known providers
-- ALTER TABLE public.subscribers
-- ADD CONSTRAINT chk_payment_provider CHECK (payment_provider IN ('stripe', 'maya', 'coinsph'));

-- Update row-level security policies if needed (no change for SELECT, INSERT, UPDATE as policies already allow).
