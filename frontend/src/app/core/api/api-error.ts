import { HttpErrorResponse } from '@angular/common/http';

import { FieldViolation, Problem } from './common.models';

/**
 * Any failed API call, normalised: the HTTP status, and the RFC 7807 document when there is one.
 *
 * Components branch on `code` — the stable error name the backend sends — never on message text.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | null,
    override readonly cause?: unknown,
  ) {
    super(problem?.detail ?? problem?.title ?? ApiError.fallbackMessage(status));
    this.name = 'ApiError';
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      const problem = body && typeof body === 'object' && !(body instanceof Blob) && 'status' in body
        ? (body as Problem)
        : null;
      return new ApiError(error.status, problem, error);
    }
    return new ApiError(-1, null, error);
  }

  get code(): string | undefined {
    return this.problem?.code;
  }

  get correlationId(): string | undefined {
    return this.problem?.correlationId;
  }

  get violations(): FieldViolation[] {
    return this.problem?.violations ?? [];
  }

  /** The browser never reached the server: offline, DNS, CORS or the service is down. */
  get isNetworkFailure(): boolean {
    return this.status === 0;
  }

  get isServerFault(): boolean {
    return this.status >= 500;
  }

  private static fallbackMessage(status: number): string {
    if (status === 0) return 'The server could not be reached. Check your connection and try again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'That could not be found. It may have been removed.';
    if (status >= 500) return 'Something went wrong on our side. Try again in a moment.';
    return 'The request could not be completed.';
  }
}
