import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AssetKind, TransactionType } from "@batool/types";

const KINDS: AssetKind[] = [AssetKind.BANK, AssetKind.FUND, AssetKind.GOLD, AssetKind.USD];
const TYPES: TransactionType[] = [TransactionType.INCOME, TransactionType.EXPENSE];

/** A participant share on a split expense (owner share is derived, not sent). */
export class SplitShareDto {
  @IsString()
  @IsNotEmpty({ message: "نام شرکت‌کننده الزامی است" })
  @MaxLength(60, { message: "نام شرکت‌کننده حداکثر ۶۰ نویسه باشد" })
  label!: string;

  @Type(() => Number)
  @IsInt({ message: "سهم باید عدد صحیح باشد" })
  @Min(1, { message: "سهم باید بزرگ‌تر از صفر باشد" })
  amountToman!: number;

  // Optional: resolve this participant to a counterparty so a receivable Debt
  // Event is created atomically with the split expense (Phase 4).
  @IsOptional()
  @IsString()
  counterpartyId?: string;
}

export class CreateTransactionDto {
  @IsIn(TYPES, { message: "نوع تراکنش نامعتبر است" })
  type!: TransactionType;

  @Type(() => Number)
  @IsInt({ message: "مبلغ باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ باید بزرگ‌تر از صفر باشد" })
  amountToman!: number;

  @IsString()
  categoryId!: string;

  // BANK / FUND only for income & expense; GOLD / USD are rejected in the service.
  @IsIn(KINDS)
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

  // Only meaningful for EXPENSE (split). Ignored for INCOME.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitShareDto)
  shares?: SplitShareDto[];
}
