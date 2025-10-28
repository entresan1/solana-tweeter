export async function getPlatformPortfolio(walletAddress: string) {
  const url = `/api/platform-portfolio?walletAddress=${encodeURIComponent(walletAddress)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    // Expecting { error: { status, message, code } }
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `Request failed with ${res.status}`;
    const code = body?.error?.code || "ERR";
    const e = new Error(`${msg} (${code})`);
    (e as any).status = res.status;
    (e as any).code = code;
    throw e;
  }
  return res.json();
}
