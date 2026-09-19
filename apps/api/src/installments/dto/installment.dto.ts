import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AssetKind } from "@batool/types";

const ASSET_KINDS: AssetKind[] = [AssetKind.BANK, AssetKind.FUND];

export class CreateInstallmentDto {
  @IsNotEmpty({ message: "نام اقساط الزامی است" })
  @MaxLength(60, { message: "نام حداکثر ۶۰ نویسه باشد" })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "توضیح حداکثر ۲۰۰ نویسه باشد" })
  description?: string;

  @Type(() => Number)
  @IsInt({ message: "مبلغ قسط باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ قسط باید بزرگ‌تر از صفر باشد" })
  @Max(Number.MAX_SAFE_INTEGER)
  amountToman!: number;

  @Type(() => Number)
  @IsInt({ message: "تعداد اقساط باید عدد صحیح باشد" })
  @Min(1, { message: "تعداد اقساط باید بزرگ‌تر از صفر باشد" })
  @Max(600, { message: "تعداد اقساط حداکثر ۶۰۰ است" })
  totalCount!: number;

  @Type(() => Number)
  @IsInt({ message: "روز سررسید باید عدد صحیح باشد" })
  @Min(1, { message: "روز سررسید باید بین ۱ تا ۳۱ باشد" })
  @Max(31, { message: "روز سررسید باید بین ۱ تا ۳۱ باشد" })
  dueDayOfMonth!: number;

  @Type(() => Number)
  @IsInt({ message: "تاریخ شروع باید معتبر باشد" })
  @Min(0, { message: "تاریخ شروع نامعتبر است" })
  startDate!: number; // epoch millis (UTC)
}

export class UpdateInstallmentDto {
  @IsOptional()
  @IsNotEmpty({ message: "نام نمی‌تواند خالی باشد" })
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  // Only editable BEFORE the first payment (see service rules).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountToman?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  totalCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDayOfMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startDate?: number;

  @IsOptional()
  @IsIn([true, false], { message: "مقدار بایگانی نامعتبر است" })
  archived?: boolean;
}

/** Payment action — the amount is NEVER sent by the client (server source of truth). */
export class PayInstallmentDto {
  @IsIn(ASSET_KINDS, { message: "تسویه فقط با حساب بانکی یا صندوق انجام می‌شود" })
  assetKind!: AssetKind;

  @IsString()
  assetId!: string;
}
