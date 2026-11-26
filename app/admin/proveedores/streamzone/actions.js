"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sincronizarCatalogoStreamZone } from "@/lib/sincronizar-streamzone";

export async function sincronizarStreamZone() {
  await requireAdmin();

  let resultado;

  try {
    resultado = await sincronizarCatalogoStreamZone();
  } catch (error) {
    console.error("Sincronización StreamZone:", error);
    redirect("/admin/proveedores/streamzone?error=sincronizacion");
  }

  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/proveedores/streamzone");

  redirect(
    `/admin/proveedores/streamzone?ok=1&nuevos=${resultado.nuevos}&actualizados=${resultado.actualizados}`
  );
}
