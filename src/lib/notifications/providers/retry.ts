/**
 * Retry helper with exponential backoff for transient FCM failures.
 */

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 300;
  const shouldRetry =
    options?.shouldRetry ??
    ((error: unknown) => {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : "";
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      return (
        /UNAVAILABLE|INTERNAL|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT|503|500/i.test(
          code,
        ) ||
        /UNAVAILABLE|INTERNAL|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT|503|500/i.test(
          message,
        )
      );
    });

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function errorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

/**
 * True only for registration tokens that must be removed from the DB.
 * Does NOT treat messaging/invalid-argument as a dead token (payload/validation).
 */
export function isInvalidFcmTokenError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    /registration-token-not-registered|invalid-registration-token|invalid-recipient/i.test(
      code,
    ) ||
    /Requested entity was not found|InvalidRegistration|NotRegistered/i.test(
      message,
    )
  );
}

/** Payload / request validation errors — do not delete device tokens. */
export function isFcmPayloadValidationError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    /invalid-argument|invalid-payload|messaging\/invalid-argument/i.test(
      code,
    ) || /InvalidArgument|invalid argument/i.test(message)
  );
}
