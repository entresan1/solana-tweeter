import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../lib/solana";
import { HttpError } from "../lib/errors";

export type PortfolioItem = {
  mint: string;
  symbol?: string;
  amount: string; // string to avoid float issues
  uiAmount?: number;
  usdValue?: number;
};

export type PortfolioResponse = {
  walletAddress: string;
  items: PortfolioItem[];
  updatedAt: string;
};

export async function fetchPortfolio(walletAddress: string): Promise<PortfolioResponse> {
  try {
    const conn = getConnection();
    const owner = new PublicKey(walletAddress);
    
    console.log('🔗 Using QuickNode RPC for portfolio fetch:', conn.rpcEndpoint);

    // Get token accounts for this wallet
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    const items: PortfolioItem[] = [];

    // Process each token account
    for (const { account } of tokenAccounts.value) {
      const parsedData = account.data.parsed.info;
      const mint = parsedData.mint;
      const amount = parsedData.tokenAmount.amount;
      const decimals = parsedData.tokenAmount.decimals;
      const uiAmount = parsedData.tokenAmount.uiAmount;

      // Skip zero balance tokens
      if (amount === "0") continue;

      // Get token metadata (symbol, name) - this is a simplified version
      // In production, you'd want to cache this or use a token registry
      let symbol = "UNKNOWN";
      let usdValue = 0;

      // Common token mappings (you can expand this)
      const tokenMap: Record<string, { symbol: string; price: number }> = {
        "So11111111111111111111111111111111111111112": { symbol: "SOL", price: 100 }, // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", price: 1 }, // USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", price: 1 }, // USDT
      };

      if (tokenMap[mint]) {
        symbol = tokenMap[mint].symbol;
        usdValue = (uiAmount || 0) * tokenMap[mint].price;
      }

      items.push({
        mint,
        symbol,
        amount,
        uiAmount: uiAmount || 0,
        usdValue
      });
    }

    // Add SOL balance
    const balance = await conn.getBalance(owner);
    const solBalance = balance / 1e9; // Convert lamports to SOL
    
    if (solBalance > 0) {
      items.unshift({
        mint: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        amount: balance.toString(),
        uiAmount: solBalance,
        usdValue: solBalance * 100 // Mock SOL price
      });
    }

    return {
      walletAddress,
      items,
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    // Convert Solana errors to HttpError
    if (error.message?.includes("Invalid public key")) {
      throw new HttpError(400, "Invalid wallet address", "INVALID_WALLET");
    }
    if (error.message?.includes("timeout")) {
      throw new HttpError(504, "Request timeout", "TIMEOUT");
    }
    throw new HttpError(500, "Failed to fetch portfolio", "PORTFOLIO_ERROR", error.message);
  }
}
