export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: Array<{ path?: string; code: string }> = [],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (
  code = "UNAUTHORIZED",
  message = "Authentication is required.",
) => new AppError(401, code, message);
export const forbidden = (
  code = "FORBIDDEN",
  message = "You do not have permission to perform this action.",
) => new AppError(403, code, message);
export const notFound = (message = "Resource not found.") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (
  message = "A resource with these details already exists.",
) => new AppError(409, "CONFLICT", message);
