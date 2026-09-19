import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AssetKind, DebtDirection } from "@batool/types";

const DIRECTIONS: DebtDirection[] = [DebtDirection.OWES_ME, DebtDirection.I_OWE];
const ASSET_KINDS: AssetKind[] = [AssetKind.BANK, AssetKind.FUND];

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
 * Settlement action. Direction is derived from the current outstanding balance,
 * so the caller only provides the positive amount + the Toman source/destination
 * asset. It must reduce the outstanding debt and never exceed it.
 */
export class SettleDebtDto {
  @IsString()
  counterpartyId!: string;

  @Type(() => Number)
  @IsInt({ message: "مبلغ تسویه باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ تسویه باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  amountToman!: number;

  // Settlement cash moves through a Bank/Fund only (never Gold/USD).
  @IsIn(ASSET_KINDS, { message: "تسویه فقط با حساب بانکی یا صندوق انجام می‌شود" })
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
