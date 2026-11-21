"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar } from "@/lib/limite";

export async function avisarPago(codigo) {
  const cod = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!cod) return { ok: false };

  const ip = await ipCliente();
  if ((await contar("aviso_pago_ip", ip, 60)) >= 10) return { ok: false };
  await anotar("aviso_pago_ip", ip);

  try {
    const r = await sql`
      update pedidos
      set avisado_en = coalesce(avisado_en, now())
      where codigo = ${cod} and estado = 'pendiente'
      returning id`;
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    return { ok: r.length > 0 };
  } catch {
    return { ok: false };
  }
}
