/**
 * Structured console logs for Vercel Runtime Logs.
 * Prefix is intentional and stable — filter Runtime Logs by "[Push Debug]".
 */

type PushDebugData = Record<string, unknown>;

function serializeError(error: unknown): PushDebugData {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }
  return { message: String(error), stack: null };
}

export function pushDebug(message: string, data?: PushDebugData): void {
  if (data === undefined) {
    console.log(`[Push Debug] ${message}`);
    return;
  }
  console.log(`[Push Debug] ${message}`, data);
}

export function pushDebugError(
  message: string,
  error: unknown,
  data?: PushDebugData,
): void {
  console.error(`[Push Debug] ${message}`, {
    ...(data ?? {}),
    error: serializeError(error),
  });
}
