"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { anotar } from "@/lib/registro";

export async function borrarProducto(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/productos?error=borrar");

  let con = 0;
  try {
    const c = await sql`select count(*)::int as n from pedido_items where producto_id = ${id}`;
    con = c[0]?.n || 0;
  } catch {
    con = 0;
  }
  if (con > 0) redirect("/admin/productos?error=pedidos");

  let borrado = [];
  try {
    borrado = await sql`
      with s as (delete from stock where producto_id = ${id}),
           pl as (delete from planes where producto_id = ${id})
      delete from productos where id = ${id} returning nombre`;
  } catch (e) {
    console.error("borrar producto fallo", e);
    redirect("/admin/productos?error=borrar");
  }
  if (borrado[0]) await anotar("borrar", "producto", id, `Borró "${borrado[0].nombre}"`);
  revalidatePath("/");
  revalidatePath("/admin/productos");
  redirect("/admin/productos?ok=borrado");
}
