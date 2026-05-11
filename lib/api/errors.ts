import { NextResponse } from "next/server";
import type { ZodError } from "zod";

type ErrorBody = {
  error: string;
  code: string;
  details?: unknown;
  requestId: string;
};

function errorResponse(status: number, body: ErrorBody) {
  return NextResponse.json(body, { status });
}

export function validationErrorResponse(zodError: ZodError, requestId: string) {
  return errorResponse(400, {
    error: "Validation failed",
    code: "VALIDATION_ERROR",
    details: zodError.flatten(),
    requestId,
  });
}

export function badRequestResponse(message: string, requestId: string) {
  return errorResponse(400, {
    error: message,
    code: "BAD_REQUEST",
    requestId,
  });
}

export function unauthorizedResponse(requestId: string) {
  return errorResponse(401, {
    error: "Unauthorized",
    code: "UNAUTHORIZED",
    requestId,
  });
}

export function forbiddenResponse(requestId: string) {
  return errorResponse(403, {
    error: "Forbidden",
    code: "FORBIDDEN",
    requestId,
  });
}

export function notFoundResponse(resource: string, requestId: string) {
  return errorResponse(404, {
    error: `${resource} not found`,
    code: "NOT_FOUND",
    requestId,
  });
}

export function rateLimitResponse(requestId: string) {
  return errorResponse(429, {
    error: "Rate limit exceeded",
    code: "RATE_LIMITED",
    requestId,
  });
}

export function serverErrorResponse(message: string, requestId: string) {
  return errorResponse(500, {
    error: message,
    code: "INTERNAL_SERVER_ERROR",
    requestId,
  });
}
