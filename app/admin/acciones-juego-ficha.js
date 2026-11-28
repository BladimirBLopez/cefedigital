"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { subirFoto } from "@/lib/cloudinary";
import { anotar } from "@/lib/registro";

export async function guardarFichaJuego(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const id = String(formData.get("familia_id") || "").trim().slice(0, 120);
  if (!id) redirect("/admin/productos?prov=central_one");
  const base = "/admin/juegos/" + encodeURIComponent(id);

  const [ok] = await sql`
    select id from productos
    where proveedor = 'central_one' and central_one_family_id = ${id}
    limit 1`;
  if (!ok) redirect(base);

  if (formData.get("quitar_foto") === "1") {
    await sql`delete from juegos_imagen where familia_id = ${id}`;
  } else {
    let url = null;
    try {
      url = await subirFoto(formData.get("foto"));
    } catch {
      redirect(base + "?error=foto");
    }
    if (url) {
      await sql`
        insert into juegos_imagen (familia_id, imagen_url)
        values (${id}, ${url})
        on conflict (familia_id)
        do update set imagen_url = excluded.imagen_url, actualizado_en = now()`;
    }
  }

  if (formData.has("categoria")) {
    const cat = String(formData.get("categoria") || "").trim().slice(0, 40);
    if (cat) {
      const r = await sql`
        update productos set categoria = ${cat}
        where proveedor = 'central_one' and central_one_family_id = ${id}
          and categoria is distinct from ${cat}
        returning id`;
      if (r.length) {
        await anotar("editar", "producto", r[0].id, `Cambió la categoría a "${cat}" en ${r.length} paquete(s) de un juego`);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath(base);
  redirect(base + "?ok=1");
}

export async function alternarJuego(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const id = String(formData.get("familia_id") || "").trim().slice(0, 120);
  const publicar = formData.get("publicar") === "1";
  if (!id) return { ok: false };
  if (publicar && formData.get("confirmo") !== "on") return { ok: false };

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
  const [c] = await sql`
    select count(*) filter (where activo)::int as n from productos
    where proveedor = 'central_one' and central_one_family_id = ${id}`;

  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/juegos/" + encodeURIComponent(id));
  return { ok: true, activo: (c?.n || 0) > 0, cambiados: r.length };
}
