"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { auth } from "@/lib/cliente-auth";
import { getMigrations } from "better-auth/db/migration";

export async function migrarAuth() {
  await requireAdmin();
  try {
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
  } catch (e) {
    console.error("migrar auth fallo", e);
    redirect("/admin/auth?error=1");
  }
  revalidatePath("/admin/auth");
  redirect("/admin/auth");
}
