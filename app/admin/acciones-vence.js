"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function marcarAvisado(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    redirect("/admin/vencimientos?error=avisado");
  }

  const r = await sql`
    update pedido_items
    set avisado_en = now()
    where id = ${id}
    returning id`;

  if (!r[0]) {
    redirect("/admin/vencimientos?error=avisado");
  }

  revalidatePath("/admin/vencimientos");
  redirect("/admin/vencimientos?aviso=vencimiento_avisado");
}
