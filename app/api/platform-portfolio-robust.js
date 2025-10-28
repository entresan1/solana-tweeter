const { z } = require('zod');
const { isValidSolanaAddress } = require('../lib/solana');
const { withTimeout } = require('../lib/timeout');
const { fetchPortfolio } = require('../services/portfolio');
const { HttpError, toJsonError } = require('../lib/errors');
const { logError, logInfo, logWarn } = require('../lib/logger');

const QuerySchema = z.object({
  walletAddress: z.string().min(1, "walletAddress is required"),
});

module.exports = async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const qp = Object.fromEntries(url.searchParams.entries());

  // 1) Validate query
  const parse = QuerySchema.safeParse(qp);
  if (!parse.success) {
    const msg = parse.error.issues.map(i => i.message).join(", ");
    logWarn("Invalid query", { msg, walletAddress: qp.walletAddress || "" });
    return res.status(400).json(
      { error: { status: 400, message: msg, code: "BAD_REQUEST" } }
    );
  }

  const walletAddress = parse.data.walletAddress.trim();

  if (!isValidSolanaAddress(walletAddress)) {
    logWarn("Invalid Solana address", { walletAddress });
    return res.status(400).json(
      { error: { status: 400, message: "Invalid Solana wallet address", code: "INVALID_WALLET" } }
    );
  }

  // 2) Enforce required infra env
  if (!process.env.SOLANA_RPC_URL && !process.env.VITE_SOLANA_RPC_URL) {
    const msg = "SOLANA_RPC_URL is not configured on the server";
    logError(msg, {});
    return res.status(500).json(
      { error: { status: 500, message: msg, code: "MISSING_ENV" } }
    );
  }

  // 3) Execute with timeout and clear error handling
  try {
    logInfo("Fetching portfolio", { walletAddress });
    const data = await withTimeout(
      fetchPortfolio(walletAddress),
      12_000, // 12s safety
      "fetchPortfolio"
    );
    return res.status(200).json(data);
  } catch (err) {
    // Map timeouts and known HttpError to proper HTTP codes
    if (typeof err?.message === "string" && err.message.startsWith("Timeout")) {
      logWarn("Portfolio fetch timeout", { walletAddress });
      return res.status(504).json(
        { error: { status: 504, message: "Upstream timeout while fetching portfolio", code: "TIMEOUT" } }
      );
    }

    const j = toJsonError(err);
    logError("Portfolio fetch failed", { walletAddress, code: j.code, status: j.status });
    return res.status(j.status).json({ error: j });
  }
};
