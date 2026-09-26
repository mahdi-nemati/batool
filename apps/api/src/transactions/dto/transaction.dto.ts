import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
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
  @Type(() => Number)
  @IsInt({ message: "سهم باید عدد صحیح باشد" })
  @Min(1, { message: "سهم باید بزرگ‌تر از صفر باشد" })
  amountToman!: number;

  /**
   * Required: a shared-expense participant is always one of the user's existing
   * Counterparties. There is no free-text participant name — the counterparty's
   * nickname is the single source of truth for the participant label, so the
   * client cannot invent (or desynchronise) a name.
   */
  @IsString({ message: "برای هر سهم باید یک طرف حساب انتخاب شود" })
  counterpartyId!: string;
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
