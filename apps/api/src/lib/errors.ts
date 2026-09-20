// One error type for everything the API deliberately refuses. The error handler turns it
// into a JSON body; anything that is not an AppError is a bug and is reported as a 500
// without leaking internals.

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'error',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, 'bad_request', details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, message, 'unauthorized');
export const forbidden = (message = 'You do not have permission to do that') => new AppError(403, message, 'forbidden');
export const notFoundError = (what = 'Resource') => new AppError(404, `${what} not found`, 'not_found');
export const conflict = (message: string) => new AppError(409, message, 'conflict');
export const tooMany = (message = 'Too many requests, try again later') => new AppError(429, message, 'rate_limited');
