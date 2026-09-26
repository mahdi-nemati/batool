import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AssetKind, DebtDirection } from "@batool/types";

const DIRECTIONS: DebtDirection[] = [DebtDirection.OWES_ME, DebtDirection.I_OWE];
// Business rule: a debt payment is debited from a Bank Account only. Funds are
// savings targets and may never act as a payment source.
const ASSET_KINDS: AssetKind[] = [AssetKind.BANK];

/** Manual debt obligation event (creates/increases what they owe me or I owe them). */
export class CreateDebtEventDto {
  @IsString()
  counterpartyId!: string;

  @IsIn(DIRECTIONS, { message: "جهت بدهی نامعتبر است" })
  direction!: DebtDirection;

  @Type(() => Number)
  @IsInt({ message: "مبلغ باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  amountToman!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "توضیح حداکثر ۲۰۰ نویسه باشد" })
  description?: string;

  @IsOptional()
  @IsISO8601({}, { message: "تاریخ نامعتبر است" })
  occurredAt?: string;
}

/**
 * Debt payment ("پرداخت بدهی"). There is deliberately no direction/intent field
 * and no "receive" counterpart: only the debtor can pay, and the service derives
 * the direction from the outstanding net (it must be a debt the current user
 * owes). A creditor therefore has no payment endpoint to call at all.
 */
export class SettleDebtDto {
  @IsString()
  counterpartyId!: string;

  @Type(() => Number)
  @IsInt({ message: "مبلغ تسویه باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ تسویه باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  amountToman!: number;

  // Settlement cash is debited from a Bank Account only (never Gold/USD/Fund).
  @IsIn(ASSET_KINDS, { message: "تسویه فقط از حساب بانکی انجام می‌شود" })
  assetKind!: AssetKind;

  @IsString()
  assetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "توضیح حداکثر ۲۰۰ نویسه باشد" })
  description?: string;

  @IsOptional()
  @IsISO8601({}, { message: "تاریخ نامعتبر است" })
  occurredAt?: string;
}

/** Resolve a Phase-3 split-expense participant share to a counterparty → receivable. */
export class LinkShareDto {
  @IsString()
  shareId!: string;

  @IsString()
  counterpartyId!: string;
}
