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

  /**
   * Conflict raised by a database unique index (e.g. two registrations that
   * passed the application pre-check at the same time). The index is the real
   * guarantee; this turns the loser of that race into a 409 instead of a 500.
   */
  static uniqueConflict(fields: Record<string, string>): ApiError {
    const messages = [...new Set(Object.values(fields))];
    return new ApiError(
      ErrorCode.CONFLICT,
      409,
      messages[0] ?? "این مقدار قبلاً ثبت شده است",
      Object.keys(fields).length > 0 ? fields : undefined,
    );
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
    return new ApiError(ErrorCode.NOTHING_TO_SETTLE, 409, "بدهی برای تسویه وجود ندارد");
  }

  /** Debt payment is debtor-only: the caller is the creditor, so there is nothing to pay. */
  static notDebtorOfCounterparty(): ApiError {
    return new ApiError(
      ErrorCode.VALIDATION_ERROR,
      422,
      "پرداخت بدهی فقط برای موردی مجاز است که شما به این طرف حساب بدهکار باشید",
      {
        counterpartyId: "شما به این طرف حساب بدهکار نیستید، پس بدهی قابل پرداختی وجود ندارد",
      },
    );
  }

  static counterpartyArchived(): ApiError {
    return new ApiError(ErrorCode.COUNTERPARTY_ARCHIVED, 422, "این طرف حساب بایگانی شده است");
  }

  static internal(message = "خطای داخلی رخ داد"): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, 500, message);
  }
}
