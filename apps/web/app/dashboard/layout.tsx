import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeServer } from "@/lib/api/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/ui/navbar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardMenu } from "@/components/dashboard/DashboardMenu";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const user = await getMeServer(
    store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
  if (user === null) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Navbar
        actions={
          <div className="flex items-center gap-3 text-sm">
            <DashboardMenu role={user.role} />
            <span className="hidden text-ink sm:inline">{user.nickname}</span>
            <Badge variant="secondary">{user.role === "ADMIN" ? "مدیر" : "کاربر"}</Badge>
            <LogoutButton />
          </div>
        }
      />
      <div className="flex items-start">
        <DashboardSidebar
          role={user.role}
          className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:flex"
        />
        {/* The notification provider lives in the root layout, so it is shared by
            every route instead of being mounted (and re-mounted) per section. */}
        <main className="min-w-0 flex-1 p-5">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
