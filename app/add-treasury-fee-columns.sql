-- Add treasury fee columns to tips table
ALTER TABLE tips 
ADD COLUMN IF NOT EXISTS recipient_amount DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS treasury_fee DECIMAL(10, 6);

-- Add comments for the new columns
COMMENT ON COLUMN tips.recipient_amount IS 'Amount received by the recipient after treasury fee deduction';
COMMENT ON COLUMN tips.treasury_fee IS '5% fee sent to treasury from the tip amount';

-- Update existing records to have the new columns (set recipient_amount = amount, treasury_fee = 0 for existing tips)
UPDATE tips 
SET 
  recipient_amount = amount,
  treasury_fee = 0
WHERE recipient_amount IS NULL OR treasury_fee IS NULL;
