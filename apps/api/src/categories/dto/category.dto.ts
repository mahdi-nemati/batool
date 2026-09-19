import { IsBoolean, IsIn, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { CategoryType } from "@batool/types";

const TYPES: CategoryType[] = [CategoryType.INCOME, CategoryType.EXPENSE];

export class CreateCategoryDto {
  @IsNotEmpty({ message: "نام دسته‌بندی الزامی است" })
  @MaxLength(40, { message: "نام دسته‌بندی حداکثر ۴۰ نویسه باشد" })
  name!: string;

  @IsIn(TYPES, { message: "نوع دسته‌بندی نامعتبر است" })
  type!: CategoryType;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsNotEmpty({ message: "نام نمی‌تواند خالی باشد" })
  @MaxLength(40, { message: "نام دسته‌بندی حداکثر ۴۰ نویسه باشد" })
  name?: string;

  @IsOptional()
  @IsIn(TYPES, { message: "نوع دسته‌بندی نامعتبر است" })
  type?: CategoryType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
