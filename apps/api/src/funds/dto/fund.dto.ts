import { IsInt, IsNotEmpty, IsOptional, Max, MaxLength, Min } from "class-validator";

export class CreateFundDto {
  @IsNotEmpty({ message: "نام صندوق الزامی است" })
  @MaxLength(60, { message: "نام صندوق حداکثر ۶۰ نویسه باشد" })
  name!: string;

  // Optional savings target. Funds never accept a direct/initial balance: their
  // balance changes only via transfers (enforced in the transfers module).
  @IsOptional()
  @IsInt({ message: "مبلغ هدف باید عدد صحیح باشد" })
  @Min(0, { message: "مبلغ هدف نمی‌تواند منفی باشد" })
  @Max(Number.MAX_SAFE_INTEGER, { message: "مبلغ هدف از حد مجاز بیشتر است" })
  goalToman?: number;
}
