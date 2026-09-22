import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserDto } from "@batool/types";
import { getMeServer } from "@/lib/api/auth";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const store = await cookies();
  const user: UserDto | null = await getMeServer(
    store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
  if (user === null) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">حساب کاربری</p>
        <h1 className="text-3xl font-bold">پروفایل</h1>
        <p className="mt-1 text-sm text-muted">مشخصات و امنیت حساب شما</p>
      </header>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <ProfileForm
          initial={{ nickname: user.nickname, email: user.email, username: user.username }}
          className="flex-1"
        />
        <PasswordForm className="flex-1" />
      </div>
    </div>
  );
}
