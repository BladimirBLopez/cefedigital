import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Juegos() {
  await requireAdmin();
  redirect("/admin/productos?prov=central_one");
}
