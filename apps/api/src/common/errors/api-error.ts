import { ErrorCode } from "./error-codes";

export class ApiError extends Error {
  private constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static validation(field: string, message: string): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, 400, "درخواست نامعتبر است", {
      [field]: message,
    });
  }

  static unauthorized(): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, 401, "احراز هویت انجام نشد");
  }

  static forbidden(message = "دسترسی غیرمجاز است"): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, 403, message);
  }

  static notFound(): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, 404, "منبع مورد نظر یافت نشد");
  }

  static conflict(message: string): ApiError {
    return new ApiError(ErrorCode.CONFLICT, 409, message);
  }

  static insufficientBalance(): ApiError {
    return new ApiError(ErrorCode.INSUFFICIENT_BALANCE, 422, "موجودی برای این عملیات کافی نیست");
  }

  static insufficientAssetQuantity(): ApiError {
    return new ApiError(
      ErrorCode.INSUFFICIENT_ASSET_QUANTITY,
      422,
      "مقدار دارایی برای این فروش کافی نیست",
    );
  }

  static invalidTransferRoute(message = "ترکیب مبدأ و مقصد انتقال مجاز نیست"): ApiError {
    return new ApiError(ErrorCode.INVALID_TRANSFER_ROUTE, 422, message);
  }

  static settlementExceedsOutstanding(outstanding: number): ApiError {
    return new ApiError(
      ErrorCode.SETTLEMENT_EXCEEDS_OUTSTANDING,
      422,
      `مبلغ تسویه از بدهی موجود (${outstanding} تومان) بیشتر است`,
    );
  }

  static nothingToSettle(): ApiError {
    return new ApiError(ErrorCode.NOTHING_TO_SETTLE, 409, "بدهی standing برای تسویه وجود ندارد");
  }

  static counterpartyArchived(): ApiError {
    return new ApiError(ErrorCode.COUNTERPARTY_ARCHIVED, 422, "این طرف حساب بایگانی شده است");
  }

  static internal(message = "خطای داخلی رخ داد"): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, 500, message);
  }
}
