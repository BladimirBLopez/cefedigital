"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sincronizarCatalogoCentralOne } from "@/lib/sincronizar-central-one";
import { consultarCentralOne } from "@/lib/central-one";

export async function sincronizarCentralOneAction() {
  await requireAdmin();

  let resultado;

  try {
    resultado = await sincronizarCatalogoCentralOne();
  } catch (error) {
    console.error("Sincronización Central One:", error);
    const detalle = String(error?.message || "desconocido")
      .replace(/co_live_\w+/g, "co_live_***")
      .slice(0, 160);
    redirect("/admin/proveedores/central-one?error=sync&detalle=" + encodeURIComponent(detalle));
  }

  revalidatePath("/admin/proveedores/central-one");
  revalidatePath("/admin/productos");

  redirect(
    `/admin/proveedores/central-one?ok=1&total=${resultado.total}&nuevos=${resultado.nuevos}&actualizados=${resultado.actualizados}&omitidos=${resultado.omitidos || 0}&omit=${encodeURIComponent(String(resultado.omitidosDetalle || "").slice(0, 300))}`
  );
}

export async function comprobarPermisosCentralOneAction() {
  await requireAdmin();

  const pruebas = [
    ["saldo", "/balance"],
    ["catalogo", "/catalog?lang=es"],
    ["pedidos", "/orders/00000000-0000-0000-0000-000000000000"]
  ];

  const salida = [];

  for (const [nombre, ruta] of pruebas) {
    let estado = "error";

    try {
      await consultarCentralOne(ruta, { timeout: 30000 });
      estado = "ok";
    } catch (e) {
      const st = Number(e?.status) || 0;

      if (nombre === "pedidos" && [400, 404, 422].includes(st)) estado = "ok";
      else if (st === 401 || st === 403) estado = "denegado";
      else estado = "error";
    }

    salida.push(nombre + "-" + estado);
  }

  revalidatePath("/admin/proveedores/central-one");
  redirect("/admin/proveedores/central-one?permisos=" + salida.join(","));
}
