import { sql } from "@/lib/db";

export async function obtenerAjustes() {
  const filas = await sql`select clave, valor from ajustes`;
  const a = { nombre_tienda: "Cefe Digital", whatsapp: "", instrucciones_pago: "" };
  for (const f of filas) a[f.clave] = f.valor;
  return a;
}

export function limpiarWhatsapp(n) {
  return String(n || "").replace(/\D/g, "");
}
