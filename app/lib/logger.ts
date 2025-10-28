export function logInfo(msg: string, meta: Record<string, unknown> = {}) {
  // Avoid logging secrets or full addresses if you want: mask middle characters.
  console.info(`[INFO] ${msg}`, safeMeta(meta));
}
export function logWarn(msg: string, meta: Record<string, unknown> = {}) {
  console.warn(`[WARN] ${msg}`, safeMeta(meta));
}
export function logError(msg: string, meta: Record<string, unknown> = {}) {
  console.error(`[ERROR] ${msg}`, safeMeta(meta));
}
function safeMeta(meta: Record<string, unknown>) {
  const copy: Record<string, unknown> = { ...meta };
  if (typeof copy.walletAddress === "string") {
    copy.walletAddress = mask(copy.walletAddress);
  }
  return copy;
}
function mask(s: string) {
  if (s.length <= 8) return s;
  return `${s.slice(0,4)}…${s.slice(-4)}`;
}
