import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api-error";
import { ErrorCode, type ApiErrorBody } from "./error-codes";

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
