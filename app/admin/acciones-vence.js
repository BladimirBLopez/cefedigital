"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function marcarAvisado(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`update pedido_items set avisado_en = now() where id = ${id}`;
  revalidatePath("/admin/vencimientos");
}
