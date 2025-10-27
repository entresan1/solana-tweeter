-- Create platform_transactions table for tracking platform wallet transactions
CREATE TABLE IF NOT EXISTS public.platform_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    platform_wallet TEXT NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    transaction TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'tip', 'beacon')),
    recipient TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_transactions_user_wallet ON public.platform_transactions(user_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_platform_wallet ON public.platform_transactions(platform_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_timestamp ON public.platform_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_type ON public.platform_transactions(type);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_transaction ON public.platform_transactions(transaction);

-- Enable RLS
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own platform transactions"
    ON public.platform_transactions FOR SELECT
    USING (user_wallet = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can insert their own platform transactions"
    ON public.platform_transactions FOR INSERT
    WITH CHECK (user_wallet = auth.jwt() ->> 'wallet_address');

-- Grant permissions
GRANT SELECT, INSERT ON public.platform_transactions TO authenticated;
GRANT USAGE ON SEQUENCE public.platform_transactions_id_seq TO authenticated;

-- Add comments
COMMENT ON TABLE public.platform_transactions IS 'Tracks all platform wallet transactions including deposits, withdrawals, tips, and beacons';
COMMENT ON COLUMN public.platform_transactions.user_wallet IS 'The user wallet address that owns the platform wallet';
COMMENT ON COLUMN public.platform_transactions.platform_wallet IS 'The platform wallet address (deterministic)';
COMMENT ON COLUMN public.platform_transactions.amount IS 'Transaction amount in SOL';
COMMENT ON COLUMN public.platform_transactions.transaction IS 'Solana transaction signature';
COMMENT ON COLUMN public.platform_transactions.type IS 'Type of transaction: deposit, withdrawal, tip, or beacon';
COMMENT ON COLUMN public.platform_transactions.recipient IS 'Recipient address (for tips)';
COMMENT ON COLUMN public.platform_transactions.message IS 'Optional message (for tips)';
