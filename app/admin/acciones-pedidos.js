"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { procesarComprasProveedores } from "@/lib/procesar-proveedores";
import { procesarComprasCentralOne } from "@/lib/comprar-central-one";

async function errorPedido(id, tipo) {
  const [p] = await sql`
    select estado from pedidos where id = ${id}
  `;

  if (!p) return "no_existe";
  if (p.estado === "cancelado") return "cancelado";

  return tipo === "pago" ? "pago" : "entrega";
}

export async function confirmarPago(formData) {
  await requireAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    redirect("/admin/pedidos?error=pago");
  }

  const [r] = await sql`
    update pedidos
    set estado = 'pagado',
        pagado_en = coalesce(pagado_en, now())
    where id = ${id} and estado = 'pendiente'
    returning id, codigo
  `;

  if (!r) {
    redirect(`/admin/pedidos?error=${await errorPedido(id, "pago")}`);
  }

  try {
    await procesarComprasProveedores(r.id);
  } catch (error) {
    console.error("Procesamiento StreamZone tras pago manual:", error);
  }


  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath(`/pedido/${r.codigo}`);

  redirect("/admin/pedidos?aviso=pago_confirmado");
}

export async function marcarEntregado(formData) {
  await requireAdmin();
  await asegurarEsquema();

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    redirect("/admin/pedidos?error=entrega");
  }

  const [r] = await sql`
    with actualizado as (
      update pedidos
      set estado = 'entregado',
          entregado_en = now()
      where id = ${id} and estado = 'pagado'
      returning id, codigo
    ),
    fechas as (
      update pedido_items pi
      set vence_en = case
        when coalesce(pi.duracion_dias, 0) > 0
          then now() + make_interval(days => pi.duracion_dias)
        else null
      end
      from actualizado a
      where pi.pedido_id = a.id
      returning pi.id
    )
    select id, codigo from actualizado
  `;

  if (!r) {
    redirect(`/admin/pedidos?error=${await errorPedido(id, "entrega")}`);
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/admin/vencimientos");
  revalidatePath(`/pedido/${r.codigo}`);

  redirect("/admin/pedidos?aviso=pedido_entregado");
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
    returning id
  `;

  if (!r[0]) {
    redirect("/admin/pedidos?error=cancelacion");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  redirect("/admin/pedidos?aviso=pedido_cancelado");
}

export async function procesarPedidoStreamZone(formData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/pedidos?error=streamzone");
  }

  const [pedido] = await sql`
    select id, codigo, estado from pedidos where id = ${id}
  `;

  if (!pedido || !["pagado", "entregado"].includes(pedido.estado)) {
    redirect("/admin/pedidos?error=streamzone");
  }

  try {
    await procesarComprasProveedores(id);
  } catch (error) {
    console.error("Reintento StreamZone:", error);
    redirect("/admin/pedidos?error=streamzone");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/pedido/" + pedido.codigo);
  redirect("/admin/pedidos?aviso=streamzone_procesado");
}


export async function procesarPedidoCentralOne(formData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/pedidos?error=centralone");
  }

  const [pedido] = await sql`
    select id, codigo, estado from pedidos where id = ${id}
  `;

  if (!pedido || !["pagado", "entregado"].includes(pedido.estado)) {
    redirect("/admin/pedidos?error=centralone");
  }

  try {
    await procesarComprasCentralOne(id, { reintentar: true });
  } catch (error) {
    console.error("Reintento Central One:", error);
    redirect("/admin/pedidos?error=centralone");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/pedido/" + pedido.codigo);
  redirect("/admin/pedidos?aviso=central_one_procesado");
}

export async function guardarAjustes(formData) {
  await requireAdmin();

  const datos = {
    nombre_tienda: String(formData.get("nombre_tienda") || "").trim().slice(0, 60) || "Cefe Digital",
    whatsapp: String(formData.get("whatsapp") || "").replace(/\D/g, "").slice(0, 15),
    instrucciones_pago: String(formData.get("instrucciones_pago") || "").trim().slice(0, 1000),
    titular_pago: String(formData.get("titular_pago") || "").trim().slice(0, 80),
  };

  for (const [k, v] of Object.entries(datos)) {
    await sql`
      insert into ajustes (clave, valor)
      values (${k}, ${v})
      on conflict (clave) do update set valor = excluded.valor
    `;
  }

  revalidatePath("/");
  revalidatePath("/admin/ajustes");
  redirect("/admin/ajustes?aviso=ajustes_guardados");
}
