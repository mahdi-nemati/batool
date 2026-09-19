import { IsNotEmpty, IsNumber, Max, MaxLength, Min } from "class-validator";

export class CreateBankAccountDto {
  @IsNotEmpty({ message: "نام حساب الزامی است" })
  @MaxLength(60, { message: "نام حساب حداکثر ۶۰ نویسه باشد" })
  name!: string;

  @IsNumber({ maxDecimalPlaces: 0 }, { message: "مبلغ اولیه باید عدد صحیح باشد" })
  @Min(0, { message: "مبلغ اولیه نمی‌تواند منفی باشد" })
  @Max(Number.MAX_SAFE_INTEGER, { message: "مبلغ اولیه از حد مجاز بیشتر است" })
  initialBalanceToman!: number;
}
