export type LogLevel = "info" | "warn" | "error";

export type StructuredLogEvent = {
  type: string;
  requestId?: string | null;
  message?: string;
  [key: string]: unknown;
};

export function getOrCreateRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-correlation-id")?.trim() ||
    crypto.randomUUID()
  );
}

export function logStructuredEvent(
  level: LogLevel,
  event: StructuredLogEvent,
): void {
  const logger = console[level] ?? console.info;
  logger(event);
}
