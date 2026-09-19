import { IsBoolean, IsNotEmpty, IsOptional, MaxLength } from "class-validator";

export class CreateExternalCounterpartyDto {
  @IsNotEmpty({ message: "نام طرف حساب الزامی است" })
  @MaxLength(60, { message: "نام حداکثر ۶۰ نویسه باشد" })
  name!: string;
}

export class UpdateCounterpartyDto {
  @IsOptional()
  @IsNotEmpty({ message: "نام نمی‌تواند خالی باشد" })
  @MaxLength(60, { message: "نام حداکثر ۶۰ نویسه باشد" })
  name?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class ConnectUserDto {
  @IsNotEmpty({ message: "نام کاربری الزامی است" })
  @MaxLength(20, { message: "نام کاربری حداکثر ۲۰ نویسه باشد" })
  username!: string;
}
