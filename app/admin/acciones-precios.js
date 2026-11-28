"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { anotar } from "@/lib/registro";

export async function cambiarPrecioPaquete(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const precio = Math.round(Number(String(formData.get("precio") || "").replace(",", ".")) * 100) / 100;
  if (!Number.isInteger(id) || !Number.isFinite(precio) || precio <= 0 || precio > 1000000) {
    return { ok: false };
  }
  const antes = await sql`select nombre, precio::float as precio from productos where id = ${id} and proveedor = 'central_one'`;
  if (!antes[0]) return { ok: false };
  await sql`
    update productos
    set precio = ${precio},
        precio_manual = abs(${precio} - coalesce(precio_sugerido, 0)) > 0.001
    where id = ${id} and proveedor = 'central_one'`;
  try {
    if (Number(antes[0].precio) !== precio) {
      await anotar("editar", "producto", id, `"${antes[0].nombre}": precio Bs ${antes[0].precio} → Bs ${precio}`);
    }
  } catch {}
  revalidatePath("/");
  revalidatePath("/admin/productos");
  return { ok: true, precio };
}
