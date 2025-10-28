export async function withTimeout<T>(p: Promise<T>, ms: number, label = "operation"): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutP = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  try {
    return await Promise.race([p, timeoutP]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
