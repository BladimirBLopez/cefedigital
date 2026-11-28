"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { subirFoto } from "@/lib/cloudinary";

export async function guardarLogoJuego(formData) {
  await requireAdmin();
  await asegurarEsquema();

  const id = String(formData.get("familia_id") || "").trim().slice(0, 120);
  const q = String(formData.get("q") || "").trim().slice(0, 40);
  const base = "/admin/juegos" + (q ? "?q=" + encodeURIComponent(q) : "");
  const sep = q ? "&" : "?";

  if (!id) redirect(base);

  const [ok] = await sql`
    select 1 as ok from productos
    where proveedor = 'central_one' and central_one_family_id = ${id}
    limit 1
  `;
  if (!ok) redirect(base + sep + "error=juego");

  if (formData.get("quitar_foto") === "1") {
    await sql`delete from juegos_imagen where familia_id = ${id}`;
    revalidatePath("/");
    revalidatePath("/admin/juegos");
    redirect(base);
  }

  let url = null;
  try {
    url = await subirFoto(formData.get("foto"));
  } catch {
    redirect(base + sep + "error=foto");
  }

  if (url) {
    await sql`
      insert into juegos_imagen (familia_id, imagen_url)
      values (${id}, ${url})
      on conflict (familia_id)
      do update set imagen_url = excluded.imagen_url, actualizado_en = now()
    `;
  }

  revalidatePath("/");
  revalidatePath("/admin/juegos");
  redirect(base);
}
