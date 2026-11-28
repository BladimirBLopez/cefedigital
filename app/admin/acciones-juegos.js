"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { subirFoto } from "@/lib/cloudinary";
import { anotar } from "@/lib/registro";

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
