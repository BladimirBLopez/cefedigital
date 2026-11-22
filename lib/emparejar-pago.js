import { sql } from "@/lib/db";

const partes = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

export function mismoNombre(a, b) {
  const x = partes(a);
  const y = partes(b);
  if (!x.length || !y.length) return false;
  const comunes = x.filter((p) => y.includes(p)).length;
  return comunes >= Math.min(2, x.length, y.length);
}

export async function emparejar({ monto, pagador, recibido }) {
  const candidatos = await sql`
    select id, codigo, avisado_en, pagador_nombre
    from pedidos
    where estado = 'pendiente'
      and total = ${monto}
      and creado_en <= ${recibido}::timestamptz
      and creado_en > ${recibido}::timestamptz - interval '2 hours'
    order by creado_en`;
  if (!candidatos.length) return { motivo: "sin_pedido" };
  const porNombre = pagador ? candidatos.filter((c) => mismoNombre(pagador, c.pagador_nombre)) : [];
  if (porNombre.length === 1) return { pedido: porNombre[0] };
  if (candidatos.length === 1) {
    const c = candidatos[0];
    return c.avisado_en ? { pedido: c } : { motivo: "esperando_aviso", esperando: true };
  }
  return { motivo: "ambiguo" };
}
