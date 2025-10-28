export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toJsonError(err: unknown) {
  if (err instanceof HttpError) {
    return { status: err.status, message: err.message, code: err.code ?? "ERR", details: err.details ?? null };
  }
  return { status: 500, message: "Internal server error", code: "INTERNAL_ERROR", details: null };
}
