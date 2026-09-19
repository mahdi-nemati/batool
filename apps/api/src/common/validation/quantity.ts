import Decimal from "decimal.js";
import { ApiError } from "../errors/api-error";

export const MAX_QUANTITY_DECIMALS = 8;

// Decimal.js precision used for all Gold/USD arithmetic.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Parses a positive quantity (grams of Gold or USD) into a Decimal. Accepts a
 * string or number; rejects non-finite values, negatives and excess precision.
 */
export function parseQuantity(value: unknown, field = "quantity", allowZero = false): Decimal {
  let quantity: Decimal;
  try {
    quantity = new Decimal(String(value));
  } catch {
    throw ApiError.validation(field, "مقدار باید یک عدد معتبر باشد");
  }
  if (!quantity.isFinite()) {
    throw ApiError.validation(field, "مقدار باید متناهی باشد");
  }
  if (quantity.isNegative()) {
    throw ApiError.validation(field, "مقدار نمی‌تواند منفی باشد");
  }
  if (!allowZero && quantity.isZero()) {
    throw ApiError.validation(field, "مقدار باید بزرگ‌تر از صفر باشد");
  }
  if (quantity.decimalPlaces() > MAX_QUANTITY_DECIMALS) {
    throw ApiError.validation(field, "دقت اعشاری بیش از حد مجاز است");
  }
  return quantity;
}

export function toStorageQuantity(value: Decimal): string {
  return value.toString();
}

/** Rehydrates a Prisma Decimal (or null) into a Decimal.js instance for math. */
export function fromStorageQuantity(value: Decimal | string | null): Decimal {
  return new Decimal(value === null || value === undefined ? 0 : value.toString());
}

export function quantityToNumber(value: Decimal): number {
  return Number(value.toString());
}

export { Decimal };
