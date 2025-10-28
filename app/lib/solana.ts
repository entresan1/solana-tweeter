import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL;

if (!RPC_URL) {
  // Do not throw immediately; API route will raise a 500 with a clear message.
  console.warn("[WARN] SOLANA_RPC_URL is not set");
}

export function getConnection() {
  if (!RPC_URL) {
    throw new Error("SOLANA_RPC_URL is not configured");
  }
  return new Connection(RPC_URL, "confirmed");
}

export function isValidSolanaAddress(addr: string): boolean {
  try {
    // Will throw if invalid base58 or wrong length
    // Also accepts off-curve keys (normal for addresses).
    // PublicKey constructor validates length/format.
    // eslint-disable-next-line no-new
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}
