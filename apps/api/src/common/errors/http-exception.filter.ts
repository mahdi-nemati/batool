import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@batool/database";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api-error";
import { ErrorCode, type ApiErrorBody } from "./error-codes";

/**
 * Turns a Prisma unique-constraint failure into a 409 with a message about the
 * field that collided. This is what makes uniqueness race-proof: the
 * application-level "does it already exist?" check is only a fast path, and the
 * database index is the real guarantee. Two concurrent registrations that pass
 * the pre-check both hit the index, and the loser gets this conflict response
 * instead of a 500.
 */
function uniqueConstraintError(meta: unknown): ApiError {
  const target = Array.isArray((meta as { target?: unknown } | undefined)?.target)
    ? (meta as { target: string[] }).target
    : [];
  const known: Record<string, string> = {
    username: "این نام کاربری قبلاً ثبت شده است",
    email: "این ایمیل قبلاً ثبت شده است",
  };
  const fields: Record<string, string> = {};
  for (const entry of target) {
    const field = entry.split("_")[0]?.trim() ?? entry;
    fields[field] = known[field] ?? "این مقدار قبلاً ثبت شده است";
  }
  return ApiError.uniqueConflict(fields);
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const requestId = randomUUID();

    let status = 500;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = "خطای داخلی رخ داد";
    let fields: Record<string, string> | undefined;

    if (exception instanceof ApiError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      fields = exception.fields;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique-constraint races (username / email) and missing-row updates are
      // client errors, not server faults.
      if (exception.code === "P2002") {
        const conflict = uniqueConstraintError(exception.meta);
        status = conflict.status;
        code = conflict.code;
        message = conflict.message;
        fields = conflict.fields;
      } else if (exception.code === "P2025") {
        status = 404;
        code = ErrorCode.NOT_FOUND;
        message = "منبع مورد نظر یافت نشد";
      } else {
        this.logger.error(exception.stack);
      }
    } else if (exception instanceof BadRequestException) {
      status = 400;
      code = ErrorCode.VALIDATION_ERROR;
      const body = exception.getResponse() as { message?: string | string[] };
      const messages = Array.isArray(body.message) ? body.message : [];
      message = messages[0] ?? "درخواست نامعتبر است";
      fields = {};
      for (const entry of messages) {
        const property = entry.split(" ")[0];
        if (property !== undefined && !(property in fields)) {
          fields[property] = entry;
        }
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code =
        status === 401
          ? ErrorCode.UNAUTHORIZED
          : status === 403
            ? ErrorCode.FORBIDDEN
            : status === 404
              ? ErrorCode.NOT_FOUND
              : ErrorCode.VALIDATION_ERROR;
      message = exception.message;
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const errorBody: ApiErrorBody = { error: { code, message, requestId } };
    if (fields !== undefined && Object.keys(fields).length > 0) {
      errorBody.error.fields = fields;
    }

    response.status(status).set("x-request-id", requestId).json(errorBody);
  }
}
