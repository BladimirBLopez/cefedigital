"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function confirmarPago(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  let r;
  try {
    const f = await sql`select entregar_pedido(${id}) as r`;
    r = f[0].r;
  } catch (e) {
    r = String(e?.message || "").includes("sin_stock") ? "sin_stock" : "fallo";
  }
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  redirect(r === "ok" ? "/admin/pedidos?aviso=pedido_entregado" : `/admin/pedidos?error=${r}`);
}

export async function cancelarPedido(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    redirect("/admin/pedidos?error=cancelacion");
  }

  const r = await sql`
    update pedidos
    set estado = 'cancelado'
    where id = ${id} and estado = 'pendiente'
    returning id`;

  if (!r[0]) {
    redirect("/admin/pedidos?error=cancelacion");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");

  redirect("/admin/pedidos?aviso=pedido_cancelado");
}

export async function guardarAjustes(formData) {
  await requireAdmin();
  const datos = {
    nombre_tienda: String(formData.get("nombre_tienda") || "").trim().slice(0, 60) || "Cefe Digital",
    whatsapp: String(formData.get("whatsapp") || "").replace(/\D/g, "").slice(0, 15),
    instrucciones_pago: String(formData.get("instrucciones_pago") || "").trim().slice(0, 1000),
  };
  for (const [k, v] of Object.entries(datos)) {
    await sql`
      insert into ajustes (clave, valor) values (${k}, ${v})
      on conflict (clave) do update set valor = excluded.valor`;
  }
  revalidatePath("/");
  revalidatePath("/admin/ajustes");
  redirect("/admin/ajustes?aviso=ajustes_guardados");
}
