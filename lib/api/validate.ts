import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequestResponse, validationErrorResponse } from "@/lib/api/errors";

type ValidationSuccess<T> = { success: true; data: T };
type ValidationFailure = { success: false; response: Response };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function parseJsonSafely(text: string): unknown {
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

export async function validateBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  requestId: string,
): Promise<ValidationResult<z.infer<TSchema>>> {
  try {
    const raw = await request.text();
    const payload = parseJsonSafely(raw);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, response: validationErrorResponse(parsed.error, requestId) };
    }
    return { success: true, data: parsed.data };
  } catch {
    return {
      success: false,
      response: badRequestResponse("Invalid JSON body", requestId),
    };
  }
}

export function validateQuery<TSchema extends z.ZodTypeAny>(
  request: Request | NextRequest,
  schema: TSchema,
  requestId: string,
): ValidationResult<z.infer<TSchema>> {
  const { searchParams } = new URL(request.url);
  const queryObject: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    const existing = queryObject[key];
    if (existing === undefined) {
      queryObject[key] = value;
      return;
    }
    if (Array.isArray(existing)) {
      queryObject[key] = [...existing, value];
      return;
    }
    queryObject[key] = [existing, value];
  });

  const parsed = schema.safeParse(queryObject);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error, requestId) };
  }
  return { success: true, data: parsed.data };
}

export function validateParams<TSchema extends z.ZodTypeAny>(
  params: unknown,
  schema: TSchema,
  requestId: string,
): ValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error, requestId) };
  }
  return { success: true, data: parsed.data };
}

export function getRequestId(request: Request | NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
