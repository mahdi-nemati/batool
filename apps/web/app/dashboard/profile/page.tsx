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
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">پروفایل</h1>
      <ProfileForm
        initial={{ nickname: user.nickname, email: user.email, username: user.username }}
      />
      <PasswordForm />
    </section>
  );
}
