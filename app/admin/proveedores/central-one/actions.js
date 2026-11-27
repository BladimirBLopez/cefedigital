"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sincronizarCatalogoCentralOne } from "@/lib/sincronizar-central-one";

export async function sincronizarCentralOneAction() {
  await requireAdmin();

  let resultado;

  try {
    resultado = await sincronizarCatalogoCentralOne();
  } catch (error) {
    console.error("Sincronización Central One:", error);
    redirect("/admin/proveedores/central-one?error=sync");
  }

  revalidatePath("/admin/proveedores/central-one");
  revalidatePath("/admin/productos");

  redirect(
    `/admin/proveedores/central-one?ok=1&total=${resultado.total}&nuevos=${resultado.nuevos}&actualizados=${resultado.actualizados}`
  );
}
