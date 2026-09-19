import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, MaxLength, Matches, MinLength } from "class-validator";

const lowerTrim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class RegisterDto {
  @Transform(lowerTrim)
  @IsString()
  @Matches(/^[a-z0-9_.]{3,20}$/, {
    message: "نام کاربری باید ۳ تا ۲۰ نویسه و فقط شامل حروف کوچک، رقم، نقطه یا زیرخط باشد",
  })
  username!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "نام مستعار الزامی است" })
  @MaxLength(40, { message: "نام مستعار حداکثر ۴۰ نویسه باشد" })
  nickname!: string;

  @Transform(lowerTrim)
  @IsEmail({}, { message: "ایمیل نامعتبر است" })
  email!: string;

  @IsString()
  @MinLength(8, { message: "رمز عبور باید حداقل ۸ نویسه باشد" })
  @MaxLength(128, { message: "رمز عبور حداکثر ۱۲۸ نویسه باشد" })
  password!: string;
}

export class LoginDto {
  @Transform(lowerTrim)
  @IsEmail({}, { message: "ایمیل نامعتبر است" })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: "رمز عبور الزامی است" })
  @MaxLength(128, { message: "رمز عبور حداکثر ۱۲۸ نویسه باشد" })
  password!: string;
}
