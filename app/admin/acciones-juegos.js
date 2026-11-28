"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { anotar } from "@/lib/registro";

async function cambiarJuego(formData, publicar) {
  await requireAdmin();
  await asegurarEsquema();

  const id = String(formData.get("familia_id") || "").trim().slice(0, 120);
  let volver = String(formData.get("volver") || "/admin/productos");
  if (!volver.startsWith("/admin/productos")) volver = "/admin/productos";
  if (!id) redirect(volver);
  if (publicar && formData.get("confirmo") !== "on") redirect(volver);

  const r = publicar
    ? await sql`
        update productos set activo = true
        where proveedor = 'central_one' and central_one_family_id = ${id}
          and not activo and precio > 0 and proveedor_disponible = true
        returning id`
    : await sql`
        update productos set activo = false
        where proveedor = 'central_one' and central_one_family_id = ${id}
          and activo
        returning id`;

  if (r.length) {
    await anotar(
      publicar ? "activar" : "ocultar",
      "producto",
      r[0].id,
      (publicar ? "Puso a la venta " : "Ocultó ") + r.length + " paquete(s) de un juego completo"
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/productos");
  redirect(volver);
}

export async function publicarJuego(formData) {
  await cambiarJuego(formData, true);
}

export async function ocultarJuego(formData) {
  await cambiarJuego(formData, false);
}
