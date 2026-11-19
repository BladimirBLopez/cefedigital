import { sql } from "@/lib/db";
import BorrarProducto from "@/components/BorrarProducto";

export default async function BorrarSiLibre({ id, nombre }) {
  let n = 1;
  try {
    const r = await sql`select count(*)::int as n from pedido_items where producto_id = ${id}`;
    n = r[0]?.n || 0;
  } catch {
    n = 1;
  }
  if (n > 0) {
    return <p className="text-xs text-neutral-500">Tiene pedidos: solo se puede ocultar.</p>;
  }
  return <BorrarProducto id={id} nombre={nombre} />;
}
