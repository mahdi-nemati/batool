import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const lowerTrim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/**
 * Profile updates intentionally omit `username`: it is the stable identity used
 * for future invitations/connections and must not be casually editable. The API
 * also forbids unknown properties, so any attempt to send `username` is rejected.
 */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: "نام مستعار نامعتبر است" })
  @IsNotEmpty({ message: "نام مستعار نمی‌تواند خالی باشد" })
  @MaxLength(40, { message: "نام مستعار حداکثر ۴۰ نویسه باشد" })
  nickname?: string;

  @IsOptional()
  @Transform(lowerTrim)
  @IsEmail({}, { message: "ایمیل نامعتبر است" })
  email?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: "رمز عبور فعلی الزامی است" })
  @MaxLength(128, { message: "رمز عبور حداکثر ۱۲۸ نویسه باشد" })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: "رمز عبور جدید باید حداقل ۸ نویسه باشد" })
  @MaxLength(128, { message: "رمز عبور حداکثر ۱۲۸ نویسه باشد" })
  newPassword!: string;
}
