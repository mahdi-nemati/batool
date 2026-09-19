import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeServer } from "@/lib/api/auth";
import { CategoryManager } from "@/components/categories/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
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
  // Defense-in-depth UI guard; the API independently enforces @Roles("ADMIN").
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <CategoryManager />;
}
