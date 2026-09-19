import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Min } from "class-validator";
import { AssetKind } from "@batool/types";

const KINDS: AssetKind[] = [AssetKind.BANK, AssetKind.FUND, AssetKind.GOLD, AssetKind.USD];

export class CreateTransferDto {
  @IsIn(KINDS, { message: "نوع مبدأ نامعتبر است" })
  sourceKind!: AssetKind;

  // Required for BANK / FUND endpoints; ignored for the singleton GOLD / USD wallets.
  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsIn(KINDS, { message: "نوع مقصد نامعتبر است" })
  destinationKind!: AssetKind;

  @IsOptional()
  @IsString()
  destinationId?: string;

  // Toman side (integer). Required for Toman routes and as the amount paid /
  // received on Gold / USD routes.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "مبلغ تومان باید عدد صحیح باشد" })
  @Min(1, { message: "مبلغ تومان باید بزرگ‌تر از صفر باشد" })
  amountToman?: number;

  // Gold grams (decimal string). Required when Gold is involved.
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, { message: "مقدار طلا نامعتبر است" })
  amountGram?: string;

  // USD (decimal string). Required when USD is involved.
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, { message: "مقدار دلار نامعتبر است" })
  amountUsd?: string;

  @IsOptional()
  @IsISO8601({}, { message: "تاریخ نامعتبر است" })
  occurredAt?: string;
}
