import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AssetKind } from "@batool/types";

// Business rule: tuition is paid from a Bank Account only. Funds are savings
// targets and may never act as a payment source.
const ASSET_KINDS: AssetKind[] = [AssetKind.BANK];

export class CreateSetarDto {
  @Type(() => Number)
  @IsInt({ message: "شهریه باید عدد صحیح باشد" })
  @Min(1, { message: "شهریه باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  tuitionAmountToman!: number;
}

export class UpdateSetarDto {
  /** Only affects FUTURE unpaid cycles — historical payments keep their snapshot. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "شهریه باید عدد صحیح باشد" })
  @Min(1, { message: "شهریه باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  tuitionAmountToman?: number;

  @IsOptional()
  @IsIn([true, false], { message: "مقدار بایگانی نامعتبر است" })
  archived?: boolean;
}

/** Recording a session — purely a domain event, NEVER a financial write. */
export class CreateSetarSessionDto {
  // Epoch millis (UTC) of the completed session; defaults to now.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "تاریخ جلسه نامعتبر است" })
  @Min(0, { message: "تاریخ جلسه نامعتبر است" })
  occurredAt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "توضیح حداکثر ۲۰۰ نویسه باشد" })
  description?: string;
}

/**
 * Pay tuition — the amount is NEVER accepted from the client. The server
 * resolves the current profile tuition and uses exactly that amount.
 */
export class PaySetarTuitionDto {
  @IsIn(ASSET_KINDS, { message: "پرداخت شهریه فقط از حساب بانکی انجام می‌شود" })
  assetKind!: AssetKind;

  @IsString()
  assetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "توضیح حداکثر ۲۰۰ نویسه باشد" })
  description?: string;
}
