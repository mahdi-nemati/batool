import { ApiError } from "../errors/api-error";

export const MAX_SAFE_AMOUNT = Number.MAX_SAFE_INTEGER;

/**
 * Parses a Toman amount (integer only, no fractional Toman) into a BigInt for
 * storage. Rejects non-integers, out-of-range values and (by default) zero.
 */
export function parseToman(value: unknown, field = "amountToman", allowZero = false): bigint {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw ApiError.validation(field, "مبلغ باید عدد صحیح باشد");
  }
  if (value < 0) {
    throw ApiError.validation(field, "مبلغ نمی‌تواند منفی باشد");
  }
  if (!allowZero && value === 0) {
    throw ApiError.validation(field, "مبلغ باید بزرگ‌تر از صفر باشد");
  }
  if (value > MAX_SAFE_AMOUNT) {
    throw ApiError.validation(field, "مبلغ از حد مجاز بیشتر است");
  }
  return BigInt(value);
}

/** Converts a stored non-negative BigInt balance to a JSON-safe number. */
export function tomanToNumber(value: bigint): number {
  return Number(value);
}

/** Negates a Toman delta for a debit ledger leg. */
export function negToman(value: bigint): bigint {
  return -value;
}
